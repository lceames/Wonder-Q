const uuidv1 = require('uuid/v1');
const net = require('net');

class WonderQ {
    constructor(listenPort = 3000, listenHost = 'localhost') {
      this.queues = {};
      this.listen(listenPort, listenHost)
    }
  
    createQueue(queueName, maxConsumerProcessTime = 1000) {
        const queue = new Queue(queueName, maxConsumerProcessTime);
        this.queues[queueName] = queue;
    }
  
    listen(listenPort, listenHost) {
        const server = net.createServer( (connection) => {
            handleConnection(connection)
        });

        const listenParams = {
            host: listenHost,
            port: listenPort
        }

        server.listen(listenParams, () => {
            console.log("WonderQ server listening for client connections")
        });
    }

    handleConnection(connection) {
        console.log('client connected')
    }
  
}

class Queue {
    constructor(queueName, maxConsumerProcessTime) {
        this.queueName = queueName;
        this.maxConsumerProcessTime = maxConsumerProcessTime;
    }
}

