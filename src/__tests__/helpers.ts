import { mockClient } from 'aws-sdk-client-mock'
import 'aws-sdk-client-mock-jest'
import { GetQueueAttributesCommandOutput, OverLimit, ReceiveMessageCommandInput, ReceiveMessageCommandOutput } from '@aws-sdk/client-sqs'
import { SQSClient, ReceiveMessageCommand, SendMessageCommand, SendMessageBatchCommand, SendMessageBatchCommandInput, TooManyEntriesInBatchRequest, EmptyBatchRequest, GetQueueAttributesCommand } from '@aws-sdk/client-sqs'
import { createHash, randomUUID } from 'crypto'
import { AxiosError } from 'axios'

import leagueInfo from '../../data/league-info.json'
import playerInfo from '../../data/player-info.json'
import teamInfo from '../../data/team-info.json'
import betOffersRaw from '../../data/bet-offer-messages.json'
import expectedOutputRaw from '../../data/expected-output.json'

export const md5Hash = (str: string) => createHash('md5').update(str).digest("hex")

export const getSqsMessages = (messages: typeof betOffersRaw) => {
  let storedMessages = messages
  return {
    count: async (): Promise<Partial<GetQueueAttributesCommandOutput>> => {
      return {
        Attributes: {
          ApproximateNumberOfMessages: String(storedMessages.length),
        }
      }
    },
    receive: async (input: Partial<ReceiveMessageCommandInput>): Promise<Partial<ReceiveMessageCommandOutput>> => {
      if (input.MaxNumberOfMessages && input.MaxNumberOfMessages > 10) {
        throw new OverLimit({ $metadata: {}, message: 'ReceiveMessageCommand: The maximum number of messages to receive at once is 10.'})
      }
      const maxNumberOfMessages = input.MaxNumberOfMessages || 1
      const messages = storedMessages.slice(0, maxNumberOfMessages)
      storedMessages = storedMessages.slice(maxNumberOfMessages)

      return {
        Messages: messages.map((msg: any, index: number) => ({
          MessageId: `${index}`,
          Body: JSON.stringify(msg),
        }))
      }
    }
  }
}

export const playerInfoMap: Record<number, any> = playerInfo.reduce((a: Record<number, any>, player: { id: number }) => {
  a[player.id] = { ...player }
  return a
}, {})

export const teamInfoMap: Record<number, any> = teamInfo.reduce((a: Record<number, any>, team: { id: number }) => {
  a[team.id] = { ...team }
  return a
}, {})

export const betOfferMessages = betOffersRaw
export const leagueInfoMap = leagueInfo
export const expectedOutput = expectedOutputRaw

export const initializeMocks = function (this: any) {
  // Mocked SQS Implementation
  const queueData = getSqsMessages(betOfferMessages)
  this.sqsMock = mockClient(SQSClient)
  this.sqsMock
    .on(ReceiveMessageCommand)
    .rejects('AWS.SimpleQueueService.NonExistentQueue: The specified queue does not exist for this wsdl version.')
    .on(ReceiveMessageCommand, {
      QueueUrl: 'https://epoxy.ai/sourcequeue',
    })
    .callsFake(queueData.receive)
    .on(GetQueueAttributesCommand)
    .callsFake(queueData.count)
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
      if (!input.Entries || input.Entries!.length === 0) {
        throw new EmptyBatchRequest({ $metadata: {}, message: 'SendMessageBatchCommand: Received an empty BatchRequest.' })
      }
      if (input.Entries!.length > 10) {
        throw new TooManyEntriesInBatchRequest({ $metadata: {}, message: 'SendMessageBatchCommand: The maximum number of messages in a batch is 10.' })
      }
      return { Successful: (input.Entries || []).map(entry => ({ Id: entry.Id, MessageId: randomUUID(), MD5OfMessageBody: entry.MessageBody && md5Hash(entry.MessageBody) })) }
    })

}

export const resetMocks = function (this: any) {
}

export async function getMock (uri: string) {
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
}
