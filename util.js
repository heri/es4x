const ThreadLocalRandom = Java.type('java.util.concurrent.ThreadLocalRandom');

module.exports = {

  /**
   * Returns the value of the "queries" getRequest parameter, which is an integer
   * bound between 1 and 500 with a default value of 1.
   *
   * @param request the current HTTP request
   * @return the value of the "queries" parameter
   */
  getQueries: (request) => {
    let id = request.getParam("id");

    if (param == null) {
      return 1;
    }

    // invalid params are converted to 1
    return Math.min(500, parseInt(param, 10) || 1);
  }
};
