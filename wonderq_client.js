const net = require('net');
const uuidv1 = require('uuid/v1');


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

function produceMessage(messageOptions, callback) {
    const {queueName, messageBody, wonderQHost = "127.0.0.1", wonderQPort = 3000} = messageOptions;
    const requestData = { 'messageBody': messageBody };
    const request = new WonderQRequest(queueName, 'produceMessage', wonderQHost, wonderQPort, requestData);
    setClientInterval(request, callback)
}

function consumeMessages(messageOptions, callback) {
    const {queueName, maxNumberOfMessages, wonderQHost = "127.0.0.1", wonderQPort = 3000} = messageOptions;
    const requestData = { 'maxNumberOfMessages': maxNumberOfMessages };
    const request = new WonderQRequest(queueName, 'consumeMessages', wonderQHost, wonderQPort, requestData);
    setClientInterval(request, callback); 
}

function getWonderQStatus(messageOptions, callback) {
    const {queueName = null, messageBody, wonderQHost = "127.0.0.1", wonderQPort = 3000} = messageOptions;
    const request = new WonderQRequest(queueName, 'getWonderQStatus', wonderQHost, wonderQPort);
    setClientInterval(request, callback); 
}

function deleteMessage(messageID, queueName, wonderQHost = "127.0.0.1", wonderQPort = 3000) {
    const connectionSocket = net.createConnection(wonderQPort, wonderQHost);
}

class WonderQRequest {
    constructor(queueName, operation, host, port, requestData) {     
        this.socket = net.connect(port, host);
        this.configureSocket();
        this.alive = true;
        this.queueName = queueName
        this.operation = operation;
        this.requestData = requestData;
        this.connectionID = uuidv1();
        this.responseData = {};

        const requestMessage = {
            'operation': operation,
            'queueName': queueName,
            'connectionID': this.connectionID,
            'requestData': requestData
        }

        this.socket.write(JSON.stringify(requestMessage))
    }

    configureSocket() {
        this.socket.on('data', (data) => this.receiveResponse(data))
        // this.socket.on('end', () => this.alive = false );
        this.socket.on('error', (error) => {
            this.success = false;
            this.error = error
            this.alive = false;
        });

        this.socket.on('timeout', (error) => {
            this.success = false;
            this.error = error
            this.alive = false;
        });
        
    }

    async processMessage(message) {
        const messageID = message['messageID'];
        const messageBody = message['messageBody'];

        if (!this.responseData['messagesRead']) {  this.responseData['messagesRead'] = {} }
        if (messageID == undefined) {
            debugger;
        }
        this.responseData['messagesRead'][messageID] = messageBody;
        
        // simulate latency
        await new Promise(resolve => setTimeout(resolve, 400));

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

    consumptionTimeout(messageID) {
        delete this.responseData['messagesRead'][messageID];
        this.responseData['warning'] = "Not all messages could be read within the queue's maxConsumerProcessTime";

        this.socket.end();
        this.success = true;
        this.alive = false;
    }

    receiveResponse(data) {
        const msg = JSON.parse(data);
        const success = msg['requestSuccess'];
        const operation = msg['operation'];

        if (success) {
            switch(operation) {
                case 'produceMessageReceipt':
                    this.responseData = msg;
                    this.socket.end();
                    this.success = true;
                    this.alive = false;
                    break;
                case 'consumeMessagesReceipt':
                    const messagesToConsume = msg['responseData']['messagesToConsume'];
                    if (messagesToConsume.includes(undefined)) {
                        debugger;
                    }
                    this.consumptionQueue = messagesToConsume;
                    this.requestID = msg['responseData']['requestID'];
                    this.processMessage(messagesToConsume.shift());
                    break;
                case 'confirmMessageConsumptionReceipt':
                    if (this.consumptionQueue.length == 0) {
                        this.socket.end();
                        this.success = true;
                        this.alive = false;
                    }
                    else {
                        this.processMessage(this.consumptionQueue.shift());
                    }
                    break;
                case 'messageConsumptionTimeout':
                    const messageID = msg['responseData']['messageID'];
                    this.consumptionTimeout(messageID);
                    break;
                case 'getWonderQStatusReceipt':
                    this.responseData = msg['status'];
                    this.socket.end();
                    this.success = true;
                    this.alive = false;
                    break;
            }
        }
        else {
            this.success = false;
            this.errorMessage = msg['errorMessage'];
            this.socket.end();
            this.alive = false;
        }
    }  
}

module.exports = { produceMessage, consumeMessages, getWonderQStatus }

