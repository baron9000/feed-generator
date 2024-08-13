import { QueryParams,OutputSchema as AlgoOutput } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { FeedConfig } from '../config'
// max 15 chars
export const shortname = 'nfsw-art'
const keytags = [
  'anime',
  'manga',
  'photography',
  'cosplay',
  'cosplayer',
  'cosplaying',
  'comic',
  'comics',
  'ai',
  'stablediffusion',
  'stable diffusion',
  'stable-diffusion',
  'aiart',
  'ai art',
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
  'nsfw',
  'nsfwart',
  'nsfw art',
  'nsfwartist',
  'nsfw artist',
  'waifu',
  'waifus',
  'hentai',
  'ecchi',
  'lewd',
  'lewdart',
  'lewd art',
  'r18',
  'rule34',
  'rule 34',
  'porn',
  'pornart'
]
const keywords = [
  'anime',
  'manga',
  'photography',
  'cosplay',
  'cosplayer',
  'cosplaying',
  'comic',
  'comics',
  'ai',
  'stablediffusion',
  'stable diffusion',
  'stable-diffusion',
  'aiart',
  'ai art',
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
  'nsfw',
  'nsfwart',
  'nsfw art',
  'nsfwartist',
  'nsfw artist',
  'waifu',
  'waifus',
  'hentai',
  'ecchi',
  'lewd',
  'lewdart',
  'lewd art',
  'r18',
  'rule34',
  'rule 34',
  'porn',
  'pornart'
]
export const feedconfig: FeedConfig = {
  feedname: shortname,
  language: 'en',
  hasimage: true,
  isreply: null,
  isreskeet: null,
  isnsfw: null,
  keywords: keywords,
  keytags: keytags
}

export const handler = async (ctx: AppContext, params: QueryParams): Promise<AlgoOutput> => {  
  let builder = ctx.db
    .selectFrom('post')
    .selectAll()
    .where('feednames', 'like', `%'${shortname}'%`)
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
