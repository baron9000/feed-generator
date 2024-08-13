import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { FeedConfig,FeedConfigs } from './config'
import { feedConfigs } from './algos'
import { query } from 'express';
console.debug = () => {}; //disabling debug statements for now

type PostType = {
  uri: string;
  cid: string;
  feedname: string;
  indexedAt: string;
};

type CombinedPostType = {
  uri: string;
  cid: string;
  feednames: string;
  indexedAt: string;
}
export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return
    const ops = await getOpsByType(evt)
    
    function isImageEmbed(embed: any): boolean {
      if (embed) {
        if (embed.$type === 'app.bsky.embed.images') {
          return true;
        }
      }
      return false;  
    }
    
    function matchesAnyTag(keytags: string[], tags: string[], facets: any[]): string | null {
      const lowerCaseTags = tags.map(tag => tag.toLowerCase());
      const facetTags = facets.flatMap(facet =>
        facet.features
          .filter(feature => feature.$type === 'app.bsky.richtext.facet#tag')
          .map(feature => feature.tag.toLowerCase())
      );
      for (const keyword of keytags) {
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
    async function feedFilter(feedconfig: FeedConfig) {
      const feedname = feedconfig.feedname;
      const language = feedconfig.language !== null ? feedconfig.language : null; 
      const languagePosts = ops.posts.creates.filter((create) => {
        if (language === null) {
          return true;
        }
        const isLanguage = create.record.langs && create.record.langs.includes(language);
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
        if (feedconfig.hasimage === false && hasImageEmbed) {
          return false;
        }
        if(feedconfig.hasimage === true && !hasImageEmbed) {
          return false;
        }
        const isRelevant = isTopical || hasTags;
        return isRelevant;
      });
      return topicalPosts;
    }
    async function processFeeds(feedConfigs: FeedConfigs) {
      let allPostsToCreate:PostType[] = [];
      let allPostsToDelete:string[] = [];
      for ( let feedcfg of Object.values(feedConfigs)) {
      
        const feedname = feedcfg.feedname;
        const topicalPosts = await feedFilter(feedcfg);
        const postsToDelete = ops.posts.deletes.map((del) => del.uri)
        const postsToCreate = topicalPosts.map((create) => {
          return {
            uri: create.uri,
            cid: create.cid,
            feedname: feedname,
            indexedAt: new Date().toISOString(),
          }
        
        })
        allPostsToCreate = allPostsToCreate.concat(postsToCreate);
        allPostsToDelete = allPostsToDelete.concat(postsToDelete);
      }
      
      return { allPostsToCreate, allPostsToDelete } 
    }
    //PROCESSING BEGINS HERE
    
    let allPostsToCreate:PostType[] = [];
    let allPostsToDelete:string[] = [];
    
    ({allPostsToCreate, allPostsToDelete} = await processFeeds(feedConfigs))

    const postsMap: { [key: string]: PostType[] } = {};

    allPostsToCreate.forEach(post => {
      if (!postsMap[post.uri]) {
        postsMap[post.uri] = [];
      }
      postsMap[post.uri].push(post);
    })

    const combinedPosts:CombinedPostType[] = [];
    for (const uri in postsMap) {
      const posts = postsMap[uri];
      const feednames = posts.map(post => post.feedname);
      const combinedFeednames = `['${feednames.join("','")}']`;

      const combinedPost: CombinedPostType = {
        uri: posts[0].uri,
        cid: posts[0].cid,
        feednames: combinedFeednames,
        indexedAt: posts[0].indexedAt,
      };
      combinedPosts.push(combinedPost);
    }
    if (combinedPosts.length > 0) {
      console.debug('Posts to create:', combinedPosts);
      const insertQuery = this.db
      .insertInto('post')
      .values(combinedPosts)
      .onConflict((oc) => oc.doNothing())

      const compiledInsertQuery = insertQuery.compile();
      console.debug('Compiled insert query:', compiledInsertQuery.sql, compiledInsertQuery.parameters);
      await this.db
        .insertInto('post')
        .values(combinedPosts)
        .onConflict((oc) => oc.doNothing())
        .execute()
    }
    const uniquePostsToDelete = Array.from(new Set(allPostsToDelete));
    if (uniquePostsToDelete.length > 0) {
      console.debug('Posts to delete:', uniquePostsToDelete);
        const deleteQuery = this.db
        .deleteFrom('post')
        .where('uri', 'in', uniquePostsToDelete)
      const compiledDeleteQuery = deleteQuery.compile();
      console.debug('Compiled delete query:', compiledDeleteQuery.sql, compiledDeleteQuery.parameters);  
      await deleteQuery.execute()
    }   
  }
} 
  
    
