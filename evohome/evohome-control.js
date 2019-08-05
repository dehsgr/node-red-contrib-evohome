const evohome = require('./evohome.js');
module.exports = function(RED) {
    'use strict';

    function Node(n) {
        RED.nodes.createNode(this,n);
        var confignode = RED.nodes.getNode(n.confignode);
        var globalContext = this.context().global;
        var node = this;
        this.on('input', function (msg) {
            var session = globalContext.get('evohome-session');
            if (session) {
                if (msg.payload.id !== undefined) {
                    session.setHeatSetpoint(msg.payload.id, msg.payload.temperature, msg.payload.endtime || '00:00:00');
                }
            } else {
                node.warn('Session not created yet!');
            }
        });
    }

    RED.nodes.registerType('evohome-control', Node);
};
