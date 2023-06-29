class Service {
  static rejectResponse(error, code = 500) {
    return { error, code };
  }

  /* A successful response should come in as an object
   * with a payload property and optionally additional
   * properties to use in the response headers.
   *    e.g.
   *        obj = { payload: "This is some text",
   *                content_type: "text/plain"
   *              };
   * See ../controllers/Controller.js for supported
   * properties.
   */
  static successResponse(obj, code = 200) {
    obj.code = code;
    return obj;
  }
}

module.exports = Service;
