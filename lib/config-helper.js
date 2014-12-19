
var fsExtra = require('fs-extra');
var pathExtra = require('path-extra');

module.exports = function(customHome){

  var home;
  var configPath;
  var config;
  var loadedPlugins = {};

  home = pathExtra.join(customHome, '.cozy-light');
  configPath = pathExtra.join(home, 'config.json');

  var configHelpers = {

    /**
     * Return installation path module.
     *
     * @param {String} npmModule The name of the cozy-light module
     */
    modulePath: function (npmModule) {
      return pathExtra.join(home, 'node_modules', npmModule);
    },

    /**
     * Returns config file path
     *
     * @return {Object} config
     */
    getConfigPath: function () {
      return configPath;
    },

    /**
     * Returns config content
     *
     * @return {Object} config
     */
    getConfig: function () {
      return config;
    },

    /**
     * Load config file
     *
     * @return {Object} config
     */
    loadConfigFile: function () {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config;
    },

    /**
     * Save config file to disk.
     */
    saveConfig: function () {
      var configString = JSON.stringify(config, null, 2);
      fs.writeFileSync(configPath, configString);
    },

    /**
     * Add a new application to the configuration file. The configuration file is
     * written in JSON. It adds an entry to the apps field. Name, display name,
     * version and description are required.
     *
     * @param {String} app The app name as it's typed by the user (user/repo).
     * @param {Object} manifest Manifest containing application fields.
     */
    addApp: function (app, manifest) {
      if (manifest.type === undefined) {
        manifest.type = 'classic';
      }
      config.apps[app] = {
        name: manifest.name,
        displayName: manifest.displayName,
        version: manifest.version,
        description: manifest.description,
        type: manifest.type
      };
      configHelpers.saveConfig();
    },

    /**
     * Remove given application from the configuration file. The configuration file
     * is written in JSON.
     *
     * @param {String} app The app name as it's typed by the user (user/repo).
     */
    removeApp: function (app) {
      var ret = false;
      if (config.apps[app] !== undefined) {
        delete config.apps[app];
        configHelpers.saveConfig();
        ret = true;
      }
      return ret;
    },

    /**
     * Add a new plugin to the configuration file. The configuration file is
     * written in JSON. It adds an entry to the plugins field. Name, display name,
     * version and description are required.
     *
     * @param {String} plugin The plugin name as it's typed by the user.
     *                        It s in the form user/repo.
     * @param {Object} manifest Manifest containing plugin fields.
     */
    addPlugin: function (plugin, manifest) {
      if (config.plugins === undefined) {
        config.plugins = {};
      }

      config.plugins[plugin] = {
        name: manifest.name,
        displayName: manifest.displayName,
        version: manifest.version,
        description: manifest.description
      };
      configHelpers.saveConfig();
    },

    /**
     * Remove given plugin from the configuration file.
     *
     * @param {String} plugin The plugin name as it's typed by the user
     * (user/repo).
     */
    removePlugin: function (plugin) {
      var ret = false;
      if (config.plugins[plugin] !== undefined) {
        delete config.plugins[plugin];
        configHelpers.saveConfig();
        ret = true;
      }
      return ret;
    },

    /**
     * Remove from given app or plugin the disabled field.
     *
     * @param {String} apporplugin The plugin/app name as it's typed by the user.
     */
    enable: function (apporplugin) {
      if (config.plugins[apporplugin] !== undefined) {
        config.plugins[apporplugin].disabled = undefined;
        configHelpers.saveConfig();
      } else if (config.apps[apporplugin] !== undefined) {
        config.apps[apporplugin].disabled = undefined;
        configHelpers.saveConfig();
      } else {
        throw new Error(
          'Cannot disable, given app or plugin is not configured.');
      }
    },

    /**
     * Add to given app or plugin a disabled field.
     *
     * @param {String} apporplugin The plugin/app name as it's typed by the user.
     */
    disable: function (apporplugin) {
      if (config.plugins[apporplugin] !== undefined) {
        config.plugins[apporplugin].disabled = true;
        configHelpers.saveConfig();
      } else if (config.apps[apporplugin] !== undefined) {
        config.apps[apporplugin].disabled = true;
        configHelpers.saveConfig();
      } else {
        throw new Error(
          'Cannot disable, given app or plugin is not configured.');
      }
    },

    /**
     * Create config file if it doesn't exist
     */
    createConfigFile: function () {
      var exists = fs.existsSync(configPath);
      if (!exists) {
        config = { apps: {} };
        configHelpers.saveConfig();
      } else {
        config = configHelpers.loadConfigFile();
      }
    },

    /**
     * Copy given dependency to app folder to avoid apps to fetch and rebuild it
     * every time it's required as dependency.
     * Most dependencies are common and can be reused.
     */
    copyDependency: function (name) {
      var destPath = configHelpers.modulePath(name);
      var sourcePath = pathExtra.join(__dirname, '..', '..', 'node_modules', name);

      if (!fs.existsSync(destPath)) {
        fsExtra.copySync(sourcePath, destPath);
      }
    },

    /**
     * Prepare plugins to be sent as json file to the web UI.
     *
     * @returns {Array}
     */
    exportPlugins: function () {
      var plugins = {};
      Object.keys(config.plugins || {}).forEach(function(name){
        var template = '';
        if (loadedPlugins[name] && loadedPlugins[name].getTemplate) {
          template = loadedPlugins[name].getTemplate(config);
        }
        plugins[name] = {
          name: config.plugins[name].name,
          displayName: config.plugins[name].displayName,
          version: config.plugins[name].version,
          template: template
        };
      });
      return plugins;
    },

    /**
     * Prepare apps to be sent as json file to the web UI.
     *
     * @returns {Array}
     */
    exportApps: function () {
      var apps = {};
      var baseUrl = configHelpers.getServerUrl();
      Object.keys(config.apps || {}).forEach(function(name){
        apps[name] = {
          name: config.apps[name].name,
          displayName: config.apps[name].displayName,
          version: config.apps[name].version,
          url: baseUrl + '/apps/' + config.apps[name].name + '/'
        };
      });
      return apps;
    },

    /**
     * @return {String} Application server host.
     */
    getHost: function () {
      return 'localhost';
    },

    /**
     * Get application server port.
     * Take port from command line args, or config,
     * fallback to default one if none is set.
     *
     * @return {int} Application server port.
     */
    getServerPort: function (options) {
      var mainPort = DEFAULT_PORT;
      var infos = options || program;
      if (infos.port !== undefined) {
        mainPort = infos.port;
      } else if (config.port !== undefined) {
        mainPort = config.port;
      }

      return mainPort;
    },

    /**
     * @return {String} Application server url.
     * TODO: refactor with url module.
     */
    getServerUrl: function (options) {
      var resolvedHost = configHelpers.getHost(options);
      var resolvedPort = configHelpers.getServerPort(options);
      var serverUrl = '://' + resolvedHost + ':' + resolvedPort;
      if (config.ssl !== undefined) {
        serverUrl = 'https' + serverUrl;
      } else  {
        serverUrl = 'http' + serverUrl;
      }

      return serverUrl;
    }
  };

  return configHelpers;
};