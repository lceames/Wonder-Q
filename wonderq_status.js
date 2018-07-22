const { getWonderQStatus } = require('./wonderq_client');

function printResults(data, err) {
    if (err) {
        console.log(err);
    }
    else {
        data = JSON.parse(data);
        queueNames = Object.keys(data['queues']);
        console.log(`${queueNames.length} queue has been created`);
        queueNames.forEach(queueName => {
            const queue = data['queues'][queueName];
            console.log("--------PRINTING INDIVIDUAL QUEUE STATE--------")
            console.log(`Queue name: ${queue['queueName']}`);
            console.log(`Message count: ${queue['messages'].length}`)
            console.log(`maxConsumerProcessTime: ${queue['maxConsumerProcessTime']}`)
            console.log("---FINISHED PRINTING INDIVIDUAL QUEUE STATE---")
        });
    }
}

getWonderQStatus({}, printResults)

