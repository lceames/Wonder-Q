const net = require('net');

function produceMessage(messageOptions, callback) {
    const {queueName, messageBody, wonderQHost = "127.0.0.1", wonderQPort = 3000} = messageOptions
    const requestData = { 'messageBody': messageBody }
    const request = new WonderQRequest(queueName, 'produceMessage', wonderQHost, wonderQPort, requestData);

    const interval = setInterval(() =>  { 
        if (!request.alive) { 
            clearInterval(interval) 
            if (request.success) {
                callback(request.responseData);
            }
            else {
                debugger;
                callback(null, request.error)
            }
        }
    }, 250);
}

function consumeMessages(maxNumberOfMessagesqueueName, wonderQHost = "127.0.0.1", wonderQPort = 3000) {
    const connectionSocket = net.createConnection(wonderQPort, wonderQHost);
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

        const requestMessage = {
            'operation': operation,
            'queueName': queueName,
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
            debugger;
            this.alive = false;
        });

        this.socket.on('timeout', (error) => {
            console.log('timeout')
            this.success = false;
            this.error = error
            this.alive = false;
        });
        
    }

    receiveResponse(data) {
        const msg = JSON.parse(data);
        const success = msg['status'];
    
        if (success) {
            switch(this.operation) {
                case 'produceMessage': 
                    this.responseData = msg;
                    this.socket.end();
                    this.success = true;
                    this.alive = false;  
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

module.exports = { produceMessage }




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