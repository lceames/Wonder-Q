const uuidv1 = require('uuid/v1');
const net = require('net');

class WonderQ {
    constructor(listenPort = 3000, listenHost = 'localhost') {
      this.queues = {};
      this.connections = {};
      this.messagesBeingConsumer = {};
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
        const msg = JSON.parse(data);
        const connectionID = msg['connectionID'];
        const queueName = msg['queueName'];    

        if (!this.connections[connectionID]) { this.connections[connectionID] = connection };
               
        if (this.queues[queueName]) {
            const operation = msg['operation'];
            console.log(operation);
            const messageID;

            switch(operation) {
                case 'produceMessage':
                    messageID = uuidv1();
                    const messageBody = msg['requestData']['messageBody'];
                    this.produceMessage(connection, queueName, messageID, messageBody);
                case 'consumeMessage':
                    const maxNumberOfMessages = msg['requestData']['maxNumberOfMessages'];
                    this.consumeMessages(connection, maxNumberOfMessages);
                case 'deleteMessage':
                    messageID = msg['messageID'];
                    this.deleteMessage(connection, messageID);
                case 'confirmMessageReceipt':

            }
        }
        else {
            const errorMsg = WonderQ.generateErrorMessage('Queue Not Found', `No queue named ${queueName} has been created`);
            connection.write(errorMsg);

            connection.end()
        }
    }

    produceMessage(connection, queueName, newMessageID, newMessageBody) {
        const queue = this.queues[queueName];
        console.log(queue);
        const newMessage = {
            'messageID': newMessageID,
            'messageBody': newMessageBody
        }
        queue.messages.push(newMessage); 
        
        const response = {
            'requestSuccess': true,
            'requestComplete': true,
            'messageID': newMessageID,
            'operation': 'produceMessage'
        }
        
        connection.write(JSON.stringify(response));
    }

    consumeMessages(connectionID, maxNumberOfMessages) {
        const queue = this.queues[queueName];
        const toConsume = queue.splice(queue.length - maxNumberOfMessages, -1);

        queue.messages.push(newMessage); 
        
        const response = {
            'requestSuccess': true,
            'requestComplete': false,
            'operation': 'consumeMessages',
        }
        
        connection.write(JSON.stringify(response));
    }

    deleteMessage(connectionID, messageID) {

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

