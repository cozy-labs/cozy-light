/*
 * Helpers to manage action on configuration changes.
 */

var fs = require('fs-extra');


var configWatcher = function (path){

  var pW = {

    mainWatcher: null,
    watchers: [],

    trigger: function () {
      pW.watchers.forEach(function (watcher) {
        watcher();
      });
    },

    on: function (newWatcher) {
      var index = pW.watchers.indexOf(newWatcher);
      if (index === -1) { pW.watchers.push(newWatcher); }
    },

    off: function (watcher) {
      this.watchers.splice(pW.watchers.indexOf(watcher), 1);
    },

    one: function (watcher) {
      var oner = function () {
        pW.off(oner);
        if (watcher !== undefined && typeof(watcher) === 'function') {
          watcher();
        }
      };
      pW.on(oner);
    }
  };

  var options = {persistent: false, interval: 1000};
  pW.mainWatcher = fs.watchFile(
    path, options, pW.trigger
  );

  return pW;
};
module.exports = configWatcher;