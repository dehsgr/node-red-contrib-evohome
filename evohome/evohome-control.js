const evohome = require('./evohome.js');
module.exports = function(RED) {
	'use strict';

	function Node(n) {
		RED.nodes.createNode(this,n);
		var confignode = RED.nodes.getNode(n.confignode);
		var context = this.context().flow;
		var node = this;
		var renew;

		this.on('input', function (msg) {
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
				if (msg.payload.id !== undefined) {
					session.getSchedule(msg.payload.id).then(function (schedule) {
						var date = new Date();
						var utc = date.getTime() + (date.getTimezoneOffset() * 60000);
						var correctDate = new Date(utc + (60000));
						var weekdayNumber = correctDate.getDay();
						var weekday = new Array('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
						var currenttime = correctDate.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour12: false});
						var proceed = true;
						var nextScheduleTime = '';

						if (!msg.payload.permanent ){
							if (!schedule || !schedule.length) {
								node.warn('No schedules returned. Unsetting session.');
								context.set('evohome-session', undefined);
								return;
							}

							for(var scheduleId in schedule) {
								if(schedule[scheduleId].dayOfWeek == weekday[weekdayNumber]) {
									node.log('Schedule points for today (' + schedule[scheduleId].dayOfWeek + ')');
									var switchpoints = schedule[scheduleId].switchpoints;
									for(var switchpointId in switchpoints) {
										var logline = '- ' + switchpoints[switchpointId].timeOfDay;
										if(proceed == true) {
											if(currenttime >= switchpoints[switchpointId].timeOfDay) {
												proceed = true;
											} else if (currenttime < switchpoints[switchpointId].timeOfDay) {
												proceed = false;
												nextScheduleTime = switchpoints[switchpointId].timeOfDay;
												logline = logline + ' -> next change';
											}
										}

										node.log(logline);
									}

									if(proceed == true) {
										nextScheduleTime = '00:00:00';
									}
								}
							}
						}

						node.log('Setting target temperature for ' + msg.payload.id + ' to ' + (msg.payload.temperature || 'current') + '° until ' + (msg.payload.temperature ? msg.payload.endtime || nextScheduleTime : null));
						session.setHeatSetpoint(msg.payload.id, msg.payload.temperature || 0, (msg.payload.permanent ? null : (msg.payload.temperature ? msg.payload.endtime || nextScheduleTime : null))).then(function (taskId) {
							node.log("Successfully changed temperature!");
						});
					}).fail(function(err) {
						node.warn(err);
					});
				}
			}
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

	RED.nodes.registerType('evohome-control', Node);
};
