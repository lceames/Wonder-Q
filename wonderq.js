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
        const queueName = msg['queueName'];    
        const operation = msg['operation'];
               
        if (this.queues[queueName]) {
            
            let messageID;

            switch(operation) {
                case 'produceMessage':
                    messageID = uuidv1();
                    const messageBody = msg['requestData']['messageBody'];
                    this.produceMessage(connection, queueName, messageID, messageBody);
                    break;
                case 'consumeMessages':
                    const maxNumberOfMessages = msg['requestData']['maxNumberOfMessages'];
                    this.consumeMessages(connection, queueName, maxNumberOfMessages);
                    break;
                case 'deleteMessage':
                    messageID = msg['messageID'];
                    this.deleteMessage(connection, messageID);
                    break;
                case 'confirmMessageReceipt':
                    const requestID = msg['requestData']['requestID'];
                    messageID = msg['requestData']['messageID'];
                    this.confirmMessageReceipt(queueName, requestID, messageID);
                    break;
            }
            console.log(this.queues[queueName]);
        }
        else if (operation == 'getWonderQStatus') {
            this.provideWonderQStatus(connection);
        }
        else {
            const errorMsg = WonderQ.generateErrorMessage('Queue Not Found', `No queue named ${queueName} has been created`);
            connection.write(errorMsg);

            connection.end()
        }
    }

    confirmMessageReceipt(queueName, requestID, messageID) {
        const queue = this.queues[queueName];
        delete queue[requestID][messageID];
    }

    produceMessage(connection, queueName, newMessageID, newMessageBody) {
        const queue = this.queues[queueName];
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

    consumeMessages(connection, queueName, maxNumberOfMessages) {
        const queue = this.queues[queueName];
        const queueLength = queue.messages.length;
        const toConsume = queue.messages.splice(queueLength - maxNumberOfMessages, queueLength);
        const requestID = uuidv1();
        queue.messagesAwaitingConsumption[requestID] = {}

        toConsume.forEach(message => {
            const messageID = message['messageID'];
            queue.messagesAwaitingConsumption[requestID][messageID] = message;
        });
        
        const response = {
            'requestSuccess': true,
            'requestComplete': false,
            'operation': 'consumeMessages',
            'messagesToConsume': toConsume
        }
        
        connection.write(JSON.stringify(response));
        setTimeout(this.restoreUnconsumedMessagesToQueue.bind(this), queue.maxConsumerProcessTime, queueName, requestID);
    }

    provideWonderQStatus(connection) {
        const response = {
            'requestSuccess': true,
            'requestComplete': false,
            'operation': 'wonderQStatus',
            'status': JSON.stringify({ 'queues': this.queues })
        }
        
        connection.write(JSON.stringify(response));
    }

    restoreUnconsumedMessagesToQueue(queueName, requestID) {
        const queue = this.queues[queueName];
        const unconsumedMessages = queue.messagesAwaitingConsumption[requestID];

        for (var message in unconsumedMessages) {
            queue.messages.push(message);
        }
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
        this.messagesAwaitingConsumption = {};
    }
}

new WonderQ().createQueue('test');

