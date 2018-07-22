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
            this.configureConnection(connection)
        });

        const listenParams = {
            host: listenHost,
            port: listenPort
        }

        server.listen(listenParams, () => {
            console.log('WonderQ server listening for client connections');
        });
    }

    configureConnection(connection) {
        connection.on('data', (data) => this.receiveData(connection, data));
    }

    receiveData(connection, data) {
        console.log('message received');
        const msg = JSON.parse(data);
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

            connection.end()
        }
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

    static generateErrorMessage(errorName, errorBody) {
        const errorMessage = {
            'status': 400,
            'error': errorName,
            'msgBody': errorBody
        }

        return JSON.stringify(errorMessage);
    }
  
}

class Queue {
    constructor(queueName, maxConsumerProcessTime) {
        this.queueName = queueName;
        this.maxConsumerProcessTime = maxConsumerProcessTime;
        this.messages = [];
    }
}

new WonderQ().createQueue('test');

