'use strict';

const winston = require('winston');
const RssParser = require('rss-parser');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May',
  'June', 'July', 'August', 'September',
  'October', 'November', 'December'
];
const BLOG_URL = 'https://xfam.wordpress.com/category/dfam/feed/';

let blogPosts = null;
let lastUpdated = null;

const MS_PER_HOUR = 60 * 60 * 1000;
const CACHE_TIME = 6 * MS_PER_HOUR;

/**
 * Get recent Dfam blog posts.
 *
 * returns blog posts
 **/
exports.readBlogPosts = function() {
  // Return cached entries if we're within the time frame
  if (blogPosts && (new Date() - lastUpdated) < CACHE_TIME) {
    return Promise.resolve(blogPosts);
  }

  const parser = new RssParser();

  winston.debug("Making request to '" + BLOG_URL + "' for blog posts");

  return parser.parseURL(BLOG_URL).then(function(feed) {
    const articles = feed.items.map(function(item) {
      const pubDate = new Date(item.pubDate);

      return {
        title: item.title,
        link: item.link,
        date: MONTH_NAMES[pubDate.getMonth()] + ', ' + pubDate.getFullYear(),
        sortDate: pubDate,
        snippet: item.contentSnippet,
      };
    });
    articles.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

    blogPosts = articles;
    lastUpdated = new Date();
    return articles;
  });
};

