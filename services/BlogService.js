/* eslint-disable no-unused-vars */
const Service = require('./Service');

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
* Retrieve a list of recent Dfam blog posts. This API is intended for use only at dfam.org.
*
* returns List
* */
const readBlogPosts = () => new Promise(
  async (resolve, reject) => {
    try {
      // Return cached entries if we're within the time frame
      if (blogPosts && (new Date() - lastUpdated) < CACHE_TIME) {
        resolve(Service.successResponse(blogPosts));
      }

      const parser = new RssParser();

      winston.debug("Making request to '" + BLOG_URL + "' for blog posts");

      const feed = await parser.parseURL(BLOG_URL);
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
      resolve(Service.successResponse(blogPosts));
      
    } catch (e) {
      reject(Service.rejectResponse(
        e.message || 'Invalid input',
        e.status || 405,
      ));
    }
  },
);

module.exports = {
  readBlogPosts,
};
