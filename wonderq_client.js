const net = require('net');
const uuidv1 = require('uuid/v1');

function produceMessage(messageOptions, callback) {
    const {queueName, messageBody, wonderQHost = "127.0.0.1", wonderQPort = 3000} = messageOptions;
    const requestData = { 'messageBody': messageBody };
    const request = new WonderQRequest(queueName, 'produceMessage', wonderQHost, wonderQPort, requestData);

    const interval = setInterval(() =>  { 
        if (!request.alive) { 
            clearInterval(interval) 
            if (request.success) {
                callback(request.responseData);
            }
            else {
                callback(null, request.error)
            }
        }
    }, 250);
}

function consumeMessages(messageOptions, callback) {
    const {queueName, maxNumberOfMessages, wonderQHost = "127.0.0.1", wonderQPort = 3000} = messageOptions;
    const requestData = { 'maxNumberOfMessages': maxNumberOfMessages };
    const request = new WonderQRequest(queueName, 'consumeMessages', wonderQHost, wonderQPort, requestData);

    const interval = setInterval(() =>  { 
        if (!request.alive) { 
            clearInterval(interval) 
            if (request.success) {
                callback(request.responseData);
            }
            else {
                callback(null, request.error)
            }
        }
    }, 250);
}

function getWonderQStatus(messageOptions, callback) {
    const {queueName = null, messageBody, wonderQHost = "127.0.0.1", wonderQPort = 3000} = messageOptions;
    const request = new WonderQRequest(queueName, 'getWonderQStatus', wonderQHost, wonderQPort);

    const interval = setInterval(() =>  { 
        if (!request.alive) { 
            clearInterval(interval) 
            if (request.success) {
                callback(request.responseData);
            }
            else {
                callback(null, request.error)
            }
        }
    }, 250);
}

function deleteMessage(messageID, queueName, wonderQHost = "127.0.0.1", wonderQPort = 3000) {
    const connectionSocket = net.createConnection(wonderQPort, wonderQHost);
}

class WonderQRequest {
    constructor(queueName, operation, host, port, requestData) {
        const socket = net.connect(port, host);
        socket.setTimeout(3000);
        socket.on('timeout', () => {
            console.log('socket timeout');
            socket.end();
        });
        
        this.socket = socket;
        this.configureSocket(socket);
        this.alive = true;
        this.queueName = queueName
        this.operation = operation;
        this.requestData = requestData;
        this.connectionID = uuidv1();
        this.consumptionQueue = [];
        this.responseData = {};

        const requestMessage = {
            'operation': operation,
            'queueName': queueName,
            'connectionID': this.connectionID,
            'requestData': requestData
        }

        socket.write(JSON.stringify(requestMessage))
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
            console.log('timeout')
            this.success = false;
            this.error = error
            this.alive = false;
        });
        
    }

    processMessage(message) {
        const messageID = message['messageID'];
        const messageBody = message['messageBody'];
        this.responseData[messageID] = message[messageBody];

        const confirmMessageReceipt = {
            'operation': 'confirmMessageReceipt',
            'messageID': messageID
        }

        this.socket.write(JSON.stringify(confirmMessageReceipt));
    }



    receiveResponse(data) {
        const msg = JSON.parse(data);
        const success = msg['requestSuccess'];
        // console.log(msg)

        if (success) {
            switch(this.operation) {
                case 'produceMessage':
                    this.responseData = msg;
                    this.socket.end();
                    this.success = true;
                    this.alive = false;
                    break;
                case 'consumeMessages':
                    const messagesToConsume = msg['messagesToConsume'];
                    this.processMessage(messagesToConsume.shift());
                    this.consumptionQueue = messagesToConsume;
                    break;
                case 'confirmMessageReceipt':
                    if (this.consumptionQueue.length == 0) {
                        this.socket.end();
                        this.success = true;
                        this.alive = false;
                    }
                    else {
                        this.processMessage(this.consumptionQueue.shift());
                    }
                    break;
                case 'getWonderQStatus':
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




// handleErrorMessage() {

// }

// // openWonderQConnection() {
// //     const socketOptions = {
// //         port: this.wonderQPort,
// //         host: this.wonderQHost,
// //     };

// //     const conn = net.createConnection(socketOptions);
// //     this.configureConnection()
// //     return conn;
// // }



// new WonderQClient('tes').testConnection();