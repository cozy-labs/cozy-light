#!/usr/bin/env node

var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var fsExtra = require('fs-extra');
var pathExtra = require('path-extra');
var program = require('commander');
var npm = require('npm');
var request = require('request-json-light');
var express = require('express');
var morgan = require('morgan');
var async = require('async');
var printit = require('printit');
var Pouchdb = require('pouchdb');
var httpProxy = require('http-proxy');
var pkg = require('./package.json');

// Constants
const LOGGER = printit({ prefix: 'Cozy Light' });
const DEFAULT_PORT = 19104;

// 'Global' variables

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


// Helpers


var configHelpers = {

  /**
   * List of function to run when configuration file is changed.
   */
  watchers: [],

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
    var sourcePath = pathExtra.join(__dirname, 'node_modules', name);

    if (!fs.existsSync(destPath)) {
      fsExtra.copySync(sourcePath, destPath);
    }
  },

  /**
   * Set configHelpers HOME and CONFIG_PATH
   * Create HOME folder
   * Change CWD to HOME folder
   * Initialize a default config file if none exists
   * Manage config file watcher subscriptions
   * Load and return config file.
   *
   * @param {String} customHome The home path where .cozy-light folder belongs
   *
   * @return {Object} config
   */
  init: function (customHome) {
    // default home dir is ~/.cozy-light
    // default config path is ~/.cozy-light/package.json
    home = customHome || pathExtra.join(pathExtra.homedir(), '.cozy-light');
    configPath = pathExtra.join(home, 'config.json');

    fsExtra.mkdirsSync(home);
    process.chdir(home);
    db = new Pouchdb('cozy');

    configHelpers.createConfigFile();
    configHelpers.copyDependency('pouchdb');
    proxy = httpProxy.createProxyServer(/*{agent: new http.Agent()}*/);

    var watchOptions = {persistent: false, interval: 1000};
    var onConfigChanged = function () {
      configHelpers.watchers.forEach(function (watcher) {
        watcher();
      });
    };
    configHelpers.mainWatcher = fs.watchFile(
        configPath,
        watchOptions,
        onConfigChanged
    );

    return configHelpers.loadConfigFile();
  },


  /**
   * Subscribe an handler
   * to config file updates
   *
   * @return {Object} config
   */
  watchConfig: function (newWatcher) {
    var isSet = false;
    configHelpers.watchers.forEach(function (watcher) {
      if (watcher == newWatcher) { isSet = true; }
    });
    if (!isSet) { configHelpers.watchers.push(newWatcher); }
  }
};

// Express app controllers

var controllers = {

  /**
   * Returns application list, plugin data to show and resource consumption.
   */
  index: function (req, res) {

    config = configHelpers.loadConfigFile();
    var memoryUsage = process.memoryUsage();
    memoryUsage = Math.ceil(memoryUsage.heapUsed / 1000000);

    var applications = [];
    var plugins = [];

    if (Object.keys(config.apps).length > 0) {
      Object.keys(config.apps).forEach(function (key) {
        applications.push(config.apps[key]);
      });
    }

    Object.keys(loadedPlugins).forEach(function (pluginName) {
      var plugin = loadedPlugins[pluginName];
      if (plugin.getTemplate !== undefined) {
        var template = plugin.getTemplate(config);
        plugins.push(template);
      }
    });

    res.send({
      apps: applications,
      plugins: plugins,
      resources: {
        memoryUsage: memoryUsage
      }
    });
  },

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
  },

  /**
   * If request path don't match any existing route, it's redirected to
   */
  automaticRedirect: function (req, res) {
    if (req.headers.referer !== undefined) {
      var referer = url.parse(req.headers.referer);
      var app = referer.path.split('/')[2];
      if (app !== undefined && app !== '') {
        var link = url.parse(encodeURI(req.url));
        link.path = link.path.split('?')[0];
        link.path = '/apps/' + app + link.path;
        link.pathname = link.path;
        if (link.path.indexOf(link.query) > 0) {
          link.query = '';
          link.search = '';
        }
        if (link.search === null) {
          link.search = '';
        }
        res.redirect(link.format(), 307);
      } else {
        res.redirect('/', 307);
      }
    } else {
      res.send(404);
    }
  }
};

