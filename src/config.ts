import { Database } from './db'
import { DidResolver } from '@atproto/identity'

export type AppContext = {
  db: Database
  didResolver: DidResolver
  cfg: Config
}

export type Config = {
  port: number
  listenhost: string
  hostname: string
  sqliteLocation: string
  subscriptionEndpoint: string
  serviceDid: string
  publisherDid: string
  subscriptionReconnectDelay: number
}

export interface FeedConfig {
  feedname: string
  language: string | null
  hasimage: boolean | null
  isreply: boolean | null
  isreskeet: boolean | null
  isnsfw: boolean | null
  keywords: string[] | null
  keytags: string[] | null
}
export type FeedConfigs = FeedConfig[]
