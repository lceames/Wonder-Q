# WonderQ

WonderQ is a messaging queue built on Node.js. It leverages Node's ```net``` module to allow full-duplex data transmission between a WonderQ hub, the broker responsible for storing queues and processing requests, and the Wonder-Q client, which provides the ability to produce and consume Wonder-Q messages. Full-duplex transmission is useful here because it allows the client and server to preserve a single connection throughout the multiple request-response cycles required for operations like ```consumeMessages```. 

The ```net``` module also allows WonderQ to ensure multiple consumers and processors can write to it simeltaneously. This functionality is native to the module and supported by WonderQ's internal design, which leverages subsudiary queues on both the client and server to ensure that messages are never duplicated if a transmission fails or times out. 

The queue is not a FIFO queue in that it does not guarantee first-in first-out ordering. While this will usually be the case, transmission timeouts will cause the queue to occasionally provide messages out of the order in which they were received.

##API

###Class: WonderQ

**new WonderQ(listenPort, listenHost)**
```listenPort``` <number> **Default:** ```localhost```
```listenHost``` <string> **Default:** ```'3000'```

Initializes a WonderQ server listening for connections on the given ```listenPort``` and ```listenHost```


**WonderQ.createQueue(queueName, maxConsumerProcessTime)**
```queueName``` <string> Name of the created queue **Required**
```maxConsumerProcessTime``` <number> (milliseconds) Default: ```1000```

The ```maxConsumerProcessTime``` specififies how long the queue will wait for a consumer to process a given message. If this threshold is reached on a given ```consumeMessages``` API call before the consumer has confirmed processing with the WonderQ, the WonderQ will terminate the connection and restore unprocessed messages to the respective queue.


###WonderQ Client

**function produceMessage(messageOptions, callback)**

```messageOptions``` <object>
Produce message to WonderQ queue.
* queueName <string> Indicates which queue to modify within WonderQ hub **required**
* messageBody <string> The message text of the new message **required**
* wonderQHost <string> Host address of WonderQ hub **Default:** 127.0.0.1
* wonderQPort <number> Bound port of WonderQ hub **Default:** 3000
```callback``` <function> Function that will be invoked on completion of WonderQ request. Callback should take two arguments data and error for handling successful and unsuccessful requests. **required**

**function consumeMessages(messageOptions, callback, simulatedLatency)**
```messageOptions``` <object>
Consume message or messages from WonderQ queue.
* queueName <string> Indicates which queue to consume from within WonderQ hub **required**
* maxNumberOfMessages <number> The message text of the new message **Default:** 1
* wonderQHost <string> Host address of WonderQ hub **Default:** 127.0.0.1
* wonderQPort <number> Bound port of WonderQ hub **Default:** 3000
```callback``` <function> Function that will be invoked on completion of WonderQ request. Callback should take two arguments data and error for handling successful and unsuccessful requests. **required**
```simulatedLatency``` Optional parameter that will simulate latency for message processing. Helpful for testing ```maxConsumerProcessTime``` functionality.


**function getWonderQStatus(messageOptions, callback)**
```messageOptions``` <object>
Query state of a WonderQ hub 
* wonderQHost <string> Host address of WonderQ hub **Default:** 127.0.0.1
* wonderQPort <number> Bound port of WonderQ hub **Default:** 3000
```callback``` <function> Function that will be invoked on completion of WonderQ request. Callback should take two arguments data and error for handling successful and unsuccessful requests. **required**


## Todo
- [ ] Add FIFO queue functionality
- [ ] Encrypt and authenticate bidirectional data transmission between WonderQ hub and WonderQ client
- [ ] Expand API for deleting queues and deleting messages
