/*
 * Helpers to manage action on configuration changes.
 */
var configWatcher = module.exports = {

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
