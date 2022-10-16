const evohome = require('./evohome.js');
module.exports = function(RED) {
	'use strict';

	function Node(n) {
		RED.nodes.createNode(this,n);
		var globalContext = this.context().global;
		var node = this;
		this.on('input', function (msg) {
			var session = globalContext.get('evohome-session');
			if (!session || !session.isValid || !session.isValid()) {
				evohome.login(confignode.userid, confignode.passwd).then(function(session) {
					globalContext.set('evohome-session', session);
					renew = setInterval(function() {
						renewSession();
					}, session.refreshTokenInterval * 1000);
				}).fail(function(err) {
					node.warn(err);
				});
			} else {
				if (msg.payload.quickAction !== undefined) {
					session.getLocations().then(function(locations) {
						if (!locations || !locations.length) {
							node.warn('No locations returned. Unsetting session.');
							globalContext.set('evohome-session', undefined);
							return;
						}
						session.setSystemMode(locations[0].systemId, msg.payload.quickAction).then(function (resp) {
							node.debug(JSON.stringify(resp));
							node.log('Set system mode to: ' + msg.payload.quickAction);
						}).fail(function(err) {
							node.warn(err);
						});
					}).fail(function(err) {
						node.warn(err);
					});
				}
			}
		});
	}

	RED.nodes.registerType('evohome-quickaction', Node);
};
