import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import sinon from 'sinon'
import { SQSClient, ReceiveMessageCommand, SendMessageCommand, SendMessageBatchCommand, SendMessageBatchCommandInput } from '@aws-sdk/client-sqs'
import { randomUUID } from 'crypto'
import { expectedOutput, leagueInfoMap, playerInfoMap, teamInfoMap, betOfferMessages, getSqsMessages, md5Hash } from '../helpers'
import { handler } from '../microservice'
import axios, { AxiosError } from "axios"

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mocked API Implementation
mockedAxios.get = jest.fn().mockImplementation(async (uri: string) => {
  const parts = uri.split('/')
  const id = Number(parts[parts.length - 1])
  if (uri.match(/sports.com\/league-info/)) {
    return { data: leagueInfoMap }
  } else if (uri.match(/sports.com\/player-info/)) {
    return { data: playerInfoMap[id] }
  } else if (uri.match(/sports.com\/team-info/)) {
    return { data: teamInfoMap[id] }
  } else {
    throw new AxiosError('something went wrong')
  }
})


describe('microservice', () => {

  beforeEach(function (this: any) {
    // Mocked SQS Implementation
    this.sqsMock = mockClient(SQSClient)
    this.sqsMock
      .on(ReceiveMessageCommand)
      .rejects('AWS.SimpleQueueService.NonExistentQueue: The specified queue does not exist for this wsdl version.')
      .on(ReceiveMessageCommand, {
        QueueUrl: 'https://epoxy.ai/sourcequeue',
      })
      .callsFake(getSqsMessages(betOfferMessages))
      .on(SendMessageCommand)
      .rejects('AWS.SimpleQueueService.NonExistentQueue: The specified queue does not exist for this wsdl version.')
      .on(SendMessageCommand, {
        QueueUrl: 'https://epoxy.ai/destinationqueue',
      })
      .resolves({
        MessageId: randomUUID()
      })
      .on(SendMessageBatchCommand)
      .rejects('AWS.SimpleQueueService.NonExistentQueue: The specified queue does not exist for this wsdl version.')
      .on(SendMessageBatchCommand, {
        QueueUrl: 'https://epoxy.ai/destinationqueue',
      })
      .callsFake(async (input: SendMessageBatchCommandInput) => {
        return { Successful: (input.Entries || []).map(entry => ({ Id: entry.Id, MessageId: randomUUID(), MD5OfMessageBody: entry.MessageBody && md5Hash(entry.MessageBody) })) }
      })
  })

  afterEach(function (this: any) {
    this.sqsMock.resetHistory()
  })

  describe('handler', function (this: any) {

    test('should pull BetOffer messages from the input queue', async function (this: any) {
      await handler()
      expect(this.sqsMock).toHaveReceivedCommandWith(ReceiveMessageCommand, { QueueUrl: 'https://epoxy.ai/sourcequeue' })
    })

    test('should request the supported leagues info from leagues API', async () => {
      await handler()
      expect(mockedAxios.get.mock.calls.some((args: any) => args[0].match(/league-info/))).toBe(true)
    })

    test('should request player-info from the sports API', async () => {
      await handler()
      expect(mockedAxios.get.mock.calls.some((args: any) => args[0].match(/player-info\/[0-9]+/))).toBe(true)
    })

    test('should request team-info from the sports API', async () => {
      await handler()
      expect(mockedAxios.get.mock.calls.some((args: any) => args[0].match(/team-info\/[0-9]+/))).toBe(true)
    })

    test('should publish the modified BetOffer messages to an output queue as a batch publish', async function (this: any) {
      await handler()
      expect(this.sqsMock).toHaveReceivedCommandTimes(SendMessageBatchCommand, 1)
    })

    test('should return the expected data', async () => {
      const results = await handler()
      expect(results).toEqual(expectedOutput)
    })
  })
})
