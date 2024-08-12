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
    
    /*for (const post of ops.posts.creates) {
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
    }*/
    
    function isImageEmbed(embed: any): boolean {
      return embed && embed.$type === 'AppBskyEmbedImages.Main';
    }
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
      'warhammer40000'
    ]

    function matchesAnyKeyword(text: string, tags: string[]): string | null {
      const lowerCaseText = text.toLowerCase();
      const lowerCaseTags = tags.map(tag => tag.toLowerCase());
      for (const keyword of keywords) {
        if (lowerCaseText.includes(keyword) || lowerCaseTags.includes(keyword)) {
          return keyword;
        }
      }
      return null
    }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    
    const englishPosts = ops.posts.creates.filter((create) => {
      const isEnglish = create.record.langs && create.record.langs.includes('en');
      console.log('\n\n*******language********')
      console.log('Post languages:', create.record.langs)
      console.log('Is English:', isEnglish)
      return isEnglish
  })

  const topicalPosts = englishPosts.filter((create) => {
    const text = create.record.text;
    const tags = create.record.tags ? create.record.tags : [];
    console.log('\n\n*******topics********')
    console.log('Processing post:', create);
    console.log('Text:', text);
    console.log('Tags:', tags);
    const isTopical = matchesAnyKeyword(text, tags);
    const hasImageEmbed = isImageEmbed(create.record.embed);
    if (isTopical) {
      console.log('\n\n*******Topical Post from matching:',isTopical)
    }
    return isTopical;
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
