
var fs = require('fs-extra');
var nodeHelpers = require('./node');

/*
 * Helpers to manage action when configuration file is changed.
 */
module.exports = configWatcher = {

  /* Config file watcher */
  mainWatcher: null,
  /* Config file path */
  filePath: null,
  /* Function to run on file changes. */
  watchers: [],

  /*
   *  Run all set watchers.
   */
  trigger: function () {
    configWatcher.watchers.forEach(nodeHelpers.invoke);
  },

  /*
   * Add a watcher to the watcher list (do not add twice the same watcher).
   */
  on: function (newWatcher) {
    var index = configWatcher.watchers.indexOf(newWatcher);
    if (index === -1) {
      configWatcher.watchers.push(newWatcher);
    }
  },

  /*
   * Remove watcher from watcher list.
   */
  off: function (watcher) {
    this.watchers.splice(configWatcher.watchers.indexOf(watcher), 1);
  },

  /*
   * Add a watcher that will be run once (discared after first run).
   */
  one: function (watcher) {
    var oner = function () {
      configWatcher.off(oner);
      nodeHelpers.invoke(watcher);
    };
    configWatcher.on(oner);
  },

  /*
   * Stop watching configuration file.
   */
  release: function () {
    if (configWatcher.filePath)
      fs.unwatchFile(configWatcher.filePath, configWatcher.trigger);
    configWatcher.watchers = [];
    configWatcher.mainWatcher = null;
  },

  /*
   * Start watching given file.
   */
  init: function (filePath) {
    var options = {persistent: false, interval: 1000};
    configWatcher.filePath = filePath;
    configWatcher.mainWatcher = fs.watchFile(filePath, options, function() {
      configWatcher.trigger();
    });
  }
};

