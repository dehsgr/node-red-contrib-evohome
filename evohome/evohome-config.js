module.exports = function(RED) {
    function EvohomeNode(config) {
        RED.nodes.createNode(this, config);
        this.userid = config.userid;
        this.passwd = config.passwd;
    }

    RED.nodes.registerType("evohome-config", EvohomeNode, {
        credentials: {
            userid: {type: "text"},
            passwd: {type: "password"}
        }
    });
};
