import { SQS, SendMessageBatchCommand } from "@aws-sdk/client-sqs"
import axios from "axios"

type Group = {
  id: number
  name: string
  groups?: Group[]
}

type Offer = {
  id: number
  type: string
  sport: string
  leagueName: string
  leagueId: number
  criterion: string
  outcomes: Outcome[]
}

type Outcome = {
  label: string
  participantType?: 'team' | 'player'
  participantId?: number
}

export const extractGroups = (groups: Group[]): any => groups.map((group) => {
  return group.groups && group.groups.length ? extractGroups(group.groups) : group
})

export const applyParticipantData = async (outcome: Outcome) => {
  if(!outcome.participantId) return outcome
  if(outcome.participantType === 'team') {
    const participantInfo = await axios.get(`https://sports.com/team-info/${outcome.participantId}`).then((res) => res.data)
    return { ...outcome, participantInfo }
  }
  if(outcome.participantType === 'player') {
    const participantInfo = await axios.get(`https://sports.com/player-info/${outcome.participantId}`).then((res) => res.data)
    return { ...outcome, participantInfo }
  }
}

export const handler = async () => {
  const sqs = new SQS({})
  // pull bet offer messages
  const betOffers: Offer[] = await sqs.receiveMessage({ QueueUrl: 'https://epoxy.ai/sourcequeue', MaxNumberOfMessages: 10}).then((res) => {
    if (!res.Messages) return []
    return res.Messages.map((message) => JSON.parse(message.Body || ''))
  })
  // filter for only leagues in league-info
  // todo: clean up this line
  const leagues = await axios.get('https://sports.com/league-info').then((res) => extractGroups(res.data.group.groups).flat().flat().map((league: any) => league.id))
  const validOffers = betOffers.filter((offer) => leagues.includes(offer.leagueId))
  const updatedValidOffers = await Promise.all(validOffers.map(async(offer) => {
    const newOutcomes = await Promise.all(offer.outcomes.map(applyParticipantData))
    return { ...offer, outcomes: newOutcomes}
  }))
  const messageBatch = updatedValidOffers.map((offer, idx) => ({ Id: `${idx}`, MessageBody: JSON.stringify(offer)}))
  // publish to destination queue
  await sqs.sendMessageBatch({
    QueueUrl: 'https://epoxy.ai/destinationqueue',
    Entries: messageBatch
  })
  return updatedValidOffers
}
