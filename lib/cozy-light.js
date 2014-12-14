var _ = require('underscore');
var http = require('http');
var https = require('https');
var fs = require('fs');
var fsExtra = require('fs-extra');
var pathExtra = require('path-extra');
var npm = require('npm');
var request = require('request-json-light');
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var async = require('async');
var printit = require('printit');
var Pouchdb = require('pouchdb');
var httpProxy = require('http-proxy');
var symbols = require('./symbols');
var distrib = require('./distrib');
var configWatcher = require('./config-watcher');
var nodeHelpers = require('./node-helpers');

// Constants
const LOGGER = printit({ prefix: 'Cozy Light' });
const DEFAULT_PORT = 19104;

// 'Global' variables

var program = {};
var initialWd = process.cwd();
var home = '';
var configPath = '';
var routes = {};
var loadedApps = {};
var loadedPlugins = {};
var port = 18001;
var defaultAppsPort = port;
var proxy = null;
var config = null;
var server = null;
var db = null;
var expressLog = false;


// Helpers

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
    var sourcePath = pathExtra.join(__dirname, '..', 'node_modules', name);

    if (!fs.existsSync(destPath)) {
      fsExtra.copySync(sourcePath, destPath);
    }
  },

  /**
   * Init happens in several steps:
   * - Set configHelpers HOME and CONFIG_PATH
   * - Create the home folder
   * - Change current working directory to home folder
   * - Initialize a default config file if none exists
   * - Manage config file watcher subscriptions
   * - Load and return config file.
   *
   * default home dir is ~/.cozy-light
   * default config path is ~/.cozy-light/package.json
   *
   * @param {String} customHome The home path where .cozy-light folder belongs
   *
   * @return {Object} config
   */
  init: function (customHome, options) {
    home = pathExtra.join(customHome, '.cozy-light');
    program = options || program;
    configPath = pathExtra.join(home, 'config.json');

    fsExtra.mkdirsSync(home);
    process.chdir(home);
    db = new Pouchdb('cozy');

    configHelpers.createConfigFile();
    configHelpers.copyDependency('pouchdb');

    var watchOptions = {persistent: false, interval: 1000};
    var onConfigChanged = _.debounce(function () {
      LOGGER.info('Config changed...');
      configWatcher.trigger();
    }, 250, true);
    configHelpers.mainWatcher = fs.watchFile(
        configPath,
        watchOptions,
        onConfigChanged
    );

    config = configHelpers.loadConfigFile();
    Object.keys(config.plugins || {}).forEach(function (name) {
      pluginHelpers.loadPlugin(name);
    });

    return config;
  },


  /**
   * Subscribe an handler
   * to config file updates
   *
   * @return {Object} config
   */
  watchConfig: function (newWatcher) {
    configWatcher.on(newWatcher);
  },

  /**
   * unSubscribe an handler
   * to config file updates
   *
   * @return {Object} config
   */
  unwatchConfig: function (newWatcher) {
    configWatcher.off(newWatcher);
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

var npmHelpers = {

  /**
   * Fetch given app source and dependencies from NPM registry.
   *
   * Config file is ~/.cozy-light/.config
   *
   * @param {String} app App to fetch from NPM.
   * @param {Function} callback Callback to run once work is done.
   */
  install: function (app, callback) {
    npm.load({}, function () {
      npm.commands.install(home, [app], callback);
    });
  },

  /**
   * Link given app source and dependencies from local file system.
   *
   * @param {String} app Path to the module to link.
   * @param {Function} callback Callback to run once work is done.
   */
  link: function (app, callback) {
    npm.load({ local: true}, function () {
      app = pathExtra.resolve(initialWd, app);
      npm.commands.link([app], callback);
    });
  },

  /**
   * Remove application source and dependencies using NPM lib.
   *
   * @param {String} app App to fetch from NPM.
   * @param {Function} callback Callback to run once work is done.
   */
  uninstall: function (app, callback) {
    npm.load({}, function () {
      npm.commands.uninstall([app], callback);
    });
  },

  /**
   * Fetch application or plugin manifest from an url or a path
   *
   * @param {String} app App or Plugin name to fetch from url or path.
   * @param {Function} callback Termination.
   */
  fetchManifest: function (app, callback) {
    var appPath = pathExtra.resolve(initialWd, app);

    if (fs.existsSync(appPath)
        && fs.existsSync(pathExtra.join(appPath,'package.json'))) {
      var manifestPath = pathExtra.join(appPath,'package.json');
      fs.readFile(manifestPath, function checkError (err, manifest) {
        if (err) {
          LOGGER.error(err);
          callback(err);
        } else {
          callback(err, JSON.parse(manifest), 'file');
        }
      });
    } else {
      var client = request.newClient( 'https://raw.githubusercontent.com/');
      var manifestUrl = app + '/master/package.json';

      client.get(manifestUrl, function (err, res, manifest) {
        if (res.statusCode !== 200) {
          LOGGER.error(err);
          callback(err);
        } else if (err) {
          LOGGER.error(err);
          callback(err);
        } else {
          callback(err, manifest, 'url');
        }
      });
    }
  },

  /**
   * Fetch and install application or plugin from an url or a path
   *
   * @param {String} app App or Plugin name to fetch from url or path.
   * @param {Function} callback Termination.
   * TODO rename this function
   */
  fetchInstall: function (app, callback) {
    npmHelpers.fetchManifest(app, function(err, manifest, type){
      if (err) { return callback(err); }
      var cb = function (err) {
        callback(err, manifest, type);
      };
      if (type === 'file') {
        npmHelpers.link(app, cb);
      } else {
        npmHelpers.install(app, cb);
      }
    });
  }
};

var pluginHelpers = {

  loadPlugin: function (pluginName) {
      var pluginConfig = config.plugins[pluginName];
      if (pluginConfig.disabled !== true) {
        var pluginPath = configHelpers.modulePath(pluginConfig.name);
        var pluginModule = require(pluginPath);
        var options = {
          name: pluginModule.name,
          displayName: pluginConfig.displayName,
          version: pluginConfig.version,
          description: pluginConfig.description,
          configPath: configPath,
          /*eslint-disable */
          config_path: configPath, // for backward compatibility
          /*eslint-enable */
          home: home,
          npmHelpers: npmHelpers,
          cozyLight: cozyLight,
          proxy: proxy
        };

        if (pluginModule.configure){
          pluginModule.configure(options, config, program);
        }

        loadedPlugins[pluginName] = pluginModule;

        return pluginModule;
    } else {
      return null;
    }
  },

  /**
   * Start given plugin (require it, run configuration and apply change to
   * cozy light server).
   * NB: Do not load given plugin if it is disabled.
   *
   * @param pluginName The plugin name to start.
   * @param applicationServer The application server to connect the plugin on.
   * @param callback Termination.
   */
  start: function (pluginName, applicationServer, callback) {
    if (config.plugins[pluginName] === undefined) {
      LOGGER.error('Plugin ' + pluginName + ' not installed !');
    } else {
      try {
        if (loadedPlugins[pluginName] === undefined) {
          pluginHelpers.loadPlugin(pluginName);
        }
        var plugin = loadedPlugins[pluginName];

        if (plugin !== null) {
          if (plugin.configureAppServer !== undefined) {
            LOGGER.info('Configuring plugin ' + pluginName + '...');
            var logResult = function(){
              LOGGER.info('Plugin ' + pluginName + ' configured.');
              callback();
            };
            return plugin.configureAppServer(applicationServer, config, routes,
              logResult);
          }
        } else {
          callback();
        }

      } catch(err) {
        LOGGER.raw(err);
        LOGGER.error('Plugin ' + pluginName + ' loading failed.');
        return callback(err);
      }
    }
    callback();
  },

  /**
   * Stop given plugin (unload it form cache and run its exit handleR).
   *
   * @param pluginName The plugin name to start.
   * @param callback Termination.
   */
  stop: function (pluginName, callback) {
    if (config.plugins[pluginName] === undefined) {
      LOGGER.error('Plugin ' + pluginName + ' not installed!');
      callback();
    } else if (loadedPlugins[pluginName] === undefined) {
      LOGGER.error('Plugin ' + pluginName + ' not started!');
      callback();
    } else {
      var options = config.plugins[pluginName];
      delete loadedPlugins[pluginName];
      try {
        var plugin = require(configHelpers.modulePath(options.name));
        nodeHelpers.clearRequireCache(configHelpers.modulePath(options.name));
        if (plugin.onExit !== undefined) {
          plugin.onExit(options, config, function (err) {
            if (err) {
              LOGGER.raw(err);
              LOGGER.info('\t' + symbols.err + '\t' + pluginName + '');
            } else {
              LOGGER.info('\t' + symbols.ok + '\t' + pluginName + '');
            }
            callback(err);
          });
        } else {
          LOGGER.info('\t' + symbols.ok + '\t' + pluginName + '');
          return callback();
        }
      } catch(err) {
        LOGGER.raw(err);
        LOGGER.error('Plugin ' + pluginName + ' failed for termination.');
        callback(err);
      }
    }
  },

  /**
   * Start all plugins.
   *
   * @param app Express app.
   * @param callback Termination.
   */
  startAll: function (app, callback) {
    var attachPlugin = function (pluginName, cb) {
      pluginHelpers.start(pluginName, app, cb);
    };
    async.eachSeries(Object.keys(config.plugins || {}),
      attachPlugin,
      callback);
  },

  /**
   * Stop all plugins.
   *
   * @param callback Termination.
   */
  stopAll: function (callback) {
    var plugins = Object.keys(config.plugins || {});
    async.eachSeries(plugins, pluginHelpers.stop, callback);
  }
};


var applicationHelpers = {

  /**
   * Start given classic application as a new listening server. List of
   * function to run on when configuration file is changed. List of function to
   * run on when configuration file is changed.
   * NB: Do not start given app if it is disabled.
   *
   * @param {Object} application The application to start.
   * @param {Object} db The database to give as parameter to the application
   *                      (they all share the same datastore).
   * @param {Function} callback Termination.
   */
  start: function (application, db, callback) {

    if ((application.type === undefined || application.type === 'classic')
        && application.disabled !== true) {

      var name = application.name;

      var appModule;
      try {
        var modulePath = configHelpers.modulePath(name);
        var cozyFile = pathExtra.join(modulePath, 'cozy.js');
        appModule = require(cozyFile);
      } catch (err) {
        try {
          appModule = require(configHelpers.modulePath(name));
        } catch (err) {
          LOGGER.raw(err);
        }
      }

      if (appModule === undefined) {
        LOGGER.error('Can\'t load application ' + name + '.');
        callback();
      } else if (appModule.start === undefined) {
        LOGGER.error('Can\'t start application ' + name + '.');
        callback();
      } else {

        loadedApps[name] = {
          appModule: appModule,
          server: null,
          sockets: [],
          watchers: []
        };

        // use getPort from hosted application
        // to grab more than one port,
        // still ensure no app port conflict
        var options = {
          db: db,
          port: port,
          getPort: function(){
            return port++;
          },
          silent: true
        };

        appModule.start(options, function (err, app, server) {
          if (err) { LOGGER.error(err); }

          if (server !== undefined ){
            // to properly close the server,
            // and release all its resources
            nodeHelpers.clearCloseServer(server);
            loadedApps[name].server = server;
          }
          routes[name] = options.port;
          LOGGER.info(
            'Application ' + name + ' is now running ' +
            'on port ' + options.port + '...');
          port = port + 1;
          callback(err, app, server);
        });
      }
    } else {
      callback();
    }
  },

  /**
   * Stop given classic application.
   *
   * @param application The application to stop.
   * @param {Function} callback Termination.
   */
  stop: function (application, callback) {
    var name = application.name;

    if (loadedApps[name] !== undefined) {
      var appModule = loadedApps[name].appModule;

      var closeServer = function () {
        try {
          if (loadedApps[name].server !== undefined ){
            loadedApps[name].server.close(function logInfo (err) {
              if (err) {
                LOGGER.raw(err);
                LOGGER.info('\t' + symbols.err + '\t' + name + '');
              } else {
                LOGGER.info('\t' + symbols.ok + '\t' + name + '');
              }
              nodeHelpers.clearRequireCache(configHelpers.modulePath(name));
              delete loadedApps[name];
              callback();
            });
          } else {
            nodeHelpers.clearRequireCache(configHelpers.modulePath(name));
            delete loadedApps[name];
            callback();
          }
        } catch (err) {
          LOGGER.raw(err);
          LOGGER.warn('An error occurred while stopping ' + name);
          nodeHelpers.clearRequireCache(configHelpers.modulePath(name));
          delete loadedApps[name];
          callback();
        }
      };

      loadedApps[name].watchers.forEach(function(watch){
        configHelpers.unwatchConfig(watch);
      });

      if (appModule.stop === undefined) {
        closeServer();
      } else {
        appModule.stop(closeServer);
      }
    } else {
      callback();
    }
  },

  /**
   * Stop all running apps,
   *
   * @param {Function} callback Termination.
   */
  stopAll: function (callback) {
    function stopApp (app, cb) {
      var application = config.apps[app];
      applicationHelpers.stop(application, cb);
    }
    async.eachSeries(Object.keys(config.apps), stopApp, callback);
  },

  /**
   * Start all running apps,
   *
   * @param db The datastore.
   * @param {Function} callback Termination.
   */
  startAll: function (db, callback) {
    function startApp (app, cb) {
      var application = config.apps[app];
      applicationHelpers.start(application, db, cb);
    }
    async.eachSeries(Object.keys(config.apps), startApp, callback);
  }
};

var controllers = {

  /**
   * Proxy requests targeting apps.
   */
  proxyPrivate: function (req, res) {
    var appName = req.params.name;
    var appPort = routes[appName];
    req.url = req.url.substring(('/apps/' + appName).length);
    if (port !== null) {
      proxy.web(req, res, { target: 'http://localhost:' + appPort });
    } else {
      res.send(404);
    }
  },

  /**
   * Proxy requests targeting apps public path.
   */
  proxyPublic: function (req, res) {
    var appName = req.params.name;
    var appPort = routes[appName];
    req.url = '/public' + req.url.substring(('/public/' + appName).length);
    if (port !== null) {
      proxy.web(req, res, { target: 'http://localhost:' + appPort });
    } else {
      res.send(404);
    }
  }

};


var mainAppHelper = {

  /**
   * Configure properly proxy: handle errors and websockets.
   *
   * @param {Object} server Express server.
   */
  initializeProxy: function (server) {

    proxy = httpProxy.createProxyServer(/*{agent: new http.Agent()}*/);

    proxy.on('error', function onProxyError(err, req, res) {
      LOGGER.raw(err);
      res.status(500).send(err);
    });

    server.on('upgrade', function onProxyUpgrade(req, socket, head) {

      function proxyWS(port) {
        proxy.ws(req, socket, head, {
          target: 'ws://localhost:' + port,
          ws: true
        });
      }

      req.originalUrl = req.url;

      var publicOrPrivate = '';
      var slug = '';

      var urlParts = req.url.split('/');
      if (urlParts.length >= 3) {
        publicOrPrivate = urlParts[1];
        slug = urlParts[2];
      }

      if (publicOrPrivate === 'public') {
        req.url = req.url.replace('/public/' + slug, '/public');
        proxyWS(routes[slug]);

      } else if (publicOrPrivate === 'apps') {
        req.url = req.url.replace('/apps/' + slug, '');
        proxyWS(routes[slug]);

      } else {
        proxyWS(process.env.DEFAULT_REDIRECT_PORT);
      }
    });

    return proxy;
  },

  /**
   * setup main application server.
   *
   * @param program
   * @param app
   * @returns {*}
   */
  start: function (program, app) {
    // Set SSL configuration if certificates path are properly set.
    var options = {};
    if (config.ssl !== undefined) {
      options.key = fs.readFileSync(config.ssl.key, 'utf8');
      options.cert = fs.readFileSync(config.ssl.cert, 'utf8');
      server = https.createServer(options, app);
    } else  {
      server = http.createServer(app);
    }

    var mainPort = configHelpers.getServerPort(program);
    server.listen(mainPort);
    mainAppHelper.initializeProxy(server);

    LOGGER.info(
      'Cozy Light server is listening on port ' + mainPort + '...'
    );

    app.all('/apps/:name/*', controllers.proxyPrivate);
    app.all('/apps/:name*', controllers.proxyPrivate);

    app.all('/public/:name/*', controllers.proxyPublic);
    app.all('/public/:name*', controllers.proxyPublic);

    return server;
  },

  /**
   */
  stop: function (done) {
    var list = [];
    if (server) {
      list.push(function (callback) {
        try {
          server.close(callback);
        } catch (err) {
          callback();
        }
      });
    }
    if (proxy) {
      list.push(function (callback) {
        if (proxy.close !== undefined) {
          proxy.close(); // does not work well, or has no callback
        }
        callback();
      });
    }
    async.series(list, done);
  }
};

// Actions

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

    var app = express();
    var morgand = morgan('combined');
    if (expressLog) {
      app.use(morgand);
    }

    config.pouchdb = Pouchdb;

    pluginHelpers.startAll(app, function(){
      mainAppHelper.start(program, app);
      applicationHelpers.startAll(db, function() {
        // always connect it after the proxy
        // https://github.com/nodejitsu/node-http-proxy/issues/180
        var jsonParser = bodyParser.json();
        var urlencodedParser = bodyParser.urlencoded({ extended: false });
        app.use(urlencodedParser);
        app.use(jsonParser);
        // Reload apps when file configuration is modified
        configHelpers.watchConfig(actions.restart);
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
          port = defaultAppsPort;
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
      loadedPlugins = {};
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
    var endProcess = function (err) {
      if (err) {
        LOGGER.error('Cozy Light was not properly terminated.');
      } else {
        LOGGER.info('Cozy Light was properly terminated.');
      }

      if (configHelpers.mainWatcher) {
        fs.unwatchFile( 'config.json' );
      }

      if (db) {
        db.close();
      }

      if (callback) {
        callback();
      }
    };
    actions.stop(endProcess);
  },

  /**
   * Manage properly exit of the process when SIGINT signal is triggered.
   * It asks to every plugin to end properly.
   */
  exitNow: function () {
    var killProcess = function (err) {
      LOGGER.info('Killing process.');

      /*eslint-disable */
      var handlesC = process._getActiveHandles().length;
      var requestsC = process._getActiveRequests().length;
      /*eslint-enable */
      if (handlesC + requestsC > 0){
        LOGGER.info('Has remaining open handles...');
        LOGGER.info('_getActiveHandles ' + handlesC);
        LOGGER.info('_getActiveRequests ' + requestsC);
      }
      /*eslint-disable */
      process.exit(err ? 1 : 0);
      /*eslint-enable */
    };
    actions.exit(killProcess);
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
        configWatcher.one(callback);
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
          configWatcher.one(callback);
          configHelpers.removeApp(app);
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
        configHelpers.addPlugin(plugin, manifest);
        pluginHelpers.loadPlugin(plugin);
        configWatcher.one(callback);
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
    LOGGER.info('Removing ' + plugin + '...');
    if (config.plugins[plugin] === undefined) {
      LOGGER.error(plugin + ' is not installed.');
    } else {
      var module = config.plugins[plugin].name;
      npmHelpers.uninstall(module, function remotePluginFromConfig (err) {
        if (err) {
          LOGGER.raw(err);
          LOGGER.error('npm did not uninstall ' + plugin + ' correctly.');
          callback(err);
        } else {
          LOGGER.info(plugin + ' successfully uninstalled.');
          delete loadedPlugins[plugin];
          configWatcher.one(callback);
          configHelpers.removePlugin(plugin);
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



// Export module for testing purpose.

var cozyLight = module.exports = {
  configHelpers: configHelpers,
  nodeHelpers: nodeHelpers,
  npmHelpers: npmHelpers,
  applicationHelpers: applicationHelpers,
  mainAppHelper: mainAppHelper,
  actions: actions,
  controllers: controllers
};
