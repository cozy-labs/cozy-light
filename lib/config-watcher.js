/*
 * Helpers to manage action on configuration changes.
 */

var fs = require('fs-extra');
var nodeHelpers = require('./helpers/node');

module.exports = configWatcher = {

  mainWatcher: null,
  filePath: null,
  watchers: [],

  trigger: function () {
    configWatcher.watchers.forEach(nodeHelpers.invoke);
  },

  on: function (newWatcher) {
    var index = configWatcher.watchers.indexOf(newWatcher);
    if (index === -1) {
      configWatcher.watchers.push(newWatcher);
    }
  },

  off: function (watcher) {
    this.watchers.splice(configWatcher.watchers.indexOf(watcher), 1);
  },

  one: function (watcher) {
    var oner = function () {
      configWatcher.off(oner);
      nodeHelpers.invoke(watcher);
    };
    configWatcher.on(oner);
  },

  release: function () {
    if (configWatcher.filePath)
      fs.unwatchFile(configWatcher.filePath, configWatcher.trigger);
    configWatcher.watchers = [];
    configWatcher.mainWatcher = null;
  },

  init: function (filePath) {
    var options = {persistent: false, interval: 1000};
    configWatcher.filePath = filePath;
    configWatcher.mainWatcher = fs.watchFile(filePath, options, function() {
      configWatcher.trigger();
    });
  }
};

