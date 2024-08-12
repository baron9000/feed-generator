import { QueryParams,OutputSchema as AlgoOutput } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { FeedConfig } from '../config'
// max 15 chars
export const shortname = 'baron-feeds'

const keywords = [
  'anime',
  'manga',
  'photography',
  'lgbt',
  'lgbtq',
  'lgbtqia',
  'lgbtqia+',
  'photographer',
  'video games',
  'videogames',
  'gaming',
  'gamer',
  'cosplay',
  'cosplayer',
  'cosplaying',
  'comic',
  'comics',
  'arcade',
  'arcades',
  'retro games',
  'retrogaming',
  'retro gaming',
  'retrogamer',
  'retro gamer',
  'retro',
  'music',
  'musician',
  'electronic music',
  'edm',
  'synthesizer',
  'synth',
  'synths',
  'synthesizers',
  'ai',
  'artificial intelligence',
  'machine learning',
  'deep learning',
  'neural networks',
  'stablediffusion',
  'stable diffusion',
  'stable-diffusion',
  'aiart',
  'ai art',
  'sillytavern',
  'silly tavern',
  'roleplaying',
  'roleplaying games',
  'rpg',
  'dnd',
  'd&d',
  'dungeons and dragons',
  'dungeons & dragons',
  'tabletop games',
  'tabletop gaming',
  'board games',
  'board gaming',
  'warhammer',
  'warhammer 40k',
  'warhammer40k',
  'warhammer 40000',
  'warhammer40000',
  'art',
  'artist',
  'illustration',
  'digital art',
  'traditional art',
  'digital',
  'painting',
  'drawing',
  'sketch',
  'clowns',
  'clowngirl',
  'clowngirls',
]
export const feedconfig: FeedConfig = {
  feedname: shortname,
  language: 'en',
  hasimage: null,
  isreply: null,
  isreskeet: null,
  isnsfw: null,
  keywords: keywords
}

export const handler = async (ctx: AppContext, params: QueryParams): Promise<AlgoOutput> => {  
  let builder = ctx.db
    .selectFrom('post')
    .selectAll()
    .where('feedname', '=', shortname)
    .orderBy('indexedAt', 'desc')
    .orderBy('cid', 'desc')
    .limit(params.limit)

  if (params.cursor) {
    const timeStr = new Date(parseInt(params.cursor, 10)).toISOString()
    builder = builder.where('post.indexedAt', '<', timeStr)
  }
  const res = await builder.execute()

  const feed = res.map((row) => ({
    post: row.uri,
  }))

  let cursor: string | undefined
  const last = res.at(-1)
  if (last) {
    cursor = new Date(last.indexedAt).getTime().toString(10)
  }

  return {
    cursor,
    feed,
  }
}
