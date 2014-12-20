
var fs = require('fs');
var npm = require('npm');
var pathExtra = require('path-extra');
var request = require('request-json-light');
var printit = require('printit');
const LOGGER = printit({ prefix: 'Cozy Light' });

module.exports = function(cozyKernel){

  var configHelpers = cozyKernel.configHelpers;

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
      npm.load({dir: configHelpers.getModulesPath(),prefix:''}, function () {
        npm.commands.install([app], callback);
      });
    },

    /**
     * Link given app source and dependencies from local file system.
     *
     * @param {String} app Path to the module to link.
     * @param {Function} callback Callback to run once work is done.
     */
    link: function (app, callback) {
      npm.load({ local: true, dir: configHelpers.getModulesPath(),prefix:''}, function () {
        app = pathExtra.resolve(cozyKernel.initialWd, app);
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
      npm.load({dir: configHelpers.getModulesPath(),prefix:''}, function () {
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
      var appPath = pathExtra.resolve(cozyKernel.initialWd, app);

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

  return npmHelpers;
};