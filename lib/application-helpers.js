
var symbols = require('symbolsjs');
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var async = require('async');

module.exports = function(cozyLight){

  var nodeHelpers = cozyLight.nodeHelpers;
  var logger = cozyLight.logger;
  var configHelpers = cozyLight.configHelpers;
  var routes = cozyLight.routes;
  var port = configHelpers.getDefaultAppsPort();

  var loadedApps = {};

  var applicationHelpers = {

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
          if ( !err.toString().match(missCozyFile) ) {
            logger.raw(err);
          }
          try {
            appModule = require( modulePath );
          } catch (err2) {
            logger.error( 'Application mismatch' );
            if (!fs.existsSync( modulePath )) {
              logger.error( 'Package directory is missing in ' );
            }
            if (!fs.existsSync( modulePath + '/package.json' )) {
              logger.error( 'Package json file is missing' );
            }
            logger.error(modulePath);
            logger.raw(err2);
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
            routes[name] = options.port;
            logger.info(
              'Application ' + name + ' is now running ' +
              'on port ' + options.port + '...');
            port = port + 1;
            nodeHelpers.invoke(callback, err, app, server);
          }, cozyLight);
        }
      } else {
        logger.info('Skip application ' + name + '.');
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
      var name = application.name;

      if (loadedApps[name] !== undefined) {
        var appModule = loadedApps[name].appModule;

        var closeServer = function () {
          try {
            if (loadedApps[name].server !== undefined ){
              loadedApps[name].server.close(function logInfo (err) {
                if (err) {
                  logger.raw(err);
                  logger.info('\t' + symbols.err + '\t' +
                  appModule.displayName + '');
                } else {
                  logger.info('\t' + symbols.ok + '\t' +
                  appModule.displayName + '');
                }
                nodeHelpers.clearRequireCache(configHelpers.modulePath(name));
                delete loadedApps[name];
                nodeHelpers.invoke(callback);
              });
            } else {
              nodeHelpers.clearRequireCache(configHelpers.modulePath(name));
              delete loadedApps[name];
              nodeHelpers.invoke(callback);
            }
          } catch (err) {
            logger.raw(err);
            logger.warn('An error occurred while stopping ' +
            appModule.displayName);
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
      var config = configHelpers.getConfig();
      function stopApp (app, cb) {
        var application = config.apps[app];
        applicationHelpers.stop(application, cb);
      }
      async.eachSeries(Object.keys(config.apps), stopApp, function(){
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
      var config = configHelpers.getConfig();
      function startApp (app, cb) {
        var application = config.apps[app];
        applicationHelpers.start(application, cb);
      }
      async.eachSeries(Object.keys(config.apps), startApp, callback);
    }
  };

  return applicationHelpers;
};
