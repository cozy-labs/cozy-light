var symbols = require('symbolsjs');
var async = require('async');
var printit = require('printit');
var logger = printit({prefix: 'Cozy Light'});

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

  /**
   * Loads all plugins.
   *
   * @param program Program or Plain object.
   * @param callback Termination.
   */
  loadAll: function (program, callback) {
    var config = configHelpers.getConfig();
    var loadPlugin = function (pluginName, cb) {
      pluginHelpers.loadPlugin(pluginName, program, cb);
    };

    Object.keys(config.plugins || {}).forEach(loadPlugin);
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

    if (config.plugins[pluginName] === undefined) {
      logger.error('Plugin ' + pluginName + ' not installed!');

    } else {

      try {
        if (pluginHelpers.loadedPlugins[pluginName] === undefined) {
          pluginHelpers.loadPlugin(pluginName, program);
        }
        var plugin = pluginHelpers.loadedPlugins[pluginName];

        if (plugin !== null) {
          pluginHelpers.startedPlugins[plugin] = true;
          if (plugin.configureAppServer !== undefined) {
            logger.info('Configuring plugin ' + pluginName + '...');
            var logResult = function () {
              logger.info('Plugin ' + pluginName + ' configured.');
              nodeHelpers.invoke(callback);
            };
            return plugin.configureAppServer(applicationServer,
              config, routes, logResult);
          }
        }

      } catch(err) {
        logger.raw(err);
        logger.error('Plugin ' + pluginName + ' loading failed.');
        return nodeHelpers.invoke(callback, err);
      }
    }
    return nodeHelpers.invoke(callback);
  },

  /**
   * Stop given plugin (unload it form cache and run its exit handleR).
   *
   * @param pluginName The plugin name to start.
   * @param callback Termination.
   */
  stop: function (pluginName, callback) {
    var cozyLight = require('./cozy-light');
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
          }, cozyLight);

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

    async.eachSeries(
      Object.keys(pluginHelpers.loadedPlugins),
      attachPlugin,
      callback
    );
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

