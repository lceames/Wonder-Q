const net = require('net');
const uuidv1 = require('uuid/v1');

// Wonder Q queue actions 

function produceMessage(messageOptions, callback) {
    const {queueName, messageBody, wonderQHost = "127.0.0.1", wonderQPort = 3000} = messageOptions;
    const requestData = { 'messageBody': messageBody };
    const request = new WonderQRequest(queueName, 'produceMessage', wonderQHost, wonderQPort, requestData);
    setClientInterval(request, callback)
}

function consumeMessages(messageOptions, callback, simulatedLatency = 0) {
    const {queueName, maxNumberOfMessages = 1, wonderQHost = "127.0.0.1", wonderQPort = 3000} = messageOptions;
    const requestData = { 'maxNumberOfMessages': maxNumberOfMessages };
    const request = new WonderQRequest(queueName, 'consumeMessages', wonderQHost, wonderQPort, requestData, simulatedLatency);
    setClientInterval(request, callback); 
}

function getWonderQStatus(messageOptions, callback) {
    const {queueName = null, messageBody, wonderQHost = "127.0.0.1", wonderQPort = 3000} = messageOptions;
    const request = new WonderQRequest(queueName, 'getWonderQStatus', wonderQHost, wonderQPort);
    setClientInterval(request, callback); 
}

// invoke callback when request has completed successfully or errored out

function setClientInterval(request, callback) {
    const interval = setInterval(() =>  { 
        if (!request.alive) {
            if (request.success) {
                callback(request.responseData);
            }
            else {
                callback(null, request.errorMessage)
            }
            clearInterval(interval) 
        }
    }, 250);
}

class WonderQRequest {
    constructor(queueName, operation, host, port, requestData, simulatedLatency = null) {     
        this.socket = net.connect(port, host);
        this.configureSocket();
        this.alive = true;
        this.queueName = queueName
        this.operation = operation;
        this.requestData = requestData;
        this.connectionID = uuidv1();
        this.responseData = {};
        this.simulatedLatency = simulatedLatency

        const requestMessage = {
            'operation': operation,
            'queueName': queueName,
            'connectionID': this.connectionID,
            'requestData': requestData
        }

        this.socket.write(JSON.stringify(requestMessage))
    }

    // configure socket events

    configureSocket() {
        this.socket.on('data', (data) => this.processResponse(data))

        this.socket.on('error', (error) => {
            this.success = false;
            this.error = error
            this.alive = false;
        });

        this.socket.on('timeout', (msg) => {
            this.success = false;
            this.error = msg
            this.alive = false;
        });   
    }

    async processMessage(message) {
        const messageID = message['messageID'];
        const messageBody = message['messageBody'];

        if (!this.responseData['messagesRead']) {  this.responseData['messagesRead'] = {} }
        this.responseData['messagesRead'][messageID] = messageBody;
        
        // simulate latency if configured
        await new Promise(resolve => setTimeout(resolve, this.simulatedLatency));

        const confirmMessageReceipt = {
            'operation': 'confirmMessageConsumption',
            'queueName': this.queueName,
            'requestData': {
                'requestID': this.requestID,
                'messageID': messageID
            }
        }
        
        this.socket.write(JSON.stringify(confirmMessageReceipt));
    }

    processResponse(data) {
        const msg = JSON.parse(data);
        const success = msg['requestSuccess'];
        const operation = msg['operation'];

        if (success) {
            switch(operation) {
                case 'produceMessageReceipt':
                    this.produceMessageReceipt(msg);
                    break;
                case 'consumeMessagesReceipt':
                    this.consumeMessagesReceipt(msg);
                    break;
                case 'confirmMessageConsumptionReceipt':
                    this.confirmMessageConsumptionReceipt();
                    break;
                case 'messageConsumptionTimeout':
                    this.messageConsumptionTimeout(msg);
                    break;
                case 'getWonderQStatusReceipt':
                    this.getWonderQStatusReceipt(msg);
                    break;
            }
        }
        else {
            this.handleFailedRequest(msg);
        }
    }  

    // response handlers

    produceMessageReceipt(msg) {
        this.responseData = msg;
        this.socket.end();
        this.success = true;
        this.alive = false;
    }

    consumeMessagesReceipt(msg) {
        const messagesToConsume = msg['responseData']['messagesToConsume'];
        this.consumptionQueue = messagesToConsume;
        this.requestID = msg['responseData']['requestID'];
        this.processMessage(messagesToConsume.shift());
    }

    confirmMessageConsumptionReceipt() {
        if (this.consumptionQueue.length == 0) {
            this.socket.end();
            this.success = true;
            this.alive = false;
        }
        else {
            this.processMessage(this.consumptionQueue.shift());
        }
    }

    messageConsumptionTimeout(msg) {
        const messageID = msg['responseData']['messageID'];
        delete this.responseData['messagesRead'][messageID];
        this.responseData['warning'] = "Not all messages could be read within the queue's maxConsumerProcessTime";
        this.socket.end();
        this.success = true;
        this.alive = false;
    }

    getWonderQStatusReceipt(msg) {
        this.responseData = msg['status'];
        this.socket.end();
        this.success = true;
        this.alive = false;
    }


    handleFailedRequest(msg) {
        this.success = false;
        this.errorMessage = msg['errorMessage'];
        this.socket.end();
        this.alive = false;
    }
}

module.exports = { produceMessage, consumeMessages, getWonderQStatus }

