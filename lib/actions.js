
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var symbols = require('symbolsjs');
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var printit = require('printit');
var nodeHelpers = require('./node-helpers');
var distrib = require('./distrib');

module.exports = function(cozyLight){

  var npmHelpers = cozyLight.npmHelpers;
  var configHelpers = cozyLight.configHelpers;
  var pluginHelpers = cozyLight.pluginHelpers;
  var mainAppHelper = cozyLight.mainAppHelper;
  var mutexer = cozyLight.mutexer;
  var applicationHelpers = cozyLight.applicationHelpers;
  var LOGGER = cozyLight.logger;


  var server = null;
  var expressLog = false;

  var ActionsEventter = function(){};
  var EventEmitter = require('events').EventEmitter;
  require('util').inherits(ActionsEventter, EventEmitter);
  var actionsEvent = new ActionsEventter();

  var actions = {

    /**
     * Tells the status of Cozy light program
     * started : when Cozy light is up and running.
     * stopped : when Cozy light is not running.
     *
     * @return {String} The status of Cozy light.
     */
    status: function () {
      var mutexPath = configHelpers.getHomePath();
      mutexPath = pathExtra.join(mutexPath, 'mutex');
      if ( fs.existsSync(mutexPath) ) {
        return 'started';
      }
      return 'stopped';
    },

    /**
     * Apply plugin customatisation on server. Then get all installed app
     * modules. Expect that a start function is available, then run the app
     * server on given port. Ports are expected to be available.
     *
     * @param {Object} program The command line options.
     * @param {Function} callback Termination.
     */
    start: function (program, callback) {

      var startSeq = function () {

        // write mutex file
        if (cozyLight.mutexer.exists() == false ) {
          cozyLight.mutexer.write();
        }

        // start app
        var app = express();
        var morgand = morgan('combined');
        if (expressLog) {
          app.use(morgand);
        }

        pluginHelpers.startAll(program, app, function(){
          mainAppHelper.start(app);
          applicationHelpers.startAll(function() {

            // always connect it after the proxy
            // https://github.com/nodejitsu/node-http-proxy/issues/180
            var jsonParser = bodyParser.json();
            var urlencodedParser = bodyParser.urlencoded({ extended: false });
            app.use(urlencodedParser);
            app.use(jsonParser);

            cozyLight.status = 'started';

            nodeHelpers.invoke(callback, null, app, server);
          });
        });
      };

      // check for existing mutex
      if ( mutexer.exists() && !mutexer.amIMaster() ) {
        LOGGER.info('Mutex file does not match this process.');
        // it is the children
        if ( program.force === true ) {
          LOGGER.info('Killing Cozy light.');
          // let s kill possibly living process parent, then start
          mutexer.remove();
          mutexer.killMaster(function(){
            startSeq();
          });
        } else {
          LOGGER.info('Cozy light is already running.');
          // cancel start, keep using current master
          throw 'I won t start if another instance is running, please use: cozy-light start -f';
        }
      } else {
        // normal sequence
        startSeq();
      }
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
          apporplugin +
          ' cannot find it in the config file.');
      }
    },

    /**
     * Mark given app or plugin as disabled. It won't be activated or started
     * in that case.
     */
    disable: function (apporplugin) {
      try {
        configHelpers.disable(apporplugin);
        LOGGER.info(apporplugin + ' disabled');
      } catch (err) {
        LOGGER.error(
          'Cannot disable given app or plugin, ' +
          apporplugin +
          ' cannot find it in the config file.');
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
      applicationHelpers.stopAll(function (appErr) {
        if (appErr) {
          LOGGER.error('An error occurred while stopping applications');
          LOGGER.raw(appErr);
        }

        LOGGER.info('Stopping plugins...');
        pluginHelpers.stopAll(function (pluginErr) {
          if (pluginErr) {
            LOGGER.error('An error occurred while stopping plugins');
            LOGGER.raw(pluginErr);
          }

          LOGGER.info('Stopping server...');
          mainAppHelper.stop(function(){
            LOGGER.info('\t' + symbols.ok + '\tmain server');
            cozyLight.status = 'stopped';
            nodeHelpers.invoke(callback);
          });
        });
      });
    },

    /**
     * Stops application server, its apps, and its plugins,
     * reload everyone, then restart everyone
     */
    restart: function (program, callback) {
      LOGGER.info('Restarting...');
      actions.stop(function(){
        configHelpers.loadConfigFile();
        cozyLight.routes = {};
        LOGGER.info('Starting all apps...');
        actions.start(program, function(){
          LOGGER.info('...Cozy Light was properly restarted.');
          nodeHelpers.invoke(callback);
          actionsEvent.emit('restarted');
        });
      });
    },

    /**
     * App names correspond to Github repo.
     * An app name is composed of a user name
     * and a repository name.
     * Installation starts by fetching the manifest
     * from the repository (package.json located at the root).
     * Then it installs sources and
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
          nodeHelpers.invoke(callback, err);
        } else {
          LOGGER.info(app + ' installed. Enjoy!');
          configHelpers.watcher.one(callback);
          configHelpers.addApp(app, manifest);
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
            nodeHelpers.invoke(callback, err);
          } else {
            LOGGER.info(app + ' successfully uninstalled.');
            configHelpers.watcher.one(callback);
            configHelpers.removeApp(app);
          }
        });
      }
    },

    /**
     * Plugin names correspond to Github repo.
     * A plugin name is composed of
     * a user name and a repository name.
     * Installation starts by fetching
     * the manifest from the repository
     * (package.json located at the root).
     * Then it installs sources and
     * dependencies in the cozy-light folder.
     *
     * @param {String} plugin Plugin to install
     *                        (ex: cozy-labs/cozy-light-docker).
     * @param {Function} callback Termination.
     */
    installPlugin: function (plugin, callback) {
      LOGGER.info('Installing plugin ' + plugin + '...');
      npmHelpers.fetchInstall(plugin, function addPlugin (err, manifest) {
        if (err) {
          LOGGER.raw(err);
          LOGGER.error('Cannot find given plugin manifest.');
          LOGGER.error('Make sure it lives on Github');
          LOGGER.error('or in the given directory.');
          LOGGER.error(plugin + ' installation failed.');
          nodeHelpers.invoke(callback, err);
        } else {
          LOGGER.info(plugin + ' installed. Enjoy!');
          configHelpers.watcher.one(function(){
            pluginHelpers.loadPlugin(plugin);
            nodeHelpers.invoke(callback);
          });
          configHelpers.addPlugin(plugin, manifest);
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
            nodeHelpers.invoke(callback, err);
          } else {
            LOGGER.info(plugin + ' successfully uninstalled.');
            pluginHelpers.stop(plugin, function(){
              pluginHelpers.unloadPlugin(plugin);
              configHelpers.watcher.one(callback);
              configHelpers.removePlugin(plugin);
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
              nodeHelpers.invoke(callback, err);
            } else {
              LOGGER.info('Distribution ' + distro + 'successfully installed');
              nodeHelpers.invoke(callback);
            }
          });
        } catch (err) {
          LOGGER.raw(err);
          LOGGER.error('An error occurred while installing your distribution');
        }
      } else {
        LOGGER.info(
          'install-distro requires a distro name, ' +
          'here are the ones available:');
        distrib.displayDistros();
      }
    },

    /**
     * Display configuration file contents:
     * apps configuration and user settings.
     */
    displayConfig: function () {
      LOGGER.raw(JSON.stringify(configHelpers.loadConfigFile(), null, 2));
    },

    on: function(){
      return actionsEvent.on.apply(actionsEvent, arguments);
    },
    off: function(){
      return actionsEvent.off.apply(actionsEvent, arguments);
    },
    once: function(){
      return actionsEvent.once.apply(actionsEvent, arguments);
    }
  };

  return actions;
};
