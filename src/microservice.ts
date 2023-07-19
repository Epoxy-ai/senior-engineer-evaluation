import { SQSClient, ReceiveMessageCommand, SendMessageBatchCommand } from '@aws-sdk/client-sqs'
import axios from 'axios'

type BetOffer = {
  id: number
  type: string
  sport: string
  leagueName: string
  leagueId: number
  criterion: string
  outcomes: (OutcomeTeam | OutcomePlayer | OutcomeDefault)[]
}

type OutcomeTeam = {
  label: string
  participantType: 'team'
  participantId: number
  participantInfo?: any
}

type OutcomePlayer = {
  label: string
  participantType: 'player'
  participantId: number
  participantInfo?: any
}

type OutcomeDefault = {
  label: string
  participantInfo?: any
}

const sqs = new SQSClient({apiVersion: '2012-11-05'});
const receiveMessages = new ReceiveMessageCommand({ QueueUrl: 'https://epoxy.ai/sourcequeue', MaxNumberOfMessages: 10 })

const isOutcomeWithParticipants = (outcome: OutcomeTeam | OutcomePlayer | OutcomeDefault): outcome is (OutcomeTeam | OutcomePlayer) => {
  return 'participantType' in outcome
}

export const getLeagues = async () => {
  return (await axios.get('https://sports.com/league-info')).data
}

export const flattenLeagues = (groups: any, parentId: number | null, init = []) => {
  return [].concat(groups).reduce((acc: any, group: any) => {
    acc.push({
      id: group.id,
      name: parentId ? group.name : 'Root',
      parentId: parentId,
    })

    if (group.groups) {
      acc.concat(flattenLeagues(group.groups, group.id, acc))
    }

    return acc
  }, init)
}

export const getTeams = async (teamId: number) => {
  return (await axios.get(`https://sports.com/team-info/${teamId}`)).data
}

export const getPlayers = async (playerId: number) => {
  return (await axios.get(`https://sports.com/player-info/${playerId}`)).data
}

export const offersToSQSMessage = (betOffers: BetOffer[]) => {
  return betOffers.map(betOffer => ({ Id: `${betOffer.id}`, MessageBody: JSON.stringify(betOffer) }))
}

export const getAllSQSMessages = async (receiveMessages: ReceiveMessageCommand, acc: any[]): Promise<any[] | undefined> => {
  const payload = await sqs.send(receiveMessages)
  const messages = payload.Messages?.map(message => JSON.parse(message?.Body || '{}'))
  let next: any[] | undefined = []

  if (messages && messages.length > 0) {
    next = await getAllSQSMessages(receiveMessages, messages)
  }

  return messages?.concat(next as any[])
}

export const sendBetOfferMessages = (endpoint: string, messages: any[]) => {
  const BATCH_SIZE = 10
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE)

    const sendMessages = new SendMessageBatchCommand({
      QueueUrl: endpoint,
      Entries: offersToSQSMessage(batch)
    })

    sqs.send(sendMessages)
  }
}

export const augmentOutcomes = async (outcomes: BetOffer['outcomes']): Promise<BetOffer['outcomes']> => {
  return Promise.all(outcomes.map(async outcome => {
    if (isOutcomeWithParticipants(outcome)) {
      switch (outcome.participantType) {
        case 'team':
          return {
            ...outcome,
            participantInfo: await getTeams(outcome.participantId),
          }
        case 'player':
          return {
            ...outcome,
            participantInfo: await getPlayers(outcome.participantId)
          }
      }
    }

    return outcome
  }))
}

export const handler = async () => {
  const betOfferMessages = await getAllSQSMessages(receiveMessages, [])
  const leagues = flattenLeagues((await getLeagues()).group, null, [])

  const betOffers: BetOffer[] | undefined = betOfferMessages
    ?.filter(betOffer => {
      const league = leagues.find((league: any) => league.id === betOffer.leagueId)

      return !!league
    })

  if (betOffers && betOffers?.length > 0) {
    const augmentedBetOffers = Promise.all(betOffers.map(async betOffer => {
      return {
        ...betOffer,
        outcomes: await augmentOutcomes(betOffer.outcomes),
      } as BetOffer
    }))

    await sendBetOfferMessages('https://epoxy.ai/destinationqueue', await augmentedBetOffers)

    return augmentedBetOffers
  }
}
