const uuidv1 = require('uuid/v1');
const net = require('net');

class WonderQ {
    constructor(listenPort = 3000, listenHost = 'localhost') {
      this.queues = {};
      this.listen(listenPort, listenHost)
    }

    // WonderQ hub actions
  
    createQueue(queueName, maxConsumerProcessTime = 1000) {
        const queue = new Queue(queueName, maxConsumerProcessTime);
        this.queues[queueName] = queue;
    }

    provideWonderQStatus(connection) {
        const response = {
            'requestSuccess': true,
            'requestComplete': false,
            'operation': 'getWonderQStatusReceipt',
            'status': JSON.stringify({ 'queues': this.queues })
        }
        
        connection.write(JSON.stringify(response));
    }


    // Wonder Q queue actions 

    produceMessage(connection, queueName, newMessageID, newMessageBody) {
        const queue = this.queues[queueName];
        queue.messages.push({ 'messageID': newMessageID, 'messageBody': newMessageBody }); 
        
        const response = {
            'requestSuccess': true,
            'requestComplete': true,
            'messageID': newMessageID,
            'operation': 'produceMessageReceipt'
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
            'operation': 'consumeMessagesReceipt',
            'responseData': {
                'messagesToConsume': toConsume,
                'requestID': requestID
            }
        }
        
        
        connection.write(JSON.stringify(response));
        setTimeout(this.restoreUnconsumedMessagesToQueue.bind(this), queue.maxConsumerProcessTime, queueName, requestID);
    }

    deleteMessage(connectionID, messageID) {
        // Todo
    }

    // configure and run server

    listen(listenPort, listenHost) {
        const server = net.createServer( (connection) => this.configureConnection(connection) );

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

    // read request data

    receiveData(connection, data) {
        const msg = JSON.parse(data);
        const queueName = msg['queueName'];    
        const operation = msg['operation'];
               
        if (this.queues[queueName]) {
            const queue = this.queues[queueName];
            let messageID;

            switch(operation) {
                case 'produceMessage':
                    messageID = uuidv1();
                    const messageBody = msg['requestData']['messageBody'];
                    this.produceMessage(connection, queueName, messageID, messageBody);
                    break;
                case 'consumeMessages':
                    if (queue.messages.length == 0) {
                        WonderQ.generateErrorMessage(connection, `Queue contains no messages`);
                        break;
                    }

                    const maxNumberOfMessages = msg['requestData']['maxNumberOfMessages'];
                    this.consumeMessages(connection, queueName, maxNumberOfMessages);
                    break;
                case 'deleteMessage':
                    messageID = msg['messageID'];
                    this.deleteMessage(connection, messageID);
                    break;
                case 'confirmMessageConsumption':
                    const requestID = msg['requestData']['requestID'];
                    messageID = msg['requestData']['messageID'];
                    this.confirmMessageConsumption(connection, queueName, requestID, messageID);
                    break;
            }
        }
        else if (operation == 'getWonderQStatus') {
            this.provideWonderQStatus(connection);
        }
        else {
            const errorMsg = WonderQ.generateErrorMessage(connection, `No queue named ${queueName} has been created`);
        }
    }

    // internal request handling

    confirmMessageConsumption(connection, queueName, requestID, messageID) {
        const awaitingConsumption = this.queues[queueName]['messagesAwaitingConsumption'];
        let response;

        if (Object.keys(awaitingConsumption).length == 0) {
            // consumption timeout detected 
            response = {
                'operation': 'messageConsumptionTimeout',
                'requestSuccess': true,
                'responseData': {
                    'messageID': messageID
                }
            }
        }
        else {
            delete awaitingConsumption[requestID][messageID];

            response = {
                'operation': 'confirmMessageConsumptionReceipt',
                'requestSuccess': true
            }
        }

        connection.write(JSON.stringify(response));
    }

    // message consumption timeout

    restoreUnconsumedMessagesToQueue(queueName, requestID) {
        const queue = this.queues[queueName];
        const unconsumedMessages = queue.messagesAwaitingConsumption[requestID];
        queue.messagesAwaitingConsumption = {};
        
        try {
            const messageIDs = Object.keys(unconsumedMessages);
            messageIDs.forEach((messageID) => {
                queue.messages.push(unconsumedMessages[messageID]);
            });
        }
        catch {}
    }
    
    // generic error handler

    static generateErrorMessage(connection, errorMessage) {
        const response = {
            'requestSucess': false,
            'errorMessage': errorMessage
        }

        connection.write(JSON.stringify(response));
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

module.exports = { WonderQ }


