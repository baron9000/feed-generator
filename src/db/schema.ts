export type DatabaseSchema = {
  post: Post
  sub_state: SubState
}

export type Post = {
  uri: string
  cid: string
  feedname: string
  indexedAt: string
}

export type SubState = {
  service: string
  cursor: number
}
