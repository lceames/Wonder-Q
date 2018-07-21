const net = require('net');

class WonderQClient {
    constructor(queueName, wonderQHost = "127.0.0.1", wonderQPort = 3000) {
        this.wonderQHost = wonderQHost;
        this.wonderQPort = wonderQPort;
        this.queueName = queueName;
    };

    testConnection() {
        const socketOptions = {
            port: this.wonderQPort,
            host: this.wonderQHost,
        };

        const testMessage = {
            'queueName': this.queueName 
        }

        this.openWonderQConnection().write(JSON.stringify(testMessage));
    };


    openWonderQConnection() {
        const socketOptions = {
            port: this.wonderQPort,
            host: this.wonderQHost,
        };

        const conn = net.createConnection(socketOptions);
        return conn;
    }
}

new WonderQClient('tes').testConnection();