
var symbols = require('symbolsjs');
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var express = require('express');
var bodyParser = require('body-parser');
var Pouchdb = require('pouchdb');
var morgan = require('morgan');
var printit = require('printit');
var distrib = require('./distrib');
const LOGGER = printit({ prefix: 'Cozy Light' });

module.exports = function(cozyLight,
                          configWatcher){

  var npmHelpers = cozyLight.npmHelpers;


  var configPath = '';
  var loadedApps = {};
  var config = null;
  var server = null;
  var db = null;
  var expressLog = false;

  var actions = {

    /**
     * Apply plugin customatisation on server. Then get all installed app
     * modules. Expect that a start function is available, then run the app
     * server on given port. Ports are expected to be available.
     *
     * @param {Object} program The command line options.
     * @param {Function} callback Termination.
     */
    start: function (program, callback) {
      var config = configHelpers.getConfig();
      var app = express();
      var morgand = morgan('combined');
      if (expressLog) {
        app.use(morgand);
      }

      config.pouchdb = Pouchdb;

      pluginHelpers.startAll(program, app, function(){
        mainAppHelper.start(app);
        applicationHelpers.startAll(db, function() {

          // always connect it after the proxy
          // https://github.com/nodejitsu/node-http-proxy/issues/180
          var jsonParser = bodyParser.json();
          var urlencodedParser = bodyParser.urlencoded({ extended: false });
          app.use(urlencodedParser);
          app.use(jsonParser);

          if(configWatcher.mainWatcher === undefined) {
            var watchOptions = {persistent: false, interval: 1000};
            var onConfigChanged = function () {
              LOGGER.info('Config changed...');
              configWatcher.trigger();
            };
            configWatcher.mainWatcher = fs.watchFile(
              configPath,
              watchOptions,
              onConfigChanged
            );
          }

          // Reload apps when file configuration is modified
          configWatcher.on(actions.restart);
          if (callback !== undefined && typeof(callback) === 'function') {
            callback(null, app, server);
          }
        });
      });
    },

    /**
     * Remove disabled mark from config file for given app or plugin.
     */
    enable: function (apporplugin) {
      try {
        configHelpers.enable(apporplugin);
        LOGGER.info(apporplugin + ' enabled');
      } catch (err) {
        LOGGER.error(
          'Cannot enable given app or plugin, ' +
          'cannot find it in the config file.');
      }
    },

    /**
     * Mark given app or plugin as disabled. It won't be activated or started
     * in that case.
     */
    disable: function (appormodule) {
      try {
        configHelpers.disable(appormodule);
        LOGGER.info(appormodule + ' disabled');
      } catch (err) {
        LOGGER.error(
          'Cannot disable given app or plugin, ' +
          'cannot find it in the config file.');
        LOGGER.raw(err);
      }
    },

    /**
     * Stop all running applications.
     *
     * @param {Function} callback Termination.
     */
    stop: function (callback) {
      LOGGER.info('Stopping apps...');
      applicationHelpers.stopAll(function (err) {
        if (err) {
          LOGGER.error('An error occured while stopping applications');
          LOGGER.raw(err);
        }

        LOGGER.info('Stopping plugins...');
        pluginHelpers.stopAll(function (err) {
          if (err) {
            LOGGER.error('An error occured while stopping plugins');
            LOGGER.raw(err);
          }

          LOGGER.info('Stopping server...');
          mainAppHelper.stop(function(){
            LOGGER.info('\t' + symbols.ok + '\tmain server');
            if (callback) { callback(); }
          });
        });
      });
    },

    /**
     * Stops application server, its apps, and its plugins,
     * reload everyone, then restart everyone
     */
    restart: function (callback) {
      LOGGER.info('Restarting...');
      actions.stop(function(){
        configHelpers.loadConfigFile();
        loadedApps = {};
        routes = {};
        LOGGER.info('Starting all apps...');
        actions.start(program, function(){
          LOGGER.info('...Cozy Light was properly restarted.');
          if (callback) { callback(); }
        });
      });
    },

    /**
     * Manage properly exit of the process when SIGINT signal is triggered.
     * It asks to every plugin to end properly.
     */
    exit: function (callback) {
      actions.stop(function endProcess (err) {
        if (err) {
          LOGGER.error('Cozy Light was not properly terminated.');
        } else {
          LOGGER.info('Cozy Light was properly terminated.');
        }

        if (db) {
          try {
            if(!db._closed) {
              db.close();
            }
          } catch (err) {
            LOGGERR.error(err);
          }
        }

        if (callback !== undefined) {
          callback();
        }
      });
    },

    /**
     * Manage properly exit of the process when SIGINT signal is triggered.
     * It asks to every plugin to end properly.
     */
    exitNow: function () {
      actions.exit(function killProcess (err) {
        LOGGER.info('Killing process.');

        /*eslint-disable */
        var handlesC = process._getActiveHandles().length;
        var requestsC = process._getActiveRequests().length;
        /*eslint-enable */
        if (process.env.DEBUG !== undefined && (handlesC + requestsC > 0)){
          LOGGER.info('Has remaining open handles...');
          LOGGER.info('_getActiveHandles ' + handlesC);
          LOGGER.info('_getActiveRequests ' + requestsC);
        }
        /*eslint-disable */
        process.exit(err ? 1 : 0);
        /*eslint-enable */
      });
    },

    /**
     * App names correspond to Github repo. An app name is composed of a user name
     * and a repository name.
     * Installation starts by fetching the manifest from the repository
     * (package.json located at the root). Then it installs sources and
     * dependencies in the cozy-light folder.
     *
     * @param {String} app App to install (ex: cozy-labs/calendar).
     * @param {Function} callback Termination.
     */
    installApp: function (app, callback) {
      LOGGER.info('Installing app ' + app + '...');
      npmHelpers.fetchInstall(app, function addAppToConfig (err, manifest) {
        if (err) {
          LOGGER.raw(err);
          LOGGER.error('Cannot find given app manifest.');
          LOGGER.error('Make sure it lives on Github');
          LOGGER.error('or in the given directory.');
          LOGGER.error(app + ' installation failed.');
          callback(err);
        } else {
          LOGGER.info(app + ' installed. Enjoy!');
          if (configWatcher.mainWatcher !== undefined) {
            configWatcher.one(callback);
          }
          configHelpers.addApp(app, manifest);
          if (configWatcher.mainWatcher === undefined
            && callback !== undefined && typeof(callback) === 'function') {
            callback();
          }
        }
      });
    },

    /**
     * Remove app from config and its source from node module folder.
     *
     * @param {String} app App to uninstall.
     * @param {Function} callback Termination.
     */
    uninstallApp: function (app, callback) {
      var config = configHelpers.getConfig();
      LOGGER.info('Uninstalling ' + app + '...');
      if (config.apps[app] === undefined) {
        LOGGER.error(app + ' is not installed.');
      } else {
        var module = config.apps[app].name;
        npmHelpers.uninstall(module, function removeAppFromConfig (err) {
          if (err) {
            LOGGER.raw(err);
            LOGGER.error('npm did not uninstall ' + app + ' correctly.');
            callback(err);
          } else {
            delete loadedApps[app];
            LOGGER.info(app + ' successfully uninstalled.');
            if (configWatcher.mainWatcher !== undefined) {
              configWatcher.one(callback);
            }
            configHelpers.removeApp(app);
            if (configWatcher.mainWatcher === undefined
              && callback !== undefined && typeof(callback) === 'function') {
              callback();
            }
          }
        });
      }
    },

    /**
     * Plugin names correspond to Github repo. A plugin name is composed of a user
     * name and a repository name.
     * Installation starts by fetching the manifest from the repository
     * (package.json located at the root). Then it installs sources and
     * dependencies in the cozy-light folder.
     *
     * @param {String} plugin Plugin to install (ex: cozy-labs/cozy-light-docker).
     * @param {Function} callback Termination.
     */
    installPlugin: function (plugin, callback) {
      LOGGER.info('Installing plugin ' + plugin + '...');
      npmHelpers.fetchInstall(plugin, function addPluginToConfig (err, manifest) {
        if (err) {
          LOGGER.raw(err);
          LOGGER.error('Cannot find given plugin manifest.');
          LOGGER.error('Make sure it lives on Github');
          LOGGER.error('or in the given directory.');
          LOGGER.error(plugin + ' installation failed.');
          callback(err);
        } else {
          LOGGER.info(plugin + ' installed. Enjoy!');
          if (configWatcher.mainWatcher !== undefined) {
            configWatcher.one(callback);
          }
          configHelpers.addPlugin(plugin, manifest);
          pluginHelpers.loadPlugin(plugin);
          if (configWatcher.mainWatcher === undefined
            && callback !== undefined && typeof(callback) === 'function') {
            callback();
          }
        }
      });
    },

    /**
     * Remove plugin from config and its source from node module folder.
     *
     * @param {String} plugin Plugin to remove.
     * @param {Function} callback Termination.
     */
    uninstallPlugin: function (plugin, callback){
      var config = configHelpers.getConfig();
      LOGGER.info('Removing ' + plugin + '...');
      if (config.plugins[plugin] === undefined) {
        LOGGER.error(plugin + ' is not installed.');
      } else {
        var module = config.plugins[plugin].name;
        npmHelpers.uninstall(module, function removePluginFromConfig (err) {
          if (err) {
            LOGGER.raw(err);
            LOGGER.error('npm did not uninstall ' + plugin + ' correctly.');
            callback(err);
          } else {
            LOGGER.info(plugin + ' successfully uninstalled.');
            pluginHelpers.stop(plugin,function(){
              pluginHelpers.unloadPlugin(plugin);
              if (configWatcher.mainWatcher !== undefined) {
                configWatcher.one(callback);
              }
              configHelpers.removePlugin(plugin);
              if (configWatcher.mainWatcher === undefined
                && callback !== undefined && typeof(callback) === 'function') {
                callback();
              }
            });
          }
        });
      }
    },

    installDistro: function (distro, callback) {
      if (distro !== undefined && distro !== '') {
        try {
          LOGGER.info('Start distribution installation for ' + distro);
          distrib.installDistro(distro, actions, function(err) {
            if (err) {
              LOGGER.raw(err.message);
              LOGGER.error(
                'An error occured while installing your distribution');
              if (callback !== undefined && typeof(callback) === 'function') {
                callback(err);
              }
            } else {
              LOGGER.info('Distribution ' + distro + 'successfully installed');
              if (callback !== undefined && typeof(callback) === 'function') {
                callback();
              }
            }
          });
        } catch (err) {
          console.log(err);
          LOGGER.error('An error occured while installing your distribution');
        }
      } else {
        LOGGER.info(
          'install-distro requires a distro name, here are the ones avalaible:');
        distrib.displayDistros();
      }
    },

    /**
     * Display configuration file contents: apps configuration and user settings.
     */
    displayConfig: function () {
      LOGGER.raw(JSON.stringify(configHelpers.loadConfigFile(), null, 2));
    }
  };

  return actions;
};
