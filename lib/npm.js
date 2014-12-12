var fs = require('fs');
var pathExtra = require('path-extra');
var npm = require('npm');
var request = require('request-json-light');
var logger = require('printit')({ prefix: 'Cozy Light / NPM' });

var initialWd = process.cwd();


var npmHelpers = {

  /**
   * Fetch given app source and dependencies from NPM registry.
   *
   * Config file is ~/.cozy-light/.config
   *
   * @param {String} app App to fetch from NPM.
   * @param {String} home Target directory.
   * @param {Function} callback Callback to run once work is done.
   */
  install: function (home, app, callback) {
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
    npm.load({ local: true }, function () {
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
          logger.error(err);
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
          logger.error(err);
          callback(err);
        } else if (err) {
          logger.error(err);
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
   * @param {String} home Target directory.
   * @param {Function} callback Termination.
   * TODO rename this function
   */
  fetchInstall: function (home, app, callback) {
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


module.exports = npmHelpers;
