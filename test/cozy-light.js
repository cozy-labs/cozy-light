
var fs = require('fs-extra');
var pathExtra = require('path-extra');
require('should');

var cozyLight = require('../lib/cozy-light');
var configHelpers = cozyLight.configHelpers;
var npmHelpers = cozyLight.npmHelpers;
var pluginHelpers = cozyLight.pluginHelpers;

var workingDir = pathExtra.join( __dirname, '.test-working_dir');
fs.removeSync(workingDir);
fs.mkdirSync(workingDir);

describe('cozyLight', function () {

  describe('init', function () {
    it('should setup the home directory.', function () {
      var initialWd = process.cwd();
      cozyLight.init({home: workingDir});

      pathExtra.resolve(configHelpers.getHomePath())
        .should.eql(pathExtra.resolve(workingDir),
        'Home directory not configured.');

      pathExtra.resolve(configHelpers.getHomePath())
        .should.eql(pathExtra.resolve(process.cwd()),
        'Working directory not changed.');

      pathExtra.resolve(initialWd)
        .should.eql(pathExtra.resolve(npmHelpers.initialWd),
        'NpmHelpers not configured.');

      cozyLight.status
        .should.eql('stopped', 'Initial status is wrong');

      var config = configHelpers.getConfig();
      Object.keys(pluginHelpers.loadedPlugins).length
        .should.eql(Object.keys(config.plugins).length,
        'plugins not properly loaded.');

    });
  });
  describe.skip('stop', function () {});
});
