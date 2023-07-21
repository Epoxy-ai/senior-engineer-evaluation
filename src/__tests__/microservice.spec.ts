import { ReceiveMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs'
import { initializeMocks, getMock, resetMocks, expectedOutput } from './helpers'
import axios from "axios"
import { handler } from '../microservice'

// Mocked API Implementation
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>
mockedAxios.get = jest.fn().mockImplementation(getMock)


describe('microservice', function (this: any) {

  beforeEach(initializeMocks)
  afterEach(resetMocks)

  describe('handler', function (this: any) {

    test('should pull BetOffer messages from the source queue', async function (this: any) {
      await handler()
      expect(this.sqsMock).toHaveReceivedCommandWith(ReceiveMessageCommand, { QueueUrl: 'https://epoxy.ai/sourcequeue' })
    })

    test('should request the leagues-info from sports API', async () => {
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

    test('should publish the augmented BetOffer messages to the destination queue in the minimum number of batches', async function (this: any) {
      await handler()
      expect(this.sqsMock).toHaveReceivedCommandWith(SendMessageBatchCommand, { QueueUrl: 'https://epoxy.ai/destinationqueue' })
      expect(this.sqsMock).toHaveReceivedCommandTimes(SendMessageBatchCommand, 2)
    })

    test('should return the expected output for augmented BetOffer messages', async () => {
      const results = await handler()
      expect(results).toEqual(expectedOutput)
    })
  })
})
