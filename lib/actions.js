var symbols = require('symbolsjs');
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');

var logger = require('./helpers/logger');
var nodeHelpers = require('./helpers/node');
var npmHelpers = require('./helpers/npm');
var distrib = require('./distrib');
var configHelpers = require('./config');
var pluginHelpers = require('./plugins');
var mainAppHelper = require('./main');
var applicationHelpers = require('./applications');

var server = null;
var expressLog = false; // @todo need a way to configure from outside

var ActionsEmitter = require('events').EventEmitter;
var actionsEvent = new ActionsEmitter();


module.exports = actions = {

  /**
   * Apply plugin customatisation on server. Then get all installed app
   * modules. Expect that a start function is available, then run the app
   * server on given port. Ports are expected to be available.
   *
   * @param {Object} program The command line options.
   * @param {Function} callback Termination.
   */
  start: function (program, callback) {
    var cozyLight = require('./cozy-light');

    applicationHelpers.resetDefaultPort();
    cozyLight.setStarted();

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
        var urlencodedParser = bodyParser.urlencoded({extended: false});
        app.use(urlencodedParser);
        app.use(jsonParser);
        nodeHelpers.invoke(callback, null, app, server);
      });
    });
  },

  /**
   * Remove disabled mark from config file for given app or plugin.
   */
  enable: function (apporplugin) {
    try {
      configHelpers.enable(apporplugin);
      logger.info(apporplugin + ' enabled');
    } catch (err) {
      logger.error(
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
      logger.info(apporplugin + ' disabled');
    } catch (err) {
      logger.error(
        'Cannot disable given app or plugin, ' +
        apporplugin +
        ' cannot find it in the config file.');
      logger.raw(err);
    }
  },

  /**
   * Stop all running applications.
   *
   * @param {Function} callback Termination.
   */
  stop: function (callback) {
    var cozyLight = require('./cozy-light');
    if (cozyLight.getStatus() === 'started') {
      cozyLight.setStopped();
      logger.info('Stopping apps...');
      return applicationHelpers.stopAll(function (appErr) {
        if (appErr) {
          logger.error('An error occurred while stopping applications');
          logger.raw(appErr);
        }

        logger.info('Stopping plugins...');
        pluginHelpers.stopAll(function (pluginErr) {
          if (pluginErr) {
            logger.error('An error occurred while stopping plugins');
            logger.raw(pluginErr);
          }

          logger.info('Stopping server...');
          var timeout = nodeHelpers.throwTimeout(
              'main server is too slow to stop...', 5000);

          mainAppHelper.stop(function(){
            clearTimeout(timeout);
            logger.info('\t' + symbols.ok + '\tmain server');
            nodeHelpers.invoke(callback);
          });
        });
      });
    }
    logger.debug('Apps already stopped');
    return nodeHelpers.invoke(callback);
  },

  /**
   * Stops application server, its apps, and its plugins,
   * reload everyone, then restart everyone
   */
  restart: function (callback) {
    var cozyLight = require('./cozy-light');
    logger.info('Restarting...');

    actions.stop(function(){
      configHelpers.loadConfigFile();
      cozyLight.routes = {};

      logger.info('Starting all apps...');
      pluginHelpers.loadAll(this.program, function() {
        actions.start(this.program, function(){
          logger.info('...Cozy Light was properly restarted.');
          nodeHelpers.invoke(callback);
          actionsEvent.emit('restarted');
        });
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
    var cozyLight = require('./cozy-light');
    logger.info('Fetching data...');
    npmHelpers.fetchManifest(app,
      function addAppToConfig (fetchErr, manifest, type) {

        if (fetchErr) {
          logger.raw(fetchErr);
          logger.error('Cannot find given app manifest.');
          logger.error('Make sure it lives on Github');
          logger.error('or in the given directory.');
          logger.error(app + ' installation failed.');
          nodeHelpers.invoke(callback, fetchErr);

        } else {
          var config = configHelpers.getConfig();
          var appName = manifest.name;

          if (config.apps[appName]) {
            logger.info('App ' + appName + ' already installed...');
            return nodeHelpers.invoke(callback, null, manifest, type);

          } else {
            logger.info('Installing app ' + appName + '...');
            var setupCb = function(installErr){
              if (installErr) {
                logger.raw(installErr);
                logger.error(appName + ' installation failed.');
                nodeHelpers.invoke(callback, installErr, manifest, type);
              } else {
                logger.info(appName + ' installed. Enjoy!');

                if(cozyLight.getStatus() !== 'started') {
                  configHelpers.addApp(appName, manifest);
                  nodeHelpers.invoke(callback, null, manifest, type);
                } else {
                  configHelpers.watcher.one(function() {
                    callback();
                  });
                  configHelpers.addApp(appName, manifest);
                }
              }
            };

            if (type === 'file') {
              return npmHelpers.link(app, setupCb);
            } else if (type === 'url') {
              /* Checking if a branch of the github repo is specified
               * within the application path parameter (separated with a @).
               */
              if (app.split('@') > 1) {
                app = app.split('@')[0];
              }
              return npmHelpers.install(app, setupCb);
            }
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
    var cozyLight = require('./cozy-light');
    var config = configHelpers.getConfig();
    logger.info('Uninstalling ' + app + '...');
    if (config.apps[app] === undefined) {
      logger.error(app + ' is not installed.');
      nodeHelpers.invoke(callback, true);
    } else {
      var module = config.apps[app].name;
      npmHelpers.uninstall(module, function removeAppFromConfig (err) {
        if (err) {
          logger.raw(err);
          logger.error('npm did not uninstall ' + app + ' correctly.');
          nodeHelpers.invoke(callback, err);
        } else {
          logger.info(app + ' successfully uninstalled.');
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
  installPlugin: function (plugin, program, callback) {
    var cozyLight = require('./cozy-light');

    if (typeof(program) === 'function') callback = program;

    logger.info('Fetching data...');
    npmHelpers.fetchManifest(plugin,

      function addPluginToConfig (fetchErr, manifest, type) {
        if (fetchErr) {
          logger.raw(fetchErr);
          logger.error('Cannot find given plugin manifest.');
          logger.error('Make sure it lives on Github');
          logger.error('or in the given directory.');
          logger.error(plugin + ' installation failed.');
          nodeHelpers.invoke(callback, fetchErr);

        } else {
          var config = configHelpers.getConfig();
          var pluginName = manifest.name;

          if (config.plugins[pluginName]) {
            logger.info('Plugin ' + pluginName + ' already installed...');
            return nodeHelpers.invoke(callback, null, manifest, type);

          } else {
            logger.info('Installing plugin ' + pluginName + '...');
            var setupCb = function (installErr) {

              if (installErr) {
                logger.raw(installErr);
                logger.error(pluginName + ' installation failed.');
                nodeHelpers.invoke(callback, installErr, manifest, type);

              } else {
                logger.info(pluginName + ' installed. Enjoy!');

                if(cozyLight.getStatus() !== 'started') {
                  configHelpers.addPlugin(pluginName, manifest);
                  nodeHelpers.invoke(callback, null, manifest, type);

                } else {
                  configHelpers.watcher.one(function () {
                    pluginHelpers.loadPlugin(pluginName, program);
                    nodeHelpers.invoke(callback);
                  });
                  configHelpers.addPlugin(pluginName, manifest);
                }
              }
            };

            if (type === 'file') {
              return npmHelpers.link(plugin, setupCb);

            } else if (type === 'url') {
              return npmHelpers.install(plugin, setupCb);
            }
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
    var cozyLight = require('./cozy-light');
    var config = configHelpers.getConfig();
    logger.info('Removing ' + plugin + '...');

    if (config.plugins[plugin] === undefined) {
      logger.error(plugin + ' is not installed.');
      nodeHelpers.invoke(callback, true);

    } else {
      var module = config.plugins[plugin].name;
      npmHelpers.uninstall(module, function removePluginFromConfig (err) {

        if (err) {
          logger.raw(err);
          logger.error('npm did not uninstall ' + plugin + ' correctly.');
          nodeHelpers.invoke(callback, err);

        } else {
          logger.info(plugin + ' successfully uninstalled.');
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
    var cozyLight = require('./cozy-light');
    if (distro !== undefined && distro !== '') {
      try {
        logger.info('Start distribution installation for ' + distro);
        distrib.installDistro(distro, actions, function (err) {
          if (err) {
            logger.raw(err.message);
            logger.error(
              'An error occured while installing your distribution');
            nodeHelpers.invoke(callback, err);
          } else {
            logger.info('Distribution ' + distro + 'successfully installed');
            nodeHelpers.invoke(callback);
          }
        });
      } catch (err) {
        logger.raw(err);
        logger.error('An error occurred while installing your distribution');
      }
    } else {
      logger.info(
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
    logger.raw(JSON.stringify(configHelpers.loadConfigFile(), null, 2));
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
