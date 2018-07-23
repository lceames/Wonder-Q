const { produceMessage, consumeMessages } = require('./wonderq_client');

function callback(data, err) {
    if (err) {
        console.log(err);
    }
    else {
        console.log(data);
    }
}

const trend = process.argv[2];
let produceInterval;
let consumeInterval;

switch(trend) {
    case 'grow':
        produceInterval = 50;
        consumeInterval = 700;
        break;
    case 'shrink':
        produceInterval = 100;
        consumeInterval = 300;
        break;
    default:
        produceInterval = 100;
        consumeInterval = 300;
}

const produceMessageOptions = {
    'queueName': 'test',
    'messageBody': 'This is a test message'
}

const consumeMessageOptions = {
    'queueName': 'test',
    'maxNumberOfMessages': 5
}

setInterval(() => produceMessage(produceMessageOptions, callback), produceInterval);

setInterval(() => consumeMessages(consumeMessageOptions, callback), consumeInterval);




