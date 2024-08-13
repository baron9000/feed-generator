import { QueryParams,OutputSchema as AlgoOutput } from '../lexicon/types/app/bsky/feed/getFeedSkeleton'
import { AppContext } from '../config'
import { FeedConfig } from '../config'
// max 15 chars
export const shortname = 'blender-feed'
const keytags = [
  'blender',
  '3dmodeling',
  '3dmodel',
  '3dmodeler',
  '3dmodelers',
  '3drender',
  '3drendering',
  '3danimation',
  '3dmodelingandanimation',
  '3dmodeling&animation',
  '3dmodelinganimation',
  'maya',
  '3dsmax',
  'blender3d', 
  'blendercycles', 
  'blenderrender', 
  'blenderartists',  
  'blendercommunity',
  'blenderart',
  '3dart'
]
const keywords = [
  'blender',
  '3d studio max',
  '3d modeling',
  '3dmodeling',
  '3dmodel',
  '3dmodeler',
  '3d modeler',
  '3dmodelers',
  '3d modelers',
  '3drender',
  '3d render',
  '3drendering',
  '3d rendering',
  '3danimation',
  '3d animation',
  '3dmodelingandanimation',
  '3d modeling and animation',
  '3dmodeling&animation',
  '3d modeling & animation',
  '3dmodelinganimation',
  '3d modeling animation',
  'maya',
  '3dsmax',
  '3ds max',
  'blender3d',
  'blender 3d',
  'blendercycles',
  'blender cycles',
  'blenderrender',
  'blender render',
  'blenderartists',
  'blender artists',
  'blendercommunity',
  'blender community',
  'blenderart',
  'blender art',
  '3d art',
  '3dart'
]
const neededtags = null;
const unwantedtags = [
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
  'pornart',
]
export const feedconfig: FeedConfig = {
  feedname: shortname,
  language: 'en',
  hasimage: true,
  isreply: null,
  isreskeet: null,
  isnsfw: null,
  keywords: keywords,
  keytags: keytags,
  neededtags: neededtags,
  unwantedtags: unwantedtags
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
