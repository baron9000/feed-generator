import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { FeedConfig,FeedConfigs } from './config'
import { feedConfigs } from './algos'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)
    
    
    function isImageEmbed(embed: any): boolean {
      return embed && embed.$type === 'AppBskyEmbedImages.Main';
    }
    
    function matchesAnyTag(keytags: string[], tags: string[], facets: any[]): string | null {
      const lowerCaseTags = tags.map(tag => tag.toLowerCase());
      const facetTags = facets.flatMap(facet =>
        facet.features
          .filter(feature => feature.$type === 'app.bsky.richtext.facet#tag')
          .map(feature => feature.tag.toLowerCase())
      );
  
      for (const keyword of keytags) {
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (facetTags.includes(keyword) || lowerCaseTags.includes(keyword)) {
          return keyword;
        }
      }
      return null
    }

    function matchesAnyKeyword(keywords: string[], text: string): string | null {
      const lowerCaseText = text.toLowerCase();
      for (const keyword of keywords) {
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (keywordRegex.test(lowerCaseText)) {
          return keyword;
        }
      }
      return null
    }

    function feedFilter(feedconfig: FeedConfig) {
      const language = feedconfig.language !== null ? feedconfig.language : null; 
      const languagePosts = ops.posts.creates.filter((create) => {
        if (language === null) {
          return true;
        }
        const isLanguage = create.record.langs && create.record.langs.includes(language);
        /*      console.log('\n\n*******language********')
        console.log('Post languages:', create.record.langs)
        console.log('Is English:', isEnglish)
        */
        return isLanguage
      });
      const topicalPosts = languagePosts.filter((create) => {
        const text = create.record.text;
        const tags = create.record.tags ? create.record.tags : [];
        const facets = create.record.facets ? create.record.facets : [];
        const reply = create.record.reply ? create.record.reply : null;
        if ( feedconfig.isreply !== false) {
          if(reply !== null) {
            return false;
          }
        }
        const keywords = feedconfig.keywords || [];
        const keytags = feedconfig.keytags || [];
        const isTopical = matchesAnyKeyword(keywords,text);
        const hasTags = matchesAnyTag(keytags,tags,facets);
        const hasImageEmbed = isImageEmbed(create.record.embed);
/*        if (isTopical) {
          
          console.log('\n\n*******Topical Post from matching:',isTopical)
          console.log('\n\n*******post********')
          console.log('fullpost:', create);
          console.log('facets:',JSON.stringify(facets,null,2));
          facets.forEach((facet,index) => {
            console.log(`Facet ${index}:`, JSON.stringify(facet, null, 2));
            if (facet.features) {
              console.log(`Features in Facet ${index}:`, JSON.stringify(facet.features, null, 2));
            }
          });
        }
*/
        if (feedconfig.hasimage === false && hasImageEmbed) {
          return false;
        }
        if(feedconfig.hasimage === true && !hasImageEmbed) {
          return false;
        }
        const isRelevant = isTopical && hasTags;
        return isRelevant;
      });
      return topicalPosts;
    }
    for ( let feedcfg of Object.values(feedConfigs)) {
      const feedname = feedcfg.feedname;
      const topicalPosts = feedFilter(feedcfg);


      const postsToCreate = topicalPosts.map((create) => {
        return {
          uri: create.uri,
          cid: create.cid,
          feedname: feedname,
          indexedAt: new Date().toISOString(),
        }
      })
    
      const postsToDelete = ops.posts.deletes.map((del) => del.uri)
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
} 
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
    
