
var symbols = require('symbolsjs');
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var distrib = require('./distrib');

module.exports = function(cozyLight){

  var nodeHelpers = cozyLight.nodeHelpers;
  var npmHelpers = cozyLight.npmHelpers;
  var configHelpers = cozyLight.configHelpers;
  var pluginHelpers = cozyLight.pluginHelpers;
  var mainAppHelper = cozyLight.mainAppHelper;
  var applicationHelpers = cozyLight.applicationHelpers;
  var LOGGER = cozyLight.logger;


  var server = null;
  var expressLog = false; // @todo need a way to configure from outside

  var ActionsEmitter = new require('events').EventEmitter;
  var actionsEvent = new ActionsEmitter();

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
      cozyLight.status = 'started';

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
      if ( cozyLight.status === 'started' ) {
        cozyLight.status = 'stopped';
        LOGGER.info('Stopping apps...');
        return applicationHelpers.stopAll(function (appErr) {
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
              nodeHelpers.invoke(callback);
            });
          });
        });
      }
      LOGGER.info('Apps already stopped');
      return nodeHelpers.invoke(callback);
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
      LOGGER.info('Fetching data...');
      npmHelpers.fetchManifest(app,
        function addAppToConfig (fetchErr, manifest, type) {
          if (fetchErr) {
            LOGGER.raw(fetchErr);
            LOGGER.error('Cannot find given app manifest.');
            LOGGER.error('Make sure it lives on Github');
            LOGGER.error('or in the given directory.');
            LOGGER.error(app + ' installation failed.');
            nodeHelpers.invoke(callback, fetchErr);
          } else {
            var config = configHelpers.getConfig();
            var appName = manifest.name;
            if ( config.apps[appName] ) {
              LOGGER.info('App ' + appName + ' already installed...');
              return nodeHelpers.invoke(callback, true, manifest, type);
            } else {
              LOGGER.info('Installing app ' + appName + '...');
              var setupCb = function(installErr){
                if (installErr) {
                  LOGGER.raw(installErr);
                  LOGGER.error(appName + ' installation failed.');
                  nodeHelpers.invoke(callback, installErr, manifest, type);
                } else {
                  LOGGER.info(appName + ' installed. Enjoy!');
                  configHelpers.watcher.one(callback);
                  configHelpers.addApp(appName, manifest);
                }
              };
              if (type === 'file') {
                return npmHelpers.link(app, setupCb);
              } else if (type === 'url') {
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
      var config = configHelpers.getConfig();
      LOGGER.info('Uninstalling ' + app + '...');
      if (config.apps[app] === undefined) {
        LOGGER.error(app + ' is not installed.');
        nodeHelpers.invoke(callback, true);
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
      LOGGER.info('Fetching data...');
      npmHelpers.fetchManifest(plugin,
        function addPluginToConfig (fetchErr, manifest, type) {
          if (fetchErr) {
            LOGGER.raw(fetchErr);
            LOGGER.error('Cannot find given plugin manifest.');
            LOGGER.error('Make sure it lives on Github');
            LOGGER.error('or in the given directory.');
            LOGGER.error(plugin + ' installation failed.');
            nodeHelpers.invoke(callback, fetchErr);
          } else {
            var config = configHelpers.getConfig();
            var pluginName = manifest.name;
            if ( config.plugins[pluginName] ) {
              LOGGER.info('Plugin ' + pluginName + ' already installed...');
              return nodeHelpers.invoke(callback, true, manifest, type);
            } else {
              LOGGER.info('Installing plugin ' + pluginName + '...');
              var setupCb = function(installErr){
                if (installErr) {
                  LOGGER.raw(installErr);
                  LOGGER.error(pluginName + ' installation failed.');
                  nodeHelpers.invoke(callback, installErr, manifest, type);
                } else {
                  LOGGER.info(pluginName + ' installed. Enjoy!');
                  configHelpers.watcher.one(function(){
                    pluginHelpers.loadPlugin(pluginName);
                    nodeHelpers.invoke(callback);
                  });
                  configHelpers.addPlugin(pluginName, manifest);
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
      var config = configHelpers.getConfig();
      LOGGER.info('Removing ' + plugin + '...');
      if (config.plugins[plugin] === undefined) {
        LOGGER.error(plugin + ' is not installed.');
        nodeHelpers.invoke(callback, true);
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
