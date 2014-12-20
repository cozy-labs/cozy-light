var fs = require('fs-extra');
var pathExtra = require('path-extra');
var assert = require('assert');
var requestJSON = require('request-json-light');
var request = require('request');
var PouchDB = require('pouchdb');
var cozyLight = require('../lib/cozy-light');
var configWatcher = require('../lib/config-watcher');

var actions = cozyLight.actions;
var configHelpers = cozyLight.configHelpers;
var npmHelpers = cozyLight.npmHelpers;
var nodeHelpers = cozyLight.nodeHelpers;
var applicationHelpers = cozyLight.applicationHelpers;

var workingDir = pathExtra.join( __dirname, '.test-working_dir');
var fixturesDir = pathExtra.join( __dirname, 'fixtures');
var HOME = workingDir;
var cozyHOME = pathExtra.join(HOME, '.cozy-light' );


before(function(){
  fs.removeSync(workingDir);
  fs.mkdirSync(workingDir);
});


after(function(){
  try {
    fs.removeSync(workingDir);
  } catch(err) {
    console.log(err);
  }
});

describe('Main App Helpers', function () {

  it.skip('initializeProxy', function(){});

  it.skip('start', function(){
  });

  it.skip('stop', function(){
  });

  it.skip('exit', function(){
  });

});


describe('Plugin Helpers', function () {
  it.skip('start', function(){});
  it.skip('stop', function(){});
  it.skip('startAll', function(){});
  it.skip('stopAll', function(){});
});


describe('Application Helpers', function () {

  describe('start', function () {
    it('should start a server for given application', function (done) {
      this.timeout(10000);
      var source = pathExtra.join(fixturesDir, 'test-app');
      var dest = configHelpers.modulePath('test-app');
      fs.copySync(source, dest);

      var sourceExpress = pathExtra.join(
        __dirname, '..', 'node_modules', 'express');
      var destExpress = pathExtra.join(dest, 'node_modules', 'express');
      fs.copySync(sourceExpress, destExpress);

      var manifest = require(pathExtra.join(dest, 'package.json'));
      manifest.type = 'classic';
      var db = new PouchDB('test');
      applicationHelpers.start(manifest, db,
        function assertAccess () {
          var client = requestJSON.newClient('http://localhost:18001');
          client.get('', function assertResponse (err, res) {
            assert.equal(err, null,
              'An error occurred while accessing test app.');
            assert.equal(res.statusCode, 200,
              'Wrong return code for test app.');
            done();
          });
        });
    });
  });

  describe('stop', function () {
    it('should stop running server for given application', function (done) {
      var appHome = configHelpers.modulePath('test-app');
      var manifest = require(pathExtra.join(appHome, 'package.json'));
      manifest.type = 'classic';

      applicationHelpers.stop(manifest, function assertStop () {
        var client = requestJSON.newClient('http://localhost:18001');
        client.get('', function assertResponse(err) {
          assert.notEqual(err, null,
            'Application should not be accessible anymore.');
          done();
        });
      });
    });
  });

  it.skip('startAll', function(){});
  it.skip('stopAll', function(){});
});


describe('Controllers', function () {

  it.skip('proxyPrivate', function(){
  });

  it.skip('proxyPublic', function(){
  });

});


