import { AppContext,FeedConfig,FeedConfigs } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import * as baronfeeds from './baronfeeds'
import * as nsfwfeeds from './nsfwfeeds'
import * as blenderfeeds from './blenderfeeds'

const feedConfigs: FeedConfigs = [ 
  baronfeeds.feedconfig, 
  nsfwfeeds.feedconfig,
  blenderfeeds.feedconfig,
]

type AlgoHandler = (ctx: AppContext, params: QueryParams) => Promise<AlgoOutput>

const algos: Record<string, AlgoHandler> = {
  [baronfeeds.shortname]: baronfeeds.handler,
  [nsfwfeeds.shortname]: nsfwfeeds.handler,
  [blenderfeeds.shortname]: blenderfeeds.handler,
}

export {algos, feedConfigs}

