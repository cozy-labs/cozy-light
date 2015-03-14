var fs = require('fs-extra');
var pathExtra = require('path-extra');

var configWatcher = require('./helpers/config-watcher');

var config;
var home = '';
var mainAppHost = 'localhost';
var mainAppPort = 19104;
var appsPort = 18001;


module.exports = configHelpers = {

  watcher: null,

  /**
   * Initialize config instance
   */
  init: function (cozyHome, port) {
    fs.mkdirsSync(cozyHome);

    configHelpers.setHomePath(cozyHome);
    configHelpers.setMainAppPort(parseInt(port));
    configHelpers.setDefaultAppsPort(parseInt(port) + 100);

    configHelpers.copyDependency('pouchdb');

    configHelpers.createConfigFile();
    configHelpers.watcher = configWatcher;
    configHelpers.watcher.init(configHelpers.getConfigPath());

    return configHelpers.loadConfigFile();
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
  * Returns Home directory path
  *
  * @return {String} Home path of cozy-light.
  */
  getHomePath: function () {
    return home;
  },

  /**
  * Sets Home directory path
  *
  * @param {String} path The path of cozy-light home.
  */
  setHomePath: function (path) {
    home = pathExtra.resolve(path);
  },

  /**
  * @return {int} Starting applications server port.
  */
  getDefaultAppsPort: function () {
    return appsPort;
  },

  /**
  * @param {int} port Starting applications server port.
  */
  setDefaultAppsPort: function (port) {
    appsPort = parseInt(port);
  },

  /**
  * @param {int} port Application server port.
  */
  setMainAppPort: function (port) {
    mainAppPort = port;
  },

  /**
  * Get application server port.
  * Take port from command line args, or config,
  * fallback to default one if none is set.
  *
  * @return {int} Application server port.
  */
  getMainAppPort: function () {
    var mainPort = mainAppPort;
    if (config.port !== undefined) {
      mainPort = config.port;
    }

    return mainPort;
  },

  /**
  * @return {String} Application server host.
  */
  getMainAppHost: function () {
    return mainAppHost;
  },

  /**
  * @param {String} host Application server host.
  */
  setMainAppHost: function (host) {
    mainAppHost = parseInt(host);
  },

  /**
  * Returns modules directory path.
  *
  * @return {String} Path to node_modules directory used by cozy-light.
  */
  getModulesPath: function () {
    return pathExtra.join(configHelpers.getHomePath(), 'node_modules');
  },

  /**
  * Returns config file path.
  *
  * @return {String} Path to cozy-light configuration file.
  */
  getConfigPath: function () {
    return pathExtra.join(configHelpers.getHomePath(), 'config.json');
  },

  /**
  * Return installation path module.
  *
  * @param {String} npmModule The name of the cozy-light module.
  */
  modulePath: function (npmModule) {
    return pathExtra.join(configHelpers.getModulesPath(), npmModule);
  },

  /**
  * Load config file
  *
  * @return {Object} config
  */
  loadConfigFile: function () {
   var filePath = configHelpers.getConfigPath();
   config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
   return config;
  },

  /**
   * Save config file to disk.
   */
  saveConfig: function () {
    var configString = JSON.stringify(config, null, 2);
    fs.writeFileSync(configHelpers.getConfigPath(), configString);
  },

  /**
   * Create config file if it doesn't exist
   */
  createConfigFile: function () {
    var exists = fs.existsSync(configHelpers.getConfigPath());
    if (!exists) {
      config = { apps: {}, plugins: {} };
      configHelpers.saveConfig();
    }
  },

  /**
   * Copy given dependency to app folder to avoid apps to fetch and rebuild it
   * every time it's required as dependency.
   * Most dependencies are common and can be reused.
   */
  copyDependency: function (name) {
    var destPath = configHelpers.modulePath(name);
    var sourcePath = pathExtra.join(__dirname, '..', 'node_modules', name);

    if (!fs.existsSync(destPath)) {
      fs.copySync(sourcePath, destPath);
    }
  },

  /**
   * Add a new application to the configuration file.
   * The configuration file is written in JSON.
   * It adds an entry to the apps field.
   * Name, display name, version and description are required.
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
   * Remove given application from the configuration file.
   * The configuration file is written in JSON.
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
   * Add a new plugin to the configuration file.
   * The configuration file is written in JSON.
   * It adds an entry to the plugins field.
   * Name, display name, version and description are required.
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
   * @param {String} apporplugin The plugin/app name
   *                             as it's typed by the user.
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
        'Cannot enable, given app or plugin ' +
        apporplugin +
        ' is not configured.');
    }
  },

  /**
   * Add to given app or plugin a disabled field.
   *
   * @param {String} apporplugin The plugin/app name
   *                             as it's typed by the user.
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
        'Cannot disable, given app or plugin ' +
        apporplugin +
        ' is not configured.');
    }
  },

  /**
   * Prepare plugins to be sent as json file to the web UI.
   *
   * @returns {Object}
   */
  exportPlugins: function () {
    var plugins = {};
    Object.keys(config.plugins || {}).forEach(function(name){
      var template = '';
      //if (loadedPlugins[name] && loadedPlugins[name].getTemplate) {
      //  template = loadedPlugins[name].getTemplate(config);
      //}
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
   * @returns {Object}
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
   * @return {String} Application server url.
   * TODO: refactor with url module.
   */
  getServerUrl: function (options) {
    var resolvedHost = configHelpers.getMainAppHost(options);
    var resolvedPort = configHelpers.getMainAppPort(options);
    var serverUrl = '://' + resolvedHost + ':' + resolvedPort;
    if (config.ssl !== undefined) {
      serverUrl = 'https' + serverUrl;
    } else  {
      serverUrl = 'http' + serverUrl;
    }

    return serverUrl;
  }
};