describe('actions', function () {

  describe('installApp', function () {
    it('should add app folders and update configuration.', function (done) {
      this.timeout(60000);
      var app = 'cozy-labs/hello';
      actions.installApp(app, function (err) {
        assert.equal(err, null, 'Cannot install app.');
        var config = configHelpers.loadConfigFile();
        assert.equal('hello', config.apps[app].name);
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
        assert.equal('test-plugin', config.plugins[testPlugin].name);
        done();
      });
    });
  });

  describe('disable', function () {

    it('should mark app as disabled in the config file.', function (done) {
      var app = 'cozy-labs/hello';
      actions.disable(app);
      var config = configHelpers.loadConfigFile();
      assert(config.apps[app].disabled === true);
      done();
    });

    it('should mark plugin as disabled in the config file.', function (done) {
      var plugin = pathExtra.join(fixturesDir, 'test-plugin');
      actions.disable(plugin);
      var config = configHelpers.loadConfigFile();
      assert(config.plugins[plugin].disabled === true);
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
      var opt = {port: 8090};
      actions.start(opt, function(err) {
        assert.equal(err, null, 'Cannot start server');
        request('http://localhost:' + opt.port + '/',
          function(error, response){
            assert.equal(error, null,
              'An error occurred while accessing test app.');
            assert.equal(response.statusCode, 404,
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


describe('Functional tests', function () {

  after(function(done){
    actions.exit(done);
  });

  describe('Hot app install', function () {

    it('starts the main server.', function (done) {
      var opt = {port: 8090};
      actions.start(opt, done);
    });

    it('install fake app manually.', function (done) {
      // Nothing to do test app is still in the cozy-light folder.
      done();
    });

    it('install test-app2 manually.', function (done) {
      this.timeout(60000);
      var testapp2 = pathExtra.join(fixturesDir, 'test-app2');
      actions.installApp(testapp2, function (err) {
        assert.equal(err, null, 'Cannot install test-app2.');
        done();
      });
    });

    it('change configuration file.', function (done) {
      var appHome = configHelpers.modulePath('test-app');
      var manifest = require(pathExtra.join(appHome, 'package.json'));
      configHelpers.addApp('test-app', manifest);
      done();
    });

    it('wait 1s.', function (done) {
      setTimeout(function () {
        done();
      }, 1000);
    });

    it('fake app should be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18002');
      client.get('', function assertResponse (err, res) {
        assert.equal(err, null, 'An error occurred while accessing test app.');
        assert.equal(res.statusCode, 200, 'Wrong return code for test app.');
        done();
      });
    });

    it('test-app2 should be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res) {
        assert.equal(err, null, 'An error occurred while accessing test app.');
        assert.equal(res.statusCode, 200, 'Wrong return code for test app.');
        actions.stop(done);
      });
    });

    it('should uninstall.', function (done) {
      this.timeout(60000);
      var testapp2 = pathExtra.join(fixturesDir, 'test-app2');
      actions.uninstallApp(testapp2, function (err) {
        assert.equal(err, null, 'Cannot uninstall test-app2.');
        done();
      });
    });

    it('should stop.', function (done) {
      actions.stop(done);
    });
  });

  describe('Do not start disabled app', function () {

    after(function (done) {
      actions.enable('test-app');
      actions.stop(done);
    });

    it('install an app.', function (done) {
      // Nothing to do test app is still in the cozy-light folder.
      done();
    });

    it('disable it.', function (done) {
      actions.disable('test-app');
      done();
    });

    it('starts the main server.', function (done) {
      var opt = {port: 8090};
      actions.start(opt, done);
    });

    it('disabled app should not be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err) {
        assert(err !== null);
        done();
      });
    });

  });

  describe('Hot app reload', function () {

    it('starts the main server.', function (done) {
      var opt = {port: 8090};
      actions.start(opt, done);
    });

    it('install fake app manually.', function (done) {
      // Nothing to do test app is still in the cozy-light folder.
      done();
    });

    it('wait 1s.', function (done) {
      setTimeout(done, 1000);
    });

    it('ensure initial source code.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res, body) {
        assert.equal(err, null, 'An error occurred while accessing test app.');
        assert.equal(body.ok, true,
          'Wrong reloaded response body for test app.');
        done();
      });
    });

    it('change application code.', function (done) {
      var appHome = configHelpers.modulePath('test-app');
      var serverFile = appHome + '/server.js';
      var content = fs.readFileSync(serverFile,'utf-8');
      content = content.replace('send({ok: true})','send({ok: false})');
      fs.writeFileSync(serverFile, content);
      done();
    });

    it('restart cozy-light.', function (done) {
      actions.restart(done);
    });

    it('fake app should be started.', function (done) {
      var client = requestJSON.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res, body) {
        assert.equal(err, null,
          'An error occurred while accessing test app.');
        assert.equal(res.statusCode, 200,
          'Wrong return code for test app.');
        assert.equal(body.ok, false,
          'Wrong reloaded response body for test app.');
        var appHome = configHelpers.modulePath('test-app');
        var serverFile = appHome + '/server.js';
        var content = fs.readFileSync(serverFile,'utf-8');
        content = content.replace(
          'send({ok: false})', 'send({ok: true})');
        fs.writeFileSync(serverFile,content);
        done();
      });
    });
  });

  describe('Distro install', function () {

    it.skip('install a new distro.', function () {
    });
  });
});
