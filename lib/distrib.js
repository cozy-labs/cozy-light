var async = require('async');

var logger = require('./helpers/logger');
var distros = require('../distros.json');


module.exports = {

  /**
   * Install a full suite of application and plugins listed in given distro.
   *
   * @param {String} distroName The name of the distribution to install.
   */
  installDistro: function (distroName, actions, callback) {
    if (distros[distroName] !== undefined) {
      var distro = distros[distroName];
      logger.info('Installing plugins...');
      async.eachSeries(distro.plugins, function addPlugin (pluginName, cb) {
        actions.installPlugin(pluginName, cb);
      }, function installApps (err) {
        if (err) {
          callback(err);
        } else {
          logger.info('Installing apps...');
          async.eachSeries(distro.apps, function addApp (appName, cb) {
            actions.installApp(appName, cb);
          }, callback);
        }
      });
    } else {
      throw new Error('Unknown distro, can\'t install it');
    }
  },


  /**
   * Display all available distros in the console.
   */
  displayDistros: function () {
    Object.keys(distros || {}).forEach(this.displayDistro);
  },

  /**
   * Display given distro plugins and apps.
   *
   * @param {String} distroName The name of the distribution to display.
   */
  displayDistro: function (distroName) {
    logger.raw('\n\x1B[36m* ' + distroName + '\x1B[39m');

    var logAttributeList = function (key) {
      logger.raw('    \x1B[32m' + key + ':\x1B[39m');
      var list = distros[distroName][key];
      if (list !== undefined && list.length > 0) {
        list.forEach(function displayListElement (keyName) {
          logger.raw('        - ' + keyName.split('/')[1]);
        });
      } else {
        logger.raw('        no ' + key);
      }
    };

    logAttributeList('plugins');
    logAttributeList('apps');
  }

};
