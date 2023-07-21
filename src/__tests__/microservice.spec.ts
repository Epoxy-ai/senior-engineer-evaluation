import { ReceiveMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs'
import { initializeMocks, resetMocks, expectedOutput, leagueInfoMap, playerInfoMap, teamInfoMap } from './helpers'
import axios, { Axios, AxiosError, AxiosRequestConfig } from "axios"
import { handler } from '../microservice'

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
