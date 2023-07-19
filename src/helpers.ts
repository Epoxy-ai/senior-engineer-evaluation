import { ReceiveMessageCommandInput, ReceiveMessageCommandOutput } from '@aws-sdk/client-sqs'
import { createHash } from 'crypto'

import leagueInfo from '../data/league-info.json'
import playerInfo from '../data/player-info.json'
import teamInfo from '../data/team-info.json'
import betOffersRaw from '../data/bet-offer-messages.json'
import expectedOutputRaw from '../data/expected-output.json'

export const md5Hash = (str: string) => createHash('md5').update(str).digest("hex")

export const getSqsMessages = (messages: typeof betOffersRaw) => {
  let storedMessages = messages
  return async (input: Partial<ReceiveMessageCommandInput>): Promise<Partial<ReceiveMessageCommandOutput>> => {
    const messages = storedMessages.slice(0, input.MaxNumberOfMessages || 1)
    storedMessages = storedMessages.slice(input.MaxNumberOfMessages || 1)

    return {
      Messages: messages.map((msg: any, index: number) => ({
        MessageId: `${index}`,
        Body: JSON.stringify(msg),
      }))
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
