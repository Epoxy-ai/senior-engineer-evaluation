# Introduction

👋 Hi!

Thank you for taking the time to complete this assignment as part of your evaluation for a position at Epoxy.ai! This assignment will test your abililty to implement a typical data processing task that we deal with. One hour of time is alotted and the assigment will be carried out as a collaborative session with engineers from Epoxy.ai.

The purpose is to evaluate your skills in Node.js, Typescript, problem solving, and collaboration. You may use any resources at your disposal in your efforts to complete the assignment.

## Getting Started

1. Clone this repo.
2. Checkout a new branch called `{your_name}-solution`
3. Run `npm i`.
4. Run `npm run test-watch` to start the unit tests.
5. Write your implementation in `./src/microservice.ts`
6. Commit your work.

## The Task

Your task is to implement a microservice that will run in AWS Lambda. The microservice's job is to pull `BetOffer` messages from a source SQS Queue, filter and augment the `BetOffer` messages with data fetched from a Sports data API, and finally publish the augmented `BetOffer` messages to a destination SQS Queue. In an AWS Lambda function the entry point for execution is the exported `handler` function. To simulate lambda functionality your microservice's `handler` function is invoked from a set of unit tests that create mock SQS Queues and mock Data APIs. Here are the tasks you will need to complete:

1. Pull all available `BetOffer` messages from the source SQS Queue, located at `https://epoxy.ai/sourcequeue`.
2. Filter the incoming `BetOffer` messages down to only leagues are that represented in the `league-info` data. This data can be fetched from `https://sports.com/league-info`. Please use the `axios` library for fetching.
4. For all `BetOffer` messages that contain `outcomes` with `participantType: "team"`, fetch the team info data from `https://sports.com/team-info/{id}`. Attach this data to the outcome object on the field `participantInfo`. Please use the `axios` library for fetching.
4. For all `BetOffer` messages that contain `outcomes` with `participantType: "player"`, fetch the player info data from `https://sports.com/player-info/{id}`. Attach this data to the outcome object on the field `participantInfo`. Please use the `axios` library for fetching.
5. Publish the augmented `BetOffer` messages to the destination SQS Queue using a batch publish operation. The destination queue is located at `https://epoxy.ai/destinationqueue`. The ordering of the published messages should match the order in which they were received.
6. Return the array of augmented `BetOffer` messages.

## Data You'll Encounter

The data that you'll be working with can be found in `./data`.

### bet-offer-messages

`BetOffer`s represent chance occurrences that customers can place a bet on. The `outcomes` array represents the possible outcomes that can be selected. For example, a customer could select either the "Over" outcome or "Under" outcome on a `BetOffer` of `type: "Over/Under"`. Note that some `BetOffer`s have outcomes related to a team or player, as indicated by the `participantType: "team"|"player"` property. Note that each `BetOffer` is relevant to only one `League` within a `Sport`.

### league-info

`League`s represent a group of athletes or teams that compete against each other within a `Sport`. When looking at the league data you will notice that `Leagues` can be placed into a tree structure, where a `Sport` is the root for multiple `Leagues`. Some `Sports`s have additional stems under the `Sport`, but the `League`s are always the leaf nodes of this tree structure.

### team-info

The `Team` objects contain some metadata and statistics about Teams that are available for fetching by `id` from `https://sports.com/team-info/{id}`.

### player-info

The `Player` objects contain some metadata and statistics about Players that are available for fetching by `id` from `https://sports.com/player-info/{id}`.

### expected-output

This data is the expected output shape and is used for assertions in the unit tests.

## Notes

* You can complete the steps in any order.
* If you add new functions to `microservice.ts` they should be unit tested if time permits.
* Studying the test mocks will reveal how to achieve some of the steps, but you are encouraged to use other resources in order to demonstrate your problem-solving ability.
* If you have read this far, please say "chicken sandwich" out loud.
* 100% completion is less important that your _approach_ and _process_. We want to hear and see you work through a challenging problem rather than see all unit tests pass.
* Make as many or few git commits as you see fit along the way.
