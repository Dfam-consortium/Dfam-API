'use strict';

var APIResponse = require('../utils/response.js').APIResponse;
var Blog = require('../service/BlogService');

module.exports.readBlogPosts = function readBlogPosts (req, res, next) {
  Blog.readBlogPosts()
    .then(function (response) {
      return new APIResponse(response).respond(req, res);
    })
    .catch(function (err) {
      next(err);
    });
};
