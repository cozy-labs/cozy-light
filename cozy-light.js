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
//
// Create config file and folders and prepare PouchDB dependency.
var home = '';
var configPath = '';
var routes = {};
var loadedApps = {};
var loadedPlugins = {};
var port = 18001;
var proxy = null;
var config = null;
var server = null;
var db = new Pouchdb('cozy');


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
      if (watcher == newWatcher){ isSet = true; }
    });
    if (!isSet) { configHelpers.watchers.push(newWatcher); }
  }
};


// Express app controllers

var controllers = {

  /**
   * Render front page and list available applications.
   */
  index: function (req, res) {

    config = configHelpers.loadConfigFile();
    var memoryUsage = process.memoryUsage();
    memoryUsage = Math.ceil(memoryUsage.heapUsed / 1000000);

    var template = " \
    <html> \
    <head> \
        <meta http-equiv='content-type' content='text/html; charset=utf-8'> \
        <title>Cozy Light: Your Personal Cloud at Home</title> \
        <style type='text/css' media='screen'> \
          @font-face { \
            font-family: mavenpro; \
            src: url(maven-pro-light-200.otf); \
          } \
 \
          @font-face { \
            font-family: signika; \
            src: url(soure-sans-pro.ttf); \
          } \
 \
          body { \
            font-family: mavenpro; \
            padding: 20px; \
          } \
 \
          h1 { \
            margin-top: 0; \
            font-weight: normal; \
            font-size: 36px; \
          } \
          h2 { \
            font-weight: normal; \
            margin-top: 60px; \
          } \
 \
          .logo { \
            float: left;  \
            margin-right: 20px; \
          } \
 \
          .app-line { \
            text-transform: uppercase; \
            font-size: 16px; \
          } \
 \
          a { \
            font-weight: bold; \
            Text-decoration: none; \
            color: black; \
          } \
          a:hover { \
            color: orange; \
          } \
          a:visited { \
            color: black; \
          } \
 \
          } \
          .app-line span { \
            font-family: signika \
            text-transform: normal; \
            font-size: 14px; \
          } \
        </style> \
    </head> \
    <body> \
    <a href='http://cozy.io' target='_blank'> \
    <img class='logo' src='happycloud.png' /> \
    </a>  \
    <h1>Cozy Light</h1> \
    <h2>Your applications</h2> \
    ";

    if (Object.keys(config.apps).length > 0) {
      Object.keys(config.apps).forEach(function (key) {
        var app = config.apps[key];
        var name = app.name;
        template += "<p class='app-line'><a href='apps/" +
                    name + "/' target='_blank'>";
        template += app.displayName + '</a><span>&nbsp;(' +
                    app.version + ')</span></p>';
      });
    } else {
      template += '<em>no application installed.</em>';
    }

    Object.keys(loadedPlugins).forEach(function (pluginName) {
      var plugin = loadedPlugins[pluginName];
      if (plugin.getTemplate !== undefined) {
        template += plugin.getTemplate(config);
      }
    });

    template += '<h2>Resources</h2><p>Occupied memory:&nbsp;' +
                memoryUsage + 'MB</p>';

    template += ' \
    </body> \
    </html> \
      ';
    res.send(template);
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
   * Remove application source and dependencies using NPM lib.
   *
   * @param {String} app App to fetch from NPM.
   * @param {Function} callback Callback to run once work is done.
   */
  uninstall: function (app, callback) {
    npm.load({}, function () {
      npm.commands.uninstall([app], callback);
    });
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
      console.log(err);
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
      if(urlParts.length === 3) {
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
    var runPlugin = function (pluginName, cb) {
      var plugin = loadedPlugins[pluginName];
      if (plugin.configureAppServer !== undefined) {
        LOGGER.info('Configuring plugin ' + pluginName + '...');
        plugin.configureAppServer(app, config, routes, function logResult() {
          LOGGER.info('Plugin ' + pluginName + ' configured.');
          cb();
        });
      } else {
        cb();
      }
    };

    async.eachSeries(Object.keys(loadedPlugins), runPlugin, function (err) {
      if(err) { LOGGER.error(err); }

      app.all('/', controllers.index);

      app.all('/apps/:name/*', controllers.proxyPrivate);
      app.all('/apps/:name*', controllers.proxyPrivate);

      app.all('/public/:name/*', controllers.proxyPublic);
      app.all('/public/:name*', controllers.proxyPublic);

      app.all('/*', controllers.automaticRedirect);

      callback(app);
    });
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
        console.log(err);
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

      var closeServer = function(){
        try {
          loadedApps[name].server.close(function logInfo (err) {
            if (err) {
              LOGGER.warn('An error occured while stopping ' + name);
              LOGGER.raw(err);
              callback();
            } else {
              LOGGER.info('Application ' + name + ' is now stopped.');
              callback();
            }
          });
        } catch (err) {
          LOGGER.warn(err);
          callback();
        }
      };

      if (appModule.stop === undefined) {
        closeServer();
      } else {
        appModule.stop(closeServer);
      }
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
   * Stop currently running apps,
   * clear require cache of each re started apps,
   * refresh config from config file
   * and restart all apps described by the config.
   * It's aimed to be loaded after a configuration change.
   *
   * @param {Function} callback Termination.
   */
  reloadApps: function(callback) {

    var runApp = function (key, callback) {
      var application = config.apps[key];
      var modulePath = configHelpers.modulePath(key);

      // Clean require's cache, otherwise same code is loaded twice
      for (var name in require.cache) {
        if (name.match(new RegExp('^' + modulePath))) {
          delete require.cache[name];
        }
      }
      serverHelpers.startApplication(application, db, callback);
    };

    LOGGER.info('Stopping apps...');
    serverHelpers.stopAllApps(function() {
      LOGGER.info('Apps stopped.');
      loadedApps = {};
      routes = {};
      LOGGER.info('Restarting all apps...');
      async.eachSeries(Object.keys(config.apps), runApp, function() {
        LOGGER.info('Apps started.');
        if (callback !== undefined && typeof(callback) === 'function') {
          callback();
        }
      });
    });
  },


  /**
   * Require and configure every plugins listed in the configuration file.
   */
  loadPlugins: function() {
    if(config.plugins !== undefined && typeof(config.plugins) === 'object') {
      Object.keys(config.plugins).forEach(function loadPlugin (pluginName) {
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
        } catch(err) {
          console.log(err);
          LOGGER.error('Plugin ' + pluginName + ' loading failed.');
        }
      });
    }
  },

  /**
   * Manage properly exit of the process when SIGINT signal is triggered.
   * It asks to every plugin to end properly.
   */
  exitHandler: function (err, callback) {
    if(err) {
      LOGGER.error('An error occured on termination');
      console.log(err);
    } else if(config.plugins !== undefined) {

      var exitPlugin = function (pluginName, cb) {
        var options = config.plugins[pluginName];
        try {
          var plugin = require( configHelpers.modulePath(options.name) );
          if (plugin.onExit !== undefined) {
            plugin.onExit(options, config, cb);
          } else {
            cb();
          }
        } catch(err) {
          console.log(err);
          LOGGER.error('Plugin ' + pluginName +
                       ' loading failed to terminate.');
          cb();
        }
      };

      var endProcess = function (err) {
        if (err) {
          LOGGER.error('Cozy light was not properly terminated.');
          LOGGER.raw(err);
          callback(err);
        } else {
          LOGGER.info('Cozy light was properly terminated.');
          callback();
        }
      };

      async.eachSeries(Object.keys(config.plugins), exitPlugin, endProcess);

    } else {
      LOGGER.info('Cozy Light exited properly.');
    }
  },

  reload: function () {
    LOGGER.info(
      'Configuration file changed. Reloading configuration...');
    config = configHelpers.loadConfigFile();
    serverHelpers.reloadApps();
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

    var runApp = function (key, callback) {
      var application = config.apps[key];
      serverHelpers.startApplication(application, db, callback);
    };

    configHelpers.watchers = [];
    serverHelpers.createApplicationServer(function (app) {
      var startServer = function (err) {
        if (err) { LOGGER.error(err); }

        // Take port from command line args, or config, fallback to default one
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
          server = https.createServer(options, app).listen(mainPort);
        } else  {
          server = http.createServer(app).listen(mainPort);
        }
        serverHelpers.initializeProxy(server);
        LOGGER.info(
          'Cozy Light Dashboard is running on port ' + mainPort + '...');

        // Reload apps when file configuration is modified
        configHelpers.watchConfig(serverHelpers.reload);
        if (callback !== undefined && typeof(callback) === 'function') {
          callback(null, app, server);
        }
      };

      async.eachSeries(Object.keys(config.apps), runApp, startServer);
    });
  },

  /**
   * Stop all running applications.
   *
   * @param {Function} callback Termination.
   */
  stop: function (callback) {
    serverHelpers.stopAllApps(callback);
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
    var client = request.newClient( 'https://raw.githubusercontent.com/');
    var manifestUrl = app + '/master/package.json';

    LOGGER.info('Installing application ' + app + '...');
    client.get(manifestUrl, function (err, res, manifest) {
      if (err) {
        LOGGER.error(err);
        LOGGER.error('Cannot find given app manifest. Make sure it lives on ' +
                 'Github');
      } else {
        npmHelpers.install(app, function (err) {
          if (err) {
            LOGGER.raw(err);
            LOGGER.error(app + ' installation failed.');

          } else {
            configHelpers.addApp(app, manifest);
            LOGGER.info(app + ' installed. Enjoy!');
          }
          if (callback !== undefined && typeof(callback) === 'function') {
            callback();
          }
        });
      }
    });
  },

  /**
  * Remove app from config and its source from node module folder.
  *
  * @param {String} app App to uninstall.
  */
  uninstallApp: function (app, callback) {
    LOGGER.info('Uninstalling ' + app + '...');
    if(config.apps[app] === undefined) {
      LOGGER.error(app + ' is not installed.');
    } else {
      var module = config.apps[app].name;
      npmHelpers.uninstall(module, function () {
        configHelpers.removeApp(app);
        LOGGER.info(app + ' successfully uninstalled.');
        if (callback !== undefined && typeof(callback) === 'function') {
          callback();
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
  */
  installPlugin: function (plugin){
    var client = request.newClient( 'https://raw.githubusercontent.com/');
    var manifestUrl = plugin + '/master/package.json';

    LOGGER.info('Installing plugin ' + plugin + '...');
    client.get(manifestUrl, function (err, res, manifest) {
      if (res.statusCode !== 200) {
        LOGGER.error(err);
        LOGGER.error('Cannot find given plugin manifest.');
        LOGGER.error('Make sure it lives on Github.');
        LOGGER.error(plugin + ' installation failed.');
      } else {
        configHelpers.addPlugin(plugin, manifest);
        npmHelpers.install(plugin, function (err) {
          if (err) {
            LOGGER.raw(err);
            LOGGER.error(plugin + ' installation failed.');

          } else {
            LOGGER.info(plugin + ' installed. Enjoy!');
          }
        });
      }
    });
  },


  /**
  * Remove plugin from config and its source from node module folder.
  *
  * @param {String} plugin Plugin to remove.
  */
  uninstallPlugin: function (plugin){
    LOGGER.info('Removing ' + plugin + '...');
    if(config.plugins[plugin] === undefined) {
      LOGGER.error(plugin + ' is not installed.');
    } else {
      npmHelpers.uninstall(plugin, function () {
        LOGGER.info(plugin + ' successfully uninstalled.');
        configHelpers.removePlugin(plugin);
      });
    }
  },

  /**
  * Display configuration file contents: apps configuration and user settings.
  */
  displayConfig: function () {
    console.log(JSON.stringify(configHelpers.loadConfigFile(), null, 2));
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
  serverHelpers.loadPlugins();

  program.parse(process.argv);
}


// If argumernts doesn't match any of the one set, it displays help.

if (!process.argv.slice(2).length) {
  program.outputHelp();
}


// Manage errors

process.on('uncaughtException', function (err) {
  LOGGER.warn('An exception is uncaught');
  throw err;
});


// Manage termination

process.on('SIGINT', function handleExit (err) {
  serverHelpers.exitHandler(err, function terminate (err) {
    if (err) throw err;

    if (server !== null) {
      server.close();
      actions.stop();
    }
    process.exit(0);
  });
});


// Export module for testing purpose.

module.exports = {
  configHelpers: configHelpers,
  npmHelpers: npmHelpers,
  serverHelpers: serverHelpers,
  actions: actions,
  controllers: controllers
};
