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
                    session.getSchedule(msg.payload.id).then(function (schedule) {
                        var date = new Date();
                        var utc = date.getTime() + (date.getTimezoneOffset() * 60000);
                        var correctDate = new Date(utc + (60000));
                        var weekdayNumber = correctDate.getDay();
                        var weekday = new Array('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday');
                        var currenttime = correctDate.toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour12: false});
                        var proceed = true;
                        var nextScheduleTime = '';

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

                        node.log('Setting target temperature for ' + msg.payload.id + ' to ' + (msg.payload.temperature || 'current') + '° until ' + (msg.payload.temperature ? msg.payload.endtime || nextScheduleTime : null));
                        session.setHeatSetpoint(msg.payload.id, msg.payload.temperature || 0, (msg.payload.permanent ? null : (msg.payload.temperature ? msg.payload.endtime || nextScheduleTime : null))).then(function (taskId) {
                            node.log("Successfully changed temperature!");
                        });
                    }).fail(function(err) {
                        node.warn('Evohome failed: ' + err);
                    });
                }
            } else {
                node.warn('Session not created yet!');
            }
        });
    }

    RED.nodes.registerType('evohome-control', Node);
};
