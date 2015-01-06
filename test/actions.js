
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var assert = require('assert');
var request = require('request');
var should = require('should');

var cozyLight = require('../lib/cozy-light');
var actions = cozyLight.actions;
var configHelpers = cozyLight.configHelpers;

var workingDir = pathExtra.join( __dirname, '.test-working_dir');
var fixturesDir = pathExtra.join( __dirname, 'fixtures');
fs.removeSync(workingDir);
fs.mkdirSync(workingDir);

cozyLight.init({home:workingDir});

describe('actions', function () {

  describe('installApp', function () {
    it('should add app folders and update configuration.', function (done) {
      this.timeout(60000);
      var app = 'cozy-labs/hello';
      actions.installApp(app, function (err) {
        assert.equal(err, null, 'Cannot install app.');
        var config = configHelpers.loadConfigFile();
        ('hello').should.eql(config.apps[app].name);
        done();
      });
    });
  });

  describe('addPlugin', function () {
    it('should add plugin folder and update configuration. ', function (done) {
      var testPlugin = pathExtra.join(fixturesDir, 'test-plugin');
      actions.installPlugin(testPlugin, function (err) {
        assert.equal(err, null, 'Cannot install plugin.');
        var config = configHelpers.loadConfigFile();
        ('test-plugin').should.eql(config.plugins[testPlugin].name);
        done();
      });
    });
  });

  describe('disable', function () {

    it('should mark app as disabled in the config file.', function (done) {
      var app = 'cozy-labs/hello';
      actions.disable(app);
      var config = configHelpers.loadConfigFile();
      (true).should.eql(config.apps[app].disabled);
      done();
    });

    it('should mark plugin as disabled in the config file.', function (done) {
      var plugin = pathExtra.join(fixturesDir, 'test-plugin');
      actions.disable(plugin);
      var config = configHelpers.loadConfigFile();
      (true).should.eql(config.plugins[plugin].disabled);
      done();
    });

  });

  describe('enable', function () {

    it('should remove disabled from the config file (app).',
      function (done) {
        var app = 'cozy-labs/hello';
        actions.enable(app);
        var config = configHelpers.loadConfigFile();
        assert(config.apps[app].disabled === undefined);
        done();
      });

    it('should remove disabled from the config file (plugin).',
      function (done) {
        var plugin = pathExtra.join(fixturesDir, 'test-plugin');
        actions.enable(plugin);
        var config = configHelpers.loadConfigFile();
        assert(config.plugins[plugin].disabled === undefined);
        done();
      });

  });

  describe('uninstallApp', function () {
    it('should remove app folder and update configuration. ', function (done) {
      var app = 'cozy-labs/hello';
      actions.uninstallApp(app, function (err) {
        assert.equal(err, null, 'Cannot uninstallApp app.');
        var config = configHelpers.loadConfigFile();
        assert.equal(config.apps[app], undefined);
        done();
      });
    });
  });

  describe('removePlugin', function () {
    it('should remove plugin and update configuration. ', function (done) {
      var testPlugin = pathExtra.join(fixturesDir, 'test-plugin');
      actions.uninstallPlugin(testPlugin, function (err) {
        assert.equal(err, null, 'Cannot uninstall plugin.');
        var config = configHelpers.loadConfigFile();
        assert.equal(config.plugins[testPlugin], undefined);
        done();
      });
    });
  });

  describe('start', function () {
    it('should listen and respond to http requests.', function (done) {
      var port = 8090;
      var program = {}; // should be a commander object
      configHelpers.setMainAppPort(port);
      actions.start(program, function(err) {
        assert.equal(err, null, 'Cannot start server');
        request('http://localhost:' + port + '/',
          function(error, response){
            assert.equal(error, null,
              'An error occurred while accessing test app.');
            response.statusCode.should.eql(404,
              'Wrong return code for test app.');
            done();
          });
      });
    });
  });

  after(function(done){
    actions.stop(done);
  });

});
