# Introduction

👋 Hi!

Thank you for taking the time to complete this assignment as part of your evaluation for a position at Epoxy.ai! This assignment will test your abililty to implement a typical data processing task that we deal with. One hour of time is alotted and the assigment will be carried out as a collaborative session with engineers from Epoxy.ai.

The purpose is to evaluate your skills in Node.js, Typescript, problem solving, and collaboration.

You may use any and all resources at your disposal in your efforts to complete the assignment.

Before starting, please review the instructions carefully.

# What will you be assessed on?

* How you _approach_ a complex problem, and how you communicate your _thought process_ along the way.
* Your demonstration of Node.js fundamentals and basic data structure manipulation.
* Your ability to read and understand the documentation if a required library is new to you.
* Your ability to make significant progress and discuss next steps, rather than 100% completion of the challenge.

# The Task

## Summary

Your task is to implement a microservice function that can fetch, transform, and publish data. The microservice's job is to pull `BetOffer` messages from a source AWS SQS Queue, filter and augment the `BetOffer` messages with data fetched from a Sports Data API, and finally publish the augmented `BetOffer` messages to a destination AWS SQS Queue. The entry point for execution is the exported `handler` function in `src/microservice.ts`. Your implementation should be written in Typescript with strong typing.

## Getting Started

You will need to set up the project and start the unit test suite running. The unit tests will invoke the `src/microservice.ts#handler` function as if it were a real microservice running in the cloud. The unit tests also establish mocks for the AWS SQS API, and the `axios` library. Complete these steps to get up and running:

1. Clone this repo.
2. Checkout a new branch called `{your_name}-solution`
3. Run `npm i`.
4. Run `npm run test-watch` to start the unit test suite.
5. Write your implementation in `./src/microservice.ts`
6. Commit your work upon completion.

Some useful documentation resources:
* `aws-sdk`: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html
* `axios`: https://axios-http.com/docs/api_intro

## Detailed Instructions

1. Pull `BetOffer` messages from the source AWS SQS Queue by using the `aws-sdk` library. The source queue url is `https://epoxy.ai/sourcequeue`. Your implementation must ensure that there are no remaining messages on the queue.

2. Filter the incoming `BetOffer` messages down to only leagues that are represented in the `league-info` data. This data can be fetched from the mock API with this url: `https://sports.com/league-info`. Please use the `axios` library for fetching. Details about the sample data structure are [here](#sample-json-data).

3. For all `BetOffer` messages that contain `outcomes` with `participantType: "team"`, fetch the team info data from the mock API `https://sports.com/team-info/{id}`. Attach this data to the outcome object on the field `participantInfo`. Please use the `axios` library for fetching. Details about the sample data structure are [here](#sample-json-data).

4. For all `BetOffer` messages that contain `outcomes` with `participantType: "player"`, fetch the player info data from the mock API `https://sports.com/player-info/{id}`. Attach this data to the outcome object on the field `participantInfo`. Please use the `axios` library for fetching. Details about the sample data structure are [here](#sample-json-data).

5. Publish the augmented `BetOffer` messages to the destination AWS SQS Queue using the minimum number of batch publishing operations, utilizing the `aws-sdk` library. The destination queue url is `https://epoxy.ai/destinationqueue`. The ordering of the published messages should match the order in which they were received.

6. Return the array of augmented `BetOffer` messages.

## Notes and Recommendations

* You can complete the steps in any order. Some steps utilize data from a previous step, but sample data is available within the repo to approach any step out-of-order.
* If you add new functions to `src/microservice.ts` they should be unit tested if time permits.
* Strong types are encouraged.
* Studying the test mocks will reveal how to achieve some of the steps, but you are encouraged to use other resources in order to demonstrate your problem-solving ability.
* If you have read this far, please say "chicken sandwich" out loud.
* Make as many or few git commits as you see fit along the way.

# What you'll find in this repo

* `src/microservice.ts`: your entry-point and where all of your implementation should reside.
* `src/__tests__/microservice.spec.ts`: the unit test suite that makes targeted assertions against your implementation.
* `src/__tests__/index.spec.ts`: the root-level unit test module that sets up mocks.
* `src/__tests__/helpers.ts`: some small functions that help the mocks perform their tasks.
* `data/`: see the next section for a detailed breakdown of the sample data.

## Sample JSON Data

The data that you'll be working with can be found in `./data`. This data is served by the SQS and `axios` mocks in the unit test suite, but you can also import some or all of this data into your implementation to work on steps out of order.

### bet-offer-messages.json

`BetOffer`s represent chance occurrences that customers can place a bet on. The `outcomes` array represents the possible outcomes that can be selected. For example, a customer could select either the "Over" outcome or "Under" outcome on a `BetOffer` of `type: "Over/Under"`. Note that some `BetOffer`s have outcomes related to a team or player, as indicated by the `participantType: "team"|"player"` property. Note that each `BetOffer` is relevant to only one `League` within a `Sport`.

### league-info.json

`League`s represent a group of athletes or teams that compete against each other within a `Sport`. When looking at the league data you will notice that `Leagues` can be placed into a tree structure, where a `Sport` is the root for multiple `Leagues`. Some `Sports`s have additional stems under the `Sport`, but the `League`s are always the leaf nodes of this tree structure.

### team-info.json

The `Team` objects contain some metadata and statistics about Teams that are available for fetching by `id` from `https://sports.com/team-info/{id}`.

### player-info.json

The `Player` objects contain some metadata and statistics about Players that are available for fetching by `id` from `https://sports.com/player-info/{id}`.

### expected-output.json

This data is the expected output shape and is used for assertions in the unit tests.
