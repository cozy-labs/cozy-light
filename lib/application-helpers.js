
var symbols = require('symbolsjs');
var pathExtra = require('path-extra');
var nodeHelpers = require('./node-helpers');
var async = require('async');
var printit = require('printit');
const LOGGER = printit({ prefix: 'Cozy Light' });

module.exports = function(configHelpers, routes){

  var port = configHelpers.getDefaultPort();

  var loadedApps = {};

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
        var modulePath = configHelpers.modulePath(name);
        try {
          var cozyFile = pathExtra.join(modulePath, 'cozy.js');
          appModule = require(cozyFile);
        } catch (err) {
          if( !err.toString().match(new RegExp("Cannot find module '"+modulePath+"'","i")) ) {
            LOGGER.raw(err);
          }
          try {
            appModule = require(configHelpers.modulePath(name));
          } catch (err_2) {
            LOGGER.raw(err_2);
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
            sockets: []
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
          }, cozyLight);
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
      async.eachSeries(Object.keys(config.apps), stopApp, callback);
    },

    /**
     * Start all running apps,
     *
     * @param db The datastore.
     * @param {Function} callback Termination.
     */
    startAll: function (db, callback) {
      var config = configHelpers.getConfig();
      function startApp (app, cb) {
        var application = config.apps[app];
        applicationHelpers.start(application, db, cb);
      }
      async.eachSeries(Object.keys(config.apps), startApp, callback);
    }
  };

  return applicationHelpers;
};
