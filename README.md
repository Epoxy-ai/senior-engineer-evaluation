

Get BetOffer messages from an input queue
Filter them by the supported leagues provided by a third-party API
Get participant info
Augment them with participant info
Publish the new objects to an output queue as a batch





Challenge 1:
Figure out how to get messages from the SQS Queue

Challenge 2:
Figure out how to get the supported leagues from the API

Challenge 3:
Transform the supported leagues into a usable form

Challenge 4:
Use the transformed leagues list to filter the messages

Challenge 5:
Publish the filtered messages to an output queue


CLAY sending some example tests from other companies

Pat says:
Part 1: system design discussion
  - how would you go about creating a system that does XYZ? These are the requirements
Part 2: implement a basic microservice that transforms data and sends it forward
  - just do it fully by unit tests, don't try to be tricky
