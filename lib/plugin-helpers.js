
var symbols = require('symbolsjs');
var async = require('async');

module.exports = function(cozyLight){

  var nodeHelpers = cozyLight.nodeHelpers;
  var logger = cozyLight.logger;
  var npmHelpers = cozyLight.npmHelpers;
  var configHelpers = cozyLight.configHelpers;
  var routes = cozyLight.routes;

  var loadedPlugins = {};
  var startedPlugins = {};

  var pluginHelpers = {

    loadedPlugins: loadedPlugins,
    startedPlugins: startedPlugins,

    loadPlugin: function (pluginName, program) {
      var config = configHelpers.getConfig();
      var pluginConfig = config.plugins[pluginName];
      if (pluginConfig.disabled !== true) {
        var pluginPath = configHelpers.modulePath(pluginConfig.name);
        try {
          var pluginModule = require(pluginPath);

          var options = {
            name: pluginModule.name,
            displayName: pluginConfig.displayName,
            version: pluginConfig.version,
            description: pluginConfig.description,
            configPath: configHelpers.getConfigPath(),
            /*eslint-disable */
            config_path: configHelpers.getConfigPath(), // for backward compatibility
            /*eslint-enable */
            home: configHelpers.getHomePath(),
            npmHelpers: npmHelpers,
            cozyLight: cozyLight,
            proxy: cozyLight.mainAppHelper.getProxy()
          };

          if (pluginModule.configure){
            pluginModule.configure(options, config, program, cozyLight);
          }

          loadedPlugins[pluginName] = pluginModule;

          return pluginModule;

        } catch (err) {
          logger.error('Can\'t load ' + pluginName);
          logger.raw(err.stack);
        }
      }
      return null;
    },
    unloadPlugin: function (pluginName) {
      if (startedPlugins[pluginName]) {
        throw 'Can not unload started plugins, stop it first !';
      }
      delete loadedPlugins[pluginName];
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
      async.eachSeries(Object.keys(config.plugins || {}),
        loadPlugin,
        callback);
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
        logger.error('Plugin ' + pluginName + ' not installed !');
      } else {
        try {
          if (loadedPlugins[pluginName] === undefined) {
            pluginHelpers.loadPlugin(pluginName, program);
          }
          var plugin = loadedPlugins[pluginName];

          if (plugin !== null) {
            startedPlugins[plugin] = true;
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

      var config = configHelpers.getConfig();

      if (config.plugins[pluginName] === undefined) {
        logger.error('Plugin ' + pluginName + ' not installed!');
      } else if (loadedPlugins[pluginName] === undefined) {
        logger.error('Plugin ' + pluginName + ' not started!');
      } else {

        var options = config.plugins[pluginName];

        try {
          var plugin = loadedPlugins[pluginName];
          delete loadedPlugins[pluginName];

          var modulePath = configHelpers.modulePath(options.name);
          nodeHelpers.clearRequireCache(modulePath);

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
              delete startedPlugins[pluginName];
              nodeHelpers.invoke(callback, err);
            });

          } else {
            delete startedPlugins[pluginName];
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
      async.eachSeries(Object.keys(loadedPlugins),
        attachPlugin,
        callback);
    },

    /**
     * Stop all plugins.
     *
     * @param callback Termination.
     */
    stopAll: function (callback) {
      var plugins = Object.keys(loadedPlugins || {});
      async.eachSeries(plugins, pluginHelpers.stop, callback);
    }
  };

  return pluginHelpers;
};
