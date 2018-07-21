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
            this.handleConnection(connection)
        });

        const listenParams = {
            host: listenHost,
            port: listenPort
        }

        server.listen(listenParams, () => {
            console.log('WonderQ server listening for client connections');
        });
    }

    handleConnection(connection) {
        connection.on('data', (data) => {
            const msg = JSON.parse(data);
            console.log(msg)
            const queueName = msg["queueName"];            
            
            if (this.queues[queueName]) {
                const operation = msg['operation'];
                switch(operation) {
                    case 'produceMessage':
                        const messageBody = msg['messageBody'];
                        this.produceMessage(connection, messageBody);
                    case 'consumeMessage':
                        const maxNumberOfMessages = msg['maxNumberOfMessages'];
                        this.consumeMessages(connection, maxNumberOfMessages);
                    case 'deleteMessage':
                        const messageID = msg['messageID'];
                        this.deleteMessage(connection, messageID);
                    default:
                        this.confirmTestSuccess(connection);
                }
            }
            else {
                const errorMsg = WonderQ.generateErrorMessage('Queue Not Found', `No queue named ${queueName} has been created`);
                connection.write(errorMsg);
            }
        });
    }

    produceMessage(connection, messageBody) {

    }

    consumeMessages(connection, maxNumberOfMessages) {

    }

    deleteMessage(connection, messageID) {

    }

    confirmTestSuccess(connection) {
        const testSuccessMessage = {
            'status': 200
        };

        connection.write(JSON.stringify(testSuccessMessage));

        connection.end();
    }

    static generateErrorMessage(errorName, errorMessage) {
        const errorMessage = {
            'status': 400,
            'error': errorName,
            'msgBody': errorMessage
        }

        return JSON.stringify(errorMessage);
    }
  
}

class Queue {
    constructor(queueName, maxConsumerProcessTime) {
        this.queueName = queueName;
        this.maxConsumerProcessTime = maxConsumerProcessTime;
    }
}

new WonderQ().createQueue('test');

