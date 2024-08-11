import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)

    //grab some samples to know what records look like without digging through code
    for (const post of ops.posts.creates) {
      console.log(post.record)
      if (post.record.facets) {
          for (const facet of post.record.facets) {
            console.log('Facet:', facet)
            if (facet.index) {
              console.log('Index:', facet.index)
            }
            if (facet.features) {
              console.log('Features:', facet.features)
            }
          }
      }
    }
    function isImageEmbed(embed: any): boolean {
      return embed && embed.$type === 'AppBskyEmbedImages.Main';
    }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    
    const englishPosts = ops.posts.creates.filter((create) => {
      const isEnglish = create.record.langs && create.record.langs.includes('en');
      if (isEnglish) {
        console.log('English post:', create)
      }
      return isEnglish
  })

  const topicalPosts = englishPosts.filter((create) => {
    const text = create.record.text.toLowerCase();
    const tags = create.record.tags ? create.record.tags.map(tag => tag.toLowerCase()) : [];
    const matchesTopic = text.includes('anime') || text.includes('manga') || text.includes('photography');
    const hasNsfwTag = tags.includes('nsfw');
    const isTopical = matchesTopic && (hasNsfwTag || text.includes('nsfw'));
    const hasImageEmbed = isImageEmbed(create.record.embed);
    if (isTopical && hasImageEmbed) {
      console.log('Topical Post:', create);
    }
    return isTopical && hasImageEmbed;
  });
 
  const postsToCreate = topicalPosts.map((create) => {
      return {
        uri: create.uri,
        cid: create.cid,
        indexedAt: new Date().toISOString(),
      }
    })

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom('post')
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
  }
}
