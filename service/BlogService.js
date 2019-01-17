'use strict';

const RssParser = require('rss-parser');

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May',
                     'June', 'July', 'August', 'September',
                     'October', 'November', 'December' ];
/**
 * Get recent Dfam blog posts.
 *
 * returns blog posts
 **/
exports.readBlogPosts = function() {
  const BLOG_URL = 'https://xfam.wordpress.com/category/dfam/feed/'

  const parser = new RssParser();

  return parser.parseURL(BLOG_URL).then(function(feed) {
    const articles = feed.items.map(function(item) {
      const pubDate = new Date(item.pubDate);
      console.log(item);

      return {
        title: item.title,
        link: item.link,
        date: MONTH_NAMES[pubDate.getMonth()] + ', ' + pubDate.getFullYear(),
        sortDate: pubDate,
        snippet: item.contentSnippet,
      };
    });
    articles.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
    return articles;
  });
};

