/*
 * Helpers to manage action on configuration changes.
 */

var fs = require('fs-extra');
var nodeHelpers = require('./node-helpers');


var configWatcher = function (path){

  var instance = {

    mainWatcher: null,
    watchers: [],

    trigger: function () {
      instance.watchers.forEach(nodeHelpers.invoke);
    },

    on: function (newWatcher) {
      var index = instance.watchers.indexOf(newWatcher);
      if (index === -1) {
        instance.watchers.push(newWatcher);
      }
    },

    off: function (watcher) {
      this.watchers.splice(instance.watchers.indexOf(watcher), 1);
    },

    one: function (watcher) {
      var oner = function () {
        instance.off(oner);
        nodeHelpers.invoke(watcher);
      };
      instance.on(oner);
    },

    release: function () {
      fs.unwatchFile(path, instance.trigger);
      instance.watchers = [];
      instance.mainWatcher = null;
    }
  };

  var options = {persistent: false, interval: 1000};
  instance.mainWatcher = fs.watchFile(
    path, options, instance.trigger
  );

  return instance;
};
module.exports = configWatcher;
