/* eslint-disable no-unused-vars */
const Service = require('./Service');

/**
* Retrieve a list of recent Dfam blog posts. This API is intended for use only at dfam.org.
* Retrieve a list of recent Dfam blog posts. This API is intended for use only at dfam.org.
*
* returns List
* */
const readBlogPosts = () => new Promise(
  async (resolve, reject) => {
    try {
      resolve(Service.successResponse({
      }));
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
