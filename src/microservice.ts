import { SQSClient, ReceiveMessageCommand, ReceiveMessageCommandOutput, SendMessageBatchCommandInput, SendMessageBatchRequestEntry, SendMessageBatchCommand } from "@aws-sdk/client-sqs"
import axios, { AxiosResponse } from "axios"
const client = new SQSClient({ region: 'us-west-2' })

type BetOffer = {
  id: number,
  type: string,
  leagueName: string,
  leagueId: number,
  criterion: string,
  outcomes: Outcome[]
}

type Outcome = {
  label: string,
  participantType?: string
  participantId?: number
  participantInfo: object
}

type Group = {
  id: number,
  groups: Group[] | League[]
}

type League = {
  id: number,
  name: string
}

const getBetOffersFromQueue = async () => {
  const input = {
    QueueUrl: 'https://epoxy.ai/sourcequeue',
    MaxNumberOfMessages: 10  }
  const command = new ReceiveMessageCommand(input)
  return await client.send(command)
}

const getGroupIds = (leagueInfo: Group): any => {
  if (leagueInfo.groups) {
  return leagueInfo.groups.map((group: any) => getGroupIds(group))
} else return leagueInfo.id
}

const getParticipantInfo = async (filteredBetOffers: BetOffer[]) => {
  return Promise.all(filteredBetOffers.map(async (betOffer: BetOffer) => {
      const augmentedOutcomes = Promise.all(betOffer.outcomes.map(async (outcome: Outcome) => {
        if (outcome.participantType && outcome.participantId) {
          outcome.participantInfo = (await axios.get(`https://sports.com/${outcome.participantType}-info/${outcome.participantId}`)).data
          return outcome
        } else return outcome
      }))
      return {...filteredBetOffers, augmentedOutcomes}
  }))
}

const formatMessageForSqs = (messages: any) => {

}

const publishMessageToSqs = async (messages: SendMessageBatchCommandInput['Entries']) => {
  const input: SendMessageBatchCommandInput = {
    QueueUrl: 'https://epoxy.ai/destinationqueue',
    Entries: messages
  }
const command = new SendMessageBatchCommand(input)
const response = await client.send(command)
}
export const handler = async () => {
  const betOffers = await getBetOffersFromQueue()
  const leagueInfo = (await axios.get('https://sports.com/league-info')).data
  const parsedBetOffers = betOffers.Messages!.map((message) => message.Body && JSON.parse(message.Body))
  const leagueIds = getGroupIds(leagueInfo.group).flat(Infinity)
  const filteredBetOffers = parsedBetOffers?.filter((betOffer) => leagueIds.includes(betOffer.leagueId))
  const augmentedMessages = await getParticipantInfo(filteredBetOffers)
  // format message for batch publishing, then publish to SQS
  return augmentedMessages
}
