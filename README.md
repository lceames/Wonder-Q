# WonderQ

WonderQ is a messaging queue built on Node.js. It leverages Node's ```net``` module to allow full-duplex data transmission between a WonderQ hub, the broker responsible for storing queues and processing requests, and the WonderQ client, which provides the ability to produce and consume WonderQ messages. Full-duplex transmission is useful here because it allows the client and server to preserve a single connection throughout the multiple request-response cycles required for operations like ```consumeMessages```. 

The ```net``` module also allows WonderQ to ensure multiple producers and consumers can write to it simeltaneously. This functionality is native to the module and supported by WonderQ's internal design, which leverages subsidiary queues on both the client and server to ensure that messages are never duplicated if a transmission fails or times out. 

The queue is not a FIFO queue in that it does not guarantee first-in first-out ordering. While this will usually be the case, transmission timeouts will cause the queue to occasionally provide messages out of the order in which they were received.

## Demo 

To demo WonderQ take the following steps:

1.) Clone this repo.

2.) Navigate into the repo's directory and ```npm install```.

2.) Open two more terminal windows and navigate into the repo's directory.

3.) Execute ```node start_wonderq.js``` in one of them. This script simply starts a WonderQ hub instance in a seperate process. This is helpful because the project abstracts logic related to data persistence. Each WonderQ hub lasts only as long as the process calling it. 

4.) Execute ```node wonderq_status.js``` in another of them. This is the 'quick and dirty developer tool' that continuously monitors the state of WonderQ. It will update the terminal window as messages flow in and out of the demo WonderQ. 

5.) Finally, use the last terminal window to run ```node test_app.js default```. This script will initiate two intervals that make periodic API calls to ```produceMessage``` and ```consumeMessages``` respectively. You can modulate the growth trajectory of WonderQ by adding a third command line argument(```node test_app.js grow``` or ```node test_app.js shrink```). If you choose ```grow```, the interval values will ensure more messages are flowing into the queue that out. ```shrink``` will do the opposite. The default setting will cause about the same amount of messages to flow in and out of the queue. You can simulate message process latency with ```node start_wonderq.js [default/grow/shrink] sim-latency```. This will direct the demo WonderQ client to take unncessarily long to process consumed messages, and trigger the WonderQ's ```maxConsumerProcessTime``` functionality. The script will also print to the window a continuous stream of API call results. You can note the effects of the ```sim-latency``` switch by reading through some of these results.

## API

### Class: WonderQ

**new WonderQ(listenPort, listenHost)** <br/>
```listenPort``` <number> **Default:** ```localhost``` <br/>
```listenHost``` <string> **Default:** ```'3000'```

Initializes a WonderQ server listening for connections on the given ```listenPort``` and ```listenHost```


**WonderQ.createQueue(queueName, maxConsumerProcessTime)** <br/>
```queueName``` <string> Name of the created queue **Required** <br/>
```maxConsumerProcessTime``` <number> (milliseconds) Default: ```1000```

The ```maxConsumerProcessTime``` specififies how long the queue will wait for a consumer to process a given message. If this threshold is reached on a given ```consumeMessages``` API call before the consumer has confirmed processing with the WonderQ, the WonderQ will terminate the connection and restore unprocessed messages to the respective queue.


### WonderQ Client

**function produceMessage(messageOptions, callback)** <br/>
```messageOptions``` <object> 
* ```queueName``` <string> Indicates which queue to modify within WonderQ hub **required**
* ```messageBody``` <string> The message text of the new message **required**
* ```wonderQHost``` <string> Host address of WonderQ hub **Default:** 127.0.0.1
* ```wonderQPort``` <number> Bound port of WonderQ hub **Default:** 3000 <br/>

```callback``` <function> Function that will be invoked on completion of WonderQ request. Callback should take two arguments data and error for handling successful and unsuccessful requests. **required** <br/>

Produce message to WonderQ queue.

**function consumeMessages(messageOptions, callback, simulatedLatency)** <br/>
```messageOptions``` <object>
Consume message or messages from WonderQ queue.
* ```queueName``` <string> Indicates which queue to consume from within WonderQ hub **required**
* ```maxNumberOfMessages``` <number> The message text of the new message **Default:** 1
* ```wonderQHost```<string> Host address of WonderQ hub **Default:** 127.0.0.1
* ```wonderQPort``` <number> Bound port of WonderQ hub **Default:** 3000 <br/>

```callback``` <function> Function that will be invoked on completion of WonderQ request. Callback should take two arguments data and error for handling successful and unsuccessful requests. **required** <br/>
```simulatedLatency``` Optional parameter that will simulate latency for message processing. Helpful for testing ```maxConsumerProcessTime``` functionality.


**function getWonderQStatus(messageOptions, callback)**
```messageOptions``` <object>
Query state of a WonderQ hub 
* ```wonderQHost``` <string> Host address of WonderQ hub **Default:** 127.0.0.1 
* ```wonderQPort``` <number> Bound port of WonderQ hub **Default:** 3000 <br/>

```callback``` <function> Function that will be invoked on completion of WonderQ request. Callback should take two arguments data and error for handling successful and unsuccessful requests. **required**

## Scaling Discussion

One approach to scaling this project would be leveraging an extremely fast data structure store like a Redis cache. As volume increases, it will become increasingly important to minimize the amount of time each read/write to the message queue takes. A Redis cache would provide this speed because it stores data in memory and uses a publisher-subscriber data structure. This solution may be preferable to a distributed solution due to the message queue's need for synchronicity across nodes. Since the system provide FIFO functionality at least most of the time, an approach like distributed containers could cause reliability issues.

One issue with the in-memory solution could be sudden spikes in positive queue traffic, or just general queue size growth. If the message queue's size grows so large that in no longer fits in memory, the system would obviously have a problem. One solution to this problem could be writing the newest messages to disk when in-memory storage reached capacity. This would theoretically prevent the system from failing to read new messages while retaining speed on the consumption side. Perhaps an independent process could be responsible for querying and transmitting data from hard disk to in-memory cache as messages are consumed. 


## Todo
- [ ] Persist queue data
- [ ] Add testing suite
- [ ] Add FIFO queue functionality
- [ ] Encrypt and authenticate bidirectional data transmission between WonderQ hub and WonderQ client
- [ ] Expand API for deleting queues and deleting messages
