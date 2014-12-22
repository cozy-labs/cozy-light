/*
 * Helpers to manage action on configuration changes.
 */
var configWatcher = function (path){

  var pW = {

    mainWatcher: null,
    watchers: [],

    trigger: function () {
      this.watchers.forEach(function (watcher) {
        watcher();
      });
    },

    on: function (newWatcher) {
      var index = this.watchers.indexOf(newWatcher);
      if (index === -1) { this.watchers.push(newWatcher); }
    },

    off: function (watcher) {
      this.watchers.splice(this.watchers.indexOf(watcher), 1);
    },

    one: function (watcher) {
      var oner = function () {
        configWatcher.off(oner);
        if (watcher !== undefined && typeof(watcher) === 'function') {
          watcher();
        }
      };
      configWatcher.on(oner);
    }
  };

  var options = {persistent: false, interval: 1000};
  pW.mainWatcher = fs.watchFile(
    path, options, pW.trigger
  );

  return pW;
};
module.exports = configWatcher;