import { SQSClient, SendMessageBatchCommand } from "@aws-sdk/client-sqs"
import { ReceiveMessageCommand } from "@aws-sdk/client-sqs"
import axios from 'axios'

const sqs = new SQSClient({})

async function recurse (receivedMessages: BetOffer[]): Promise<BetOffer[]> {
  const receiveMessageCommand = new ReceiveMessageCommand({
    QueueUrl: 'https://epoxy.ai/sourcequeue',
    MaxNumberOfMessages: 2
  })

  const received = await sqs.send(receiveMessageCommand)
  if (received.Messages?.length) {
    received.Messages.forEach((message => {
      receivedMessages.push(JSON.parse(message.Body as string))
    }))

    return await recurse(receivedMessages)
  } else {
    return receivedMessages
  }
}

type BetOffer = {
  leagueId: LeagueId,
  outcomes: Partial<Outcome>[]
}
type Outcome = {
  participantType: string,
  participantId: number,
  participantInfo: object
}
type LeagueId = number
type League = { id: LeagueId, name: string }
type Group = { id: number, name: string, groups: League[] | Group[] }
type RawLeagues = { group: Group }

function adjustLeagues (rawLeagues: RawLeagues): LeagueId[] {
  function recurse (leagues: LeagueId[], group: League | Group) {
    if ('groups' in group && group.groups.length) {
      group.groups.forEach(g => recurse(leagues, g))
    } else {
      leagues.push(group.id)
    }
    return leagues
  }
  return recurse([], rawLeagues.group)
}

export const handler = async () => {

  const receiveMessageCommand = new ReceiveMessageCommand({
    QueueUrl: 'https://epoxy.ai/sourcequeue',
    MaxNumberOfMessages: 5
  })

  const rawMessages = await recurse([])

  // filter down to just supportedLeagues
  const rawLeagues = (await axios.get('https://sports.com/league-info')).data
  const adjustedLeagues = adjustLeagues(rawLeagues)
  const filteredMessages = rawMessages.filter(message => {
    return adjustedLeagues.includes(message.leagueId)
  })

  // add the participantInfo to each
  const augmentedMessages = await Promise.all(filteredMessages.map(async (message) => {
    const outcomes = await Promise.all(message.outcomes.map(async (outcome) => {
      if ('participantType' in outcome && 'participantId' in outcome) {
        outcome.participantInfo = (await axios.get(`https://sports.com/${outcome.participantType}-info/${outcome.participantId}`)).data
      }
      return outcome
    }))
    return { ...message, outcomes }
  }))

  // publish all messages as a batch
  const sendMessageCommand = new SendMessageBatchCommand({
    QueueUrl: 'https://epoxy.ai/destinationqueue',
    Entries: augmentedMessages.map((message, idx) => ({ Id: String(idx), MessageBody: JSON.stringify(message) }))
  })
  await sqs.send(sendMessageCommand)

  // return the modified messages
  return augmentedMessages
}