var nodeHelpers = {

  /**
   * Clear require cache given app name
   *
   * @param {String} app App to clear from require cache.
   */
  clearRequireCache: function (app) {
    var modulePath = configHelpers.modulePath(app);
    for (var name in require.cache) {
      if (name.match(new RegExp('^' + modulePath))) {
        delete require.cache[name];
      }
    }
  },

  /**
   * Clear close a node server by calling
   * each socket.destroy on close event
   *
   * @param {Object} s Server to configure.
   */
  clearCloseServer: function (s) {
    (function(server, sockets){
      server.on('connection', function(socket) {
        sockets.push(socket);
        socket.once('close', function () {
          sockets.splice(sockets.indexOf(socket), 1);
        });
        server.on('close', function () {
          for (var socketId in sockets) {
            sockets[socketId].destroy();
          }
        });
      });
    })(s,[]);
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
    npm.load({}, function () {
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
    if( fs.existsSync(app)
      && fs.existsSync(pathExtra.join(app,'package.json')) ){
      fs.readFile(pathExtra.join(app,'package.json'),function(err, manifest){
        if (err) {
          LOGGER.error(err);
          callback(err);
        }else{
          callback(err, JSON.parse(manifest), 'file');
        }
      });
    }else{
      var client = request.newClient( 'https://raw.githubusercontent.com/');
      var manifestUrl = app + '/master/package.json';

      LOGGER.info('Installing application ' + app + '...');
      client.get(manifestUrl, function (err, res, manifest) {
        if (res.statusCode !== 200) {
          LOGGER.error(err);
          callback(err);
        }else if (err) {
          LOGGER.error(err);
          callback(err);
        }else{
          callback(err,manifest, 'url');
        }
      });
    }
  },

  /**
   * Fetch and install application or plugin from an url or a path
   *
   * @param {String} app App or Plugin name to fetch from url or path.
   * @param {Function} callback Termination.
   */
  fetchInstall: function (app, callback) {
    npmHelpers.fetchManifest(app, function(err, manifest, type){
      if( err ){ return callback(err); }
      var cb = function(err){
        callback(err, manifest, type);
      };
      if( type == 'file' ) {
        npmHelpers.link(app, cb);
      } else {
        npmHelpers.install(app, cb);
      }
    });
  }
};

var pluginHelpers = {

  /**
   * Start given plugin.
   *
   * @param pluginName The plugin name to start.
   * @param applicationServer The application server to connect the plugin on.
   * @param callback Termination.
   */
  start: function (pluginName, applicationServer, callback) {
    if( config.plugins[pluginName] == undefined ){
      LOGGER.error(
        'Plugin ' + pluginName + ' not installed !');
    }else if( loadedPlugins[pluginName] !== undefined ){
      LOGGER.error(
        'Plugin ' + pluginName + ' already started !');
    }else{
      try {
        var pluginConfig = config.plugins[pluginName];
        var pluginPath = configHelpers.modulePath(pluginConfig.name);
        var plugin = require(pluginPath);
        var options = {
          name: pluginConfig.name,
          displayName: pluginConfig.displayName,
          version: pluginConfig.version,
          description: pluginConfig.description,
          configPath: configPath,
          home: home,
          npmHelpers: npmHelpers,
          proxy: proxy
        };
        plugin.configure(options, config, program);

        loadedPlugins[pluginName] = plugin;

        if (plugin.configureAppServer !== undefined) {
          LOGGER.info('Configuring plugin ' + pluginName + '...');
          var logResult = function(){
            LOGGER.info('Plugin ' + pluginName + ' configured.');
            callback();
          };
          return plugin.configureAppServer(applicationServer, config, routes,
            logResult);
        }

      } catch(err) {
        console.log(err);
        LOGGER.error('Plugin ' + pluginName + ' loading failed.');
        return callback(err);
      }
    }
    callback();
  },

  /**
   * Stop given plugin.
   *
   * @param pluginName The plugin name to start.
   * @param callback Termination.
   */
  stop: function (pluginName, callback) {
    if( config.plugins[pluginName] == undefined ){
      LOGGER.error(
        'Plugin ' + pluginName + ' not installed !');
    }else if( loadedPlugins[pluginName] == undefined ){
      LOGGER.error(
        'Plugin ' + pluginName + ' not started !');
    }else{
      var options = config.plugins[pluginName];
      delete loadedPlugins[pluginName];
      try {
        var plugin = require( configHelpers.modulePath(options.name) );
        nodeHelpers.clearRequireCache(options.name);
        if (plugin.onExit !== undefined) {
          return plugin.onExit(options, config, function(err){
            console.log(err);
            LOGGER.error('Plugin ' + pluginName + ' failed for termination.');
            callback(err);
          });
        }
      } catch(err) {
        console.log(err);
        LOGGER.error('Plugin ' + pluginName + ' failed for termination.');
      }
      callback();
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
    var plugins = Object.keys(loadedPlugins || {});
    async.eachSeries(plugins, pluginHelpers.stop, callback);
  }
};


var serverHelpers = {

  /**
   * Configure properly proxy: handle errors and websockets.
   *
   * @param {Object} server Express server.
   */
  initializeProxy: function (server) {

    proxy.on('error', function onProxyError(err, req, res) {
      LOGGER.raw(err);
      res.send(err, 500);
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
      if(urlParts.length >= 3) {
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
   * Create dashboard application server.
   */
  createApplicationServer: function (callback) {
    var app = express();
    app.use(morgan('combined'));
    app.use(express.static(pathExtra.join(__dirname, 'assets'),
            { maxAge: 86400000 }));

    config.pouchdb = Pouchdb;
    config.appPort = port;

    var setupApplicationServer = function (err) {
      if(err) { LOGGER.error(err); }

      app.all('/home', controllers.index);

      app.all('/apps/:name/*', controllers.proxyPrivate);
      app.all('/apps/:name*', controllers.proxyPrivate);

      app.all('/public/:name/*', controllers.proxyPublic);
      app.all('/public/:name*', controllers.proxyPublic);

      app.all('/*', controllers.automaticRedirect);

      callback(err,app);
    };

    pluginHelpers.startAll(app, setupApplicationServer);
  },

  /**
   * Start given classic application as a new listening server. List of
   * function to run on when configuration file is changed. List of function to
   * run on when configuration file is changed.
   *
   * @param {Object} application The application to start.
   * @param {Object} db The database to give as parameter to the application
   *                      (they all share the same datastore).
   * @param {Function} callback Termination.
   */
  startApplication: function (application, db, callback) {

    if (application.type === undefined || application.type === 'classic') {

      var name = application.name;

      var appModule;
      try {
        appModule = require( configHelpers.modulePath(name) );
      } catch(err) {
        LOGGER.raw(err);
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
          server: null
        };

        var options = {db: db, port: port, silent: true};
        appModule.start(options, function (err, app, server) {
          if (err) { LOGGER.error(err); }

          nodeHelpers.clearCloseServer(server);
          loadedApps[name].server = server;
          routes[name] = port;
          LOGGER.info(
            'Application ' + name + ' is now running on port ' + port + '...');
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
  stopApplication: function (application, callback) {
    var name = application.name;

    if(loadedApps[name] !== undefined) {
      var appModule = loadedApps[name].appModule;

      var closeServer = function () {
        try {
          loadedApps[name].server.close(function logInfo (err) {
            if (err) {
              LOGGER.raw(err);
              LOGGER.warn('An error occured while stopping ' + name);
            } else {
              LOGGER.info('Application ' + name + ' is now stopped.');
            }
            callback();
          });
        } catch (err) {
          LOGGER.raw(err);
          LOGGER.warn('An error occured while stopping ' + name);
          callback();
        }
      };

      if (appModule.stop === undefined) {
        closeServer();
      } else {
        appModule.stop(closeServer);
      }
      nodeHelpers.clearRequireCache(name);
      delete loadedApps[name];

    } else {
      callback();
    }
  },

  /**
   * Stop all running apps,
   *
   * @param {Function} callback Termination.
   */
  stopAllApps: function (callback) {
    function stopApp (app, cb) {
      var application = config.apps[app];
      serverHelpers.stopApplication(application, cb);
    }
    async.eachSeries(Object.keys(config.apps), stopApp, callback);
  },

  /**
   * Start all running apps,
   *
   * @param db The datastore.
   * @param {Function} callback Termination.
   */
  startAllApps: function (db, callback) {
    function startApp (app, cb) {
      var application = config.apps[app];
      serverHelpers.startApplication(application,db, cb);
    }
    async.eachSeries(Object.keys(config.apps), startApp, callback);
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

    serverHelpers.createApplicationServer(function (err, app) {

      if (err) {
        LOGGER.raw(err);
        LOGGER.error('An error occurred while creating server');
      } else {

        var startServer = function (err) {
          if (err) {
            LOGGER.raw(err);
            LOGGER.error('An error occurred while creating server');
          } else {

            // Take port from command line args, or config,
            // fallback to default one
            // if none set.
            var mainPort = DEFAULT_PORT;
            if (program.port !== undefined) {
              mainPort = program.port;
            } else if (config.port !== undefined) {
              mainPort = config.port;
            }

            // Set SSL configuration if certificates path are properly set.
            var options = {};
            if (config.ssl !== undefined) {
              options.key = fs.readFileSync(config.ssl.key, 'utf8');
              options.cert = fs.readFileSync(config.ssl.cert, 'utf8');
              server = https.createServer(options, app);
            } else  {
              server = http.createServer(app);
            }
            server.listen(mainPort);
            nodeHelpers.clearCloseServer(server);
            serverHelpers.initializeProxy(server);
            LOGGER.info(
              'Cozy Light Dashboard is running on port ' + mainPort + '...');

            // Reload apps when file configuration is modified
            configHelpers.watchConfig(actions.restart);
            if (callback !== undefined && typeof(callback) === 'function') {
              callback(null, app, server);
            }
          }
        };
        serverHelpers.startAllApps(db,startServer);
      }
    });
  },

  /**
   * Stop all running applications.
   *
   * @param {Function} callback Termination.
   */
  stop: function (callback) {
    serverHelpers.stopAllApps(function (err) {
      if (err) {
        if( callback ) callback(err);
      } else {
        pluginHelpers.stopAll(function(err){
          if (err) {
            if( callback ) callback(err);
          } else {
            if (server !== null) {
              server.close(function(){
                LOGGER.info('Cozy Light Dashboard is now stopped.');
                server = null;
                callback();
              });
            } else {
              if( callback ) callback();
            }
            proxy.close();
            proxy = null;
            port = defaultAppsPort;
          }
        });
      }
    });
  },

  /**
   * Stops application server, its apps, and its plugins,
   * reload everyone, then restart everyone
   */
  restart: function (callback) {
    LOGGER.info('Stopping apps...');
    actions.stop(function(){
      LOGGER.info('Apps stopped.');
      loadedPlugins = {};
      loadedApps = {};
      routes = {};
      LOGGER.info('Restarting all apps...');
      actions.start(program,function(){
        LOGGER.info('Cozy light was properly restarted.');
        if( callback ){ callback(); }
      });
    });
  },

  /**
   * Manage properly exit of the process when SIGINT signal is triggered.
   * It asks to every plugin to end properly.
   */
  exit: function () {
    var endProcess = function (err) {
      if (err) {
        LOGGER.error('Cozy light was not properly terminated.');
        process.exit(1);
      } else {
        LOGGER.info('Cozy light was properly terminated.');
        process.exit(0);
      }
    };
    actions.stop(endProcess);
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
      } else {
        configHelpers.addApp(app, manifest);
        LOGGER.info(app + ' installed. Enjoy!');
      }
      if (callback !== undefined && typeof(callback) === 'function') {
        callback(err);
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
        } else {
          configHelpers.removeApp(app);
          LOGGER.info(app + ' successfully uninstalled.');
        }
        if (callback !== undefined && typeof(callback) === 'function') {
          callback(err);
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
      } else {
        configHelpers.addPlugin(plugin, manifest);
        LOGGER.info(plugin + ' installed. Enjoy!');
      }
      if (callback !== undefined && typeof(callback) === 'function') {
        callback(err);
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
      npmHelpers.uninstall(plugin, function remotePluginFromConfig (err) {
        if (err) {
          LOGGER.raw(err);
          LOGGER.error('npm did not uninstall ' + plugin + ' correctly.');
        } else {
          LOGGER.info(plugin + ' successfully uninstalled.');
          configHelpers.removePlugin(plugin);
        }
        if (callback !== undefined && typeof(callback) === 'function') {
          callback(err);
        }
      });
    }
  },

  /**
   * Display configuration file contents: apps configuration and user settings.
   */
  displayConfig: function () {
    LOGGER.raw(JSON.stringify(configHelpers.loadConfigFile(), null, 2));
  }
};


// CLI

program
  .version(pkg.version);

program
  .command('start')
  .option('-p, --port <port>', 'port number on which Cozy Light is available')
  .description('run remote setup commands')
  .action(actions.start);

program
  .command('install <app>')
  .description('Add app to current Cozy Light')
  .action(actions.installApp);

program
  .command('uninstall <app>')
  .description('Remove app from current Cozy Light')
  .action(actions.uninstallApp);

program
  .command('add-plugin <plugin>')
  .description('Add plugin to current Cozy Light')
  .action(actions.installPlugin);

program
  .command('remove-plugin <plugin>')
  .description('Remove plugin from current Cozy Light')
  .action(actions.uninstallPlugin);

program
  .command('display-config')
  .description('Display current config of Cozy Light')
  .action(actions.displayConfig);

program
  .command('*')
  .description('display help')
  .action(program.outputHelp);


// Init Cozy Light

configHelpers.init();


// Process arguments

if(module.parent === null) {
  program.parse(process.argv);

// Manage errors

  process.on('uncaughtException', function (err) {
    if (err) {
      LOGGER.warn('An exception is uncaught');
      LOGGER.raw(err);
      actions.stop();
      process.exit(1);
    }
  });


// Manage termination

  process.on('SIGINT', actions.exit);

}


// If arguments doesn't match any of the one set, it displays help.

if (!process.argv.slice(2).length) {
  program.outputHelp();
}


// Export module for testing purpose.

module.exports = {
  configHelpers: configHelpers,
  npmHelpers: npmHelpers,
  serverHelpers: serverHelpers,
  actions: actions,
  controllers: controllers
};
