var symbols = require('symbolsjs');
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var async = require('async');

var nodeHelpers = require('./helpers/node');
var logger = require('./helpers/logger');
var routes = require('./routes');
var configHelpers = require('./config');

var loadedApps = {};
var port = configHelpers.getDefaultAppsPort();


module.exports = applicationHelpers = {

  resetDefaultPort: function () {
    port = configHelpers.getDefaultAppsPort();
  },

  /**
   * Start given classic application as a new listening server.
   * List of function to run on when configuration file is changed.
   * List of function to run on when configuration file is changed.
   * NB: Do not start given app if it is disabled.
   *
   * @param {Object} application The application to start.
   * @param {Function} callback Termination.
   */
  start: function (application, callback) {
    var cozyLight = require('./cozy-light');

    var name = application.name;

    if ((application.type === undefined || application.type === 'classic')
      && application.disabled !== true) {

      var appModule;
      var modulePath = configHelpers.modulePath(name);
      var cozyFile = pathExtra.join(modulePath, 'cozy.js');

      try {
        appModule = require(cozyFile);

      } catch (err) {
        var missCozyFile = new RegExp(
          'Cannot find module \'' + cozyFile + '\'');

        if (!err.toString().match(missCozyFile)) {
          logger.raw(err);
        }

        try {
          appModule = require( modulePath );

        } catch (err) {
          logger.error( 'Application mismatch' );

          if (!fs.existsSync( modulePath )) {
            logger.error( 'Package directory is missing in ' );
          }

          if (!fs.existsSync( modulePath + '/package.json' )) {
            logger.error( 'Package json file is missing' );
          }

          logger.error(modulePath);
          logger.raw(err);
        }
      }

      if (appModule === undefined) {
        logger.error('Can\'t load application ' + name + '.');
        nodeHelpers.invoke(callback);

      } else if (appModule.start === undefined) {
        logger.error('Can\'t start application ' + name + '.');
        nodeHelpers.invoke(callback);

      } else {

        loadedApps[name] = {
          appModule: appModule,
          server: null,
          sockets: []
        };

        // use getPort from hosted application
        // to grab more than one port,
        // still ensure no app port conflict
        var options = {
          db: cozyLight.db,
          port: port,
          getPort: function(){
            return port++;
          },
          silent: true
        };

        appModule.start(options, function (err, app, server) {
          if (err) { logger.error(err); }

          if (server !== undefined ){
            // to properly close the server,
            // and release all its resources
            nodeHelpers.clearCloseServer(server);
            loadedApps[name].server = server;
          }
          routes[name] = port;
          logger.info(
            'Application ' + name + ' is now running ' +
            'on port ' + port + '...');
          port = port + 1;
          nodeHelpers.invoke(callback, err, app, server);
        }, cozyLight);
      }
    } else {
      logger.info('Skip application ' + name + ' (non classic app).');
      nodeHelpers.invoke(callback);
    }
  },

  /**
   * Stop given classic application.
   *
   * @param application The application to stop.
   * @param {Function} callback Termination.
   */
  stop: function (application, callback) {
    var cozyLight = require('./cozy-light');
    var name = application.name;

    if (loadedApps[name] !== undefined) {
      var appModule = loadedApps[name].appModule;

      var timeout = nodeHelpers.throwTimeout(
         name + ' is too slow to stop...', 3000);

      var closeServer = function () {

        clearTimeout(timeout);

        try {

          if (loadedApps[name].server){
            loadedApps[name].server.close(function logInfo (err) {
              if (err) {
                logger.raw(err);
                logger.info('\t' + symbols.err + '\t' +
                            application.displayName + '');
              } else {
                logger.info('\t' + symbols.ok + '\t' +
                            application.displayName + '');
              }
              nodeHelpers.clearRequireCache(configHelpers.modulePath(name));
              delete loadedApps[name];
              nodeHelpers.invoke(callback);
            });

          } else {
            logger.warn("Cannot find running server to stop for: " +
                      application.displayName);
            nodeHelpers.clearRequireCache(configHelpers.modulePath(name));
            delete loadedApps[name];
            nodeHelpers.invoke(callback);
          }

        } catch (err) {
          logger.raw(err);
          logger.warn(
            'An error occurred while stopping ' + application.displayName);
          nodeHelpers.clearRequireCache(configHelpers.modulePath(name));
          delete loadedApps[name];
          nodeHelpers.invoke(callback);
        }
      };

      if (appModule.stop === undefined) {
        closeServer();
      } else {
        appModule.stop(closeServer, cozyLight);
      }
    } else {
      nodeHelpers.invoke(callback);
    }
  },

  /**
   * Stop all running apps,
   *
   * @param {Function} callback Termination.
   */
  stopAll: function (callback) {
    var cozyLight = require('./cozy-light');
    var config = configHelpers.getConfig();
    var port = configHelpers.getDefaultAppsPort();

    function stopApp (app, cb) {
      var application = config.apps[app];
      applicationHelpers.stop(application, cb);
    }
    async.eachSeries(Object.keys(config.apps), stopApp, function () {
      port = configHelpers.getDefaultAppsPort();
      nodeHelpers.invoke(callback);
    });
  },

  /**
   * Start all running apps,
   *
   * @param {Function} callback Termination.
   */
  startAll: function (callback) {
    var cozyLight = require('./cozy-light');
    var config = configHelpers.getConfig();
    function startApp (app, cb) {
      var application = config.apps[app];
      applicationHelpers.start(application, cb);
    }
    async.eachSeries(Object.keys(config.apps), startApp, callback);
  }
};
