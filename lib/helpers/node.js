/*
 *  Helpers related to node standard library.
 */

var fs = require('fs');

var nodeHelpers = {

  isFunction: function (callback) {
    return callback !== undefined
      && typeof (callback) === 'function';
  },

  /**
   * Properly invoke a callback function.
   *
   * @param {Function} callback Callback function to invoke.
   */
  invoke: function (callback) {
    if (nodeHelpers.isFunction(callback) ) {
      var args = Array.prototype.slice.call(arguments, 0);
      args.shift();
      callback.apply(null, args);
    }
  },

  /**
   * Clear from the require cache, the given app path.
   *
   * @param {String} modulePath App path to clear from require cache.
   */
  clearRequireCache: function (modulePath) {
    if (fs.existsSync(modulePath) ){
      modulePath = fs.realpathSync(modulePath);
    }
    for (var name in require.cache) {
      if (name.match(new RegExp('^' + modulePath) ) ) {
        delete require.cache[name];
      }
    }
  },

  /**
   * Tells if the current process has freed
   * it s resources and thus is ready to quit properly
   */
  hasFreedResources: function () {
    /*eslint-disable */
    var handlesC = process._getActiveHandles().length;
    var requestsC = process._getActiveRequests().length;
    /*eslint-enable */
    return (handlesC + requestsC) === 0;
  },

  /**
   * Close a node server by calling each socket.destroy on close event
   *
   * @param {Object} server Server to clean.
   */
  clearCloseServer: function (server) {
    var sockets = [];
    server.on('connection', function removeSockets (socket) {
      sockets.push(socket);
      socket.on('close', function () {
        sockets.splice(sockets.indexOf(socket), 1);
      });
    });
    server.on('close', function() {
      sockets.forEach(function destroySocket (socket){
        socket.destroy();
      });
    });
  },

  /**
   *
   *
   * @param reason
   * @param timeout
   * @returns {number}
   */
  throwTimeout: function (reason, timeout) {
    return setTimeout(function(){
      throw reason;
    }, timeout)
  },

};


module.exports = nodeHelpers;
