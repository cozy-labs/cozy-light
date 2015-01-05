
var symbols = require('symbolsjs');
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var nodeHelpers = require('./node-helpers');
var async = require('async');
var printit = require('printit');
const LOGGER = printit({ prefix: 'Cozy Light' });

module.exports = function(cozyLight){

  var configHelpers = cozyLight.configHelpers;
  var routes = cozyLight.routes;
  var port = configHelpers.getDefaultAppsPort();

  var loadedApps = {};

  var applicationHelpers = {

    /**
     * Start given classic application as a new listening server. List of
     * function to run on when configuration file is changed. List of function to
     * run on when configuration file is changed.
     * NB: Do not start given app if it is disabled.
     *
     * @param {Object} application The application to start.
     * @param {Function} callback Termination.
     */
    start: function (application, callback) {

      if ((application.type === undefined || application.type === 'classic')
        && application.disabled !== true) {

        var name = application.name;

        var appModule;
        var modulePath = configHelpers.modulePath(name);
        var cozyFile = pathExtra.join(modulePath, 'cozy.js');
        try {
          appModule = require(cozyFile);
        } catch (err) {
          if( !err.toString().match(cozyFile) ) {
            LOGGER.raw(err);
            LOGGER.raw(cozyFile);
          }
          try {
            appModule = require( modulePath );
          } catch (err_2) {
            LOGGER.error( 'Application mismatch' );
            if (!fs.existsSync( modulePath )) {
              LOGGER.error( 'Package directory is missing in ' );
            }
            if (!fs.existsSync( modulePath+ '/package.json' )) {
              LOGGER.error( 'Package json file is missing' );
            }
            LOGGER.error(modulePath);
            LOGGER.raw(err_2);
          }
        }

        if (appModule === undefined) {
          LOGGER.error('Can\'t load application ' + name + '.');
          nodeHelpers.invoke(callback);
        } else if (appModule.start === undefined) {
          LOGGER.error('Can\'t start application ' + name + '.');
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
            nodeHelpers.invoke(callback, err, app, server);
          } /* , cozyLight */);
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
                nodeHelpers.invoke(callback);
              });
            } else {
              nodeHelpers.clearRequireCache(configHelpers.modulePath(name));
              delete loadedApps[name];
              nodeHelpers.invoke(callback);
            }
          } catch (err) {
            LOGGER.raw(err);
            LOGGER.warn('An error occurred while stopping ' + name);
            nodeHelpers.clearRequireCache(configHelpers.modulePath(name));
            delete loadedApps[name];
            nodeHelpers.invoke(callback);
          }
        };

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
