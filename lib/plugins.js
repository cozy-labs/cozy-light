var symbols = require('symbolsjs');
var async = require('async');
var logger = require('./helpers/logger');

var nodeHelpers = require('./helpers/node');
var npmHelpers = require('./helpers/npm');
var configHelpers = require('./config');
var routes = require('./routes');


module.exports = pluginHelpers = {
  loadedPlugins: {},
  startedPlugins: {},

  loadPlugin: function (pluginName, program) {
    var cozyLight = require('./cozy-light');

    var config = configHelpers.getConfig();
    var pluginConfig = config.plugins[pluginName];

    if (pluginConfig.disabled !== true) {
      var pluginPath = configHelpers.modulePath(pluginConfig.name);

      try {
        var pluginModule = require(pluginPath);
        var options = {
          name: pluginConfig.name,
          displayName: pluginConfig.displayName,
          version: pluginConfig.version,
          description: pluginConfig.description,
          configPath: configHelpers.getConfigPath(),
          home: configHelpers.getHomePath(),
          npmHelpers: npmHelpers,
          cozyLight: cozyLight,
          proxy: cozyLight.mainAppHelper.getProxy(),
          /* eslint-disable */
          // for backward compatibility
          config_path: configHelpers.getConfigPath()
          /* eslint-enable */
        };

        if (pluginModule.configure) {
          pluginModule.configure(options, config, program, cozyLight);
        }

        pluginHelpers.loadedPlugins[pluginName] = pluginModule;

        return pluginModule;

      } catch (err) {
        logger.error('Can\'t load ' + pluginName);
        logger.raw(err.stack);
      }
    }
    return null;
  },

  unloadPlugin: function (pluginName) {
    if (pluginHelpers.startedPlugins[pluginName]) {
      throw 'Can not unload started plugins, stop it first !';
    }
    delete pluginHelpers.loadedPlugins[pluginName];
  },

  unloadAll: function (program, callback) {
    var config = configHelpers.getConfig();
    var loadPlugin = function (pluginName, cb) {
      pluginHelpers.unloadPlugin(pluginName, program, cb);
    };

    Object.keys(config.plugins || {}).forEach(loadPlugin);
    nodeHelpers.invoke(callback);
  },

  /**
   * Loads all plugins.
   *
   * @param program Program or Plain object.
   * @param callback Termination.
   */
  loadAll: function (program, callback) {
    var config = configHelpers.getConfig();
    config.plugins = config.plugins || {};
    var loadPlugin = function (pluginName, cb) {
      pluginHelpers.loadPlugin(pluginName, program, cb);
    };

    Object.keys(config.plugins).forEach(loadPlugin);
    nodeHelpers.invoke(callback);
  },

  /**
   * Start given plugin (require it, run configuration and apply change to
   * cozy light server).
   * NB: Do not load given plugin if it is disabled.
   *
   * @param pluginName The plugin name to start.
   * @param program The commander program to bind.
   * @param applicationServer The application server to connect the plugin on.
   * @param callback Termination.
   */
  start: function (pluginName, program, applicationServer, callback) {
    var config = configHelpers.getConfig();

    // Test if plugin is installed.
    if (config.plugins[pluginName] === undefined) {
      logger.error('Plugin ' + pluginName + ' not installed!');
      nodeHelpers.invoke(callback);

    } else {

      try {

        // Load plugin
        if (pluginHelpers.loadedPlugins[pluginName] === undefined) {
          pluginHelpers.loadPlugin(pluginName, program);
        }
        var plugin = pluginHelpers.loadedPlugins[pluginName];

        if (plugin !== null) {
          pluginHelpers.startedPlugins[plugin] = true;

          if (plugin.configureAppServer && applicationServer) {
            logger.info('Configuring plugin ' + pluginName + '...');

            plugin.configureAppServer(
              applicationServer, config, routes, function logResult () {

              logger.info('Plugin ' + pluginName + ' configured.');
              nodeHelpers.invoke(callback);
            });

          // Plugin has no action to perform on the server.
          } else {
            nodeHelpers.invoke(callback);
          }

        // Something went wrong while loading the plugin.
        } else {
          logger.error('Plugin ' + pluginName + ' was not properly loaded!');
          nodeHelpers.invoke(callback);
        }

      } catch(err) {
        logger.raw(err);
        logger.error('Plugin ' + pluginName + ' loading failed.');
        nodeHelpers.invoke(callback, err);
      }
    }
  },

  /**
   * Stop given plugin (unload it form cache and run its exit handleR).
   *
   * @param pluginName The plugin name to start.
   * @param callback Termination.
   */
  stop: function (pluginName, callback) {
    var config = configHelpers.getConfig();

    if (config.plugins[pluginName] === undefined) {
      logger.error('Plugin ' + pluginName + ' not installed!');

    } else if (pluginHelpers.loadedPlugins[pluginName] === undefined) {
      logger.error('Plugin ' + pluginName + ' not loaded!');

    } else {
      var options = config.plugins[pluginName];

      try {
        var plugin = pluginHelpers.loadedPlugins[pluginName];
        delete pluginHelpers.loadedPlugins[pluginName];
        nodeHelpers.clearRequireCache(configHelpers.modulePath(options.name));

        if (plugin.onExit !== undefined) {

          return plugin.onExit(options, config, function (err) {

            if (err) {
              logger.raw(err);
              logger.info('\t' + symbols.err + '\t' +
                          options.displayName + '');

            } else {
              logger.info('\t' + symbols.ok + '\t' +
                          options.displayName + '');
            }

            delete pluginHelpers.startedPlugins[pluginName];
            nodeHelpers.invoke(callback, err);
          });

        } else {
          delete pluginHelpers.startedPlugins[pluginName];
          logger.info('\t' + symbols.ok + '\t' +
                      options.displayName + '');
        }

      } catch(err) {
        logger.raw(err);
        logger.error('Plugin ' + options.displayName +
                     ' failed for termination.');
        return nodeHelpers.invoke(callback, err);
      }
    }
    return nodeHelpers.invoke(callback);
  },

  /**
   * Start all plugins.
   *
   * @param program Program or Plain object.
   * @param app Express app.
   * @param callback Termination.
   */
  startAll: function (program, app, callback) {
    var attachPlugin = function (pluginName, cb) {
      pluginHelpers.start(pluginName, program, app, cb);
    };

    plugins = Object.keys(pluginHelpers.loadedPlugins)
    async.eachSeries(plugins, attachPlugin, function() {
      callback();
    });
  },

  /**
   * Stop all plugins.
   *
   * @param callback Termination.
   */
  stopAll: function (callback) {
    var plugins = Object.keys(pluginHelpers.loadedPlugins || {});
    async.eachSeries(plugins, pluginHelpers.stop, callback);
  }
};

