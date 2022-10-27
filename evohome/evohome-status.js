// Evohome Status node
const evohome = require('./evohome.js');
module.exports = function(RED) {
	'use strict';

	function Node(n) {
		RED.nodes.createNode(this,n);
		var confignode = RED.nodes.getNode(n.confignode);
		var context = this.context().flow;
		var node = this;
		var renew;
		this.interval = parseInt(n.interval);

		function publishEvohomeStatus() {
			var session = context.get('evohome-session');
			if (!session || !session.isValid || !session.isValid()) {
				evohome.login(confignode.userid, confignode.passwd).then(function(session) {
					context.set('evohome-session', session);
					renew = setInterval(function() {
						renewSession();
					}, session.refreshTokenInterval * 1000);
				}).fail(function(err) {
					node.warn(err);
				});
			} else {
				session.getLocations().then(function(locations) {
					if (!locations || !locations.length) {
						node.warn('No schedules returned. Unsetting session.');
						context.set('evohome-session', undefined);
						return;
					}

					session.getThermostats(locations[0].locationID).then(function(thermostats){
						session.getSystemModeStatus(locations[0].locationID).then(function(systemModeStatus){
							// iterate through the devices
							for (var deviceId in locations[0].devices) {
								for(var thermoId in thermostats) {
									if(locations[0].devices[deviceId].zoneID == thermostats[thermoId].zoneId) {
										if(locations[0].devices[deviceId].name  == "") {
											// Device name is empty
											// Probably Hot Water
											// Do not store
											console.log("Found blank device name, probably stored hot water. Ignoring device for now.");
										} else {
											var msgout = {
												payload : {
													id: thermostats[thermoId].zoneId,
													name : locations[0].devices[deviceId].name.toLowerCase(),
													currentTemperature : thermostats[thermoId].temperatureStatus.temperature,
													targetTemperature : thermostats[thermoId].setpointStatus.targetHeatTemperature,
													systemModeStatus: systemModeStatus
												}
											}
											node.send(msgout);
										}
									}
								}
							}
						}).fail(function(err){
							node.warn(err);
						});
					}).fail(function(err){
						node.warn(err);
					});
				}).fail(function(err) {
					node.warn(err);
				});
			}
		}

		if (this.interval > 0) {
			var tick = setInterval(function () {
				publishEvohomeStatus();
			}, this.interval * 1000);		// trigger every defined secs
		}

		node.on("close", function() {
			if (tick) {
				clearInterval(tick);
			}

			if (renew) {
				clearInterval(renew);
			}
		});

		node.on('input', function (msg) {
			publishEvohomeStatus();
		});

		function renewSession() {
			var session = context.get('evohome-session');
			
			// Clear the interval now because we will either create a new one if we 
			// refresh the token, of it that fails, there is no point trying to renew
			// the session again
			clearInterval(renew);

			if( session != undefined ){
				session._renew().then(function(json) {
					// renew session token
					session.sessionId = 'bearer ' + json.access_token;
					session.refreshToken = json.refresh_token;
					context.set('evohome-session', session);
					renew = setInterval(function() {
							renewSession();
						}, session.refreshTokenInterval * 1000);
					console.log('Renewed Honeywell API authentication token!');
				}).fail(function(err) {
					context.set('evohome-session', undefined);
					node.warn('Renewing Honeywell API authentication token failed:', err);
				});
			}
		}
	}

	RED.nodes.registerType('evohome-status', Node);
};
