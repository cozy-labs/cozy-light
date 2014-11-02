var fs = require("fs-extra");
var pathExtra = require("path-extra");
var assert = require("assert");
var express = require("express");
var http = require("http");
var request = require('request-json-light');
var PouchDB = require('pouchdb');
var cozyLight = require('./cozy-light');

var actions = cozyLight.actions;
var configHelpers = cozyLight.configHelpers;
var npmHelpers = cozyLight.npmHelpers;
var serverHelpers = cozyLight.serverHelpers;

var HOME = pathExtra.join(pathExtra.homedir(), '.cozy-light');
var CONFIG_PATH = pathExtra.join(HOME, 'config.json');


describe('Config Helpers', function () {
  before(function (done) {
    this.timeout(10000);
    fs.remove(HOME, done);
  });

  describe('createHome', function () {
    it('should create Home directory', function () {
      configHelpers.createHome();
      assert.equal(true, fs.existsSync(HOME));
    });
  });

  describe('createConfigFile', function () {
    it('should create an empty config file', function () {
      configHelpers.createConfigFile();
      assert.equal(true, fs.existsSync(CONFIG_PATH));
    });
  });

  describe('addApp', function(){
    it('should add app manifest to the config file', function () {
      var manifest = {
        "name": "cozy-test",
        "displayName": "Cozy Test",
        "version": "1.1.13",
        "description": "Test app.",
        "type": "classic"
      };
      var app = 'cozy-labs/cozy-test'
      configHelpers.addApp(app, manifest);
      var config = require(CONFIG_PATH);
      assert.equal(manifest.name, config.apps[app].name);
      assert.equal(manifest.displayName, config.apps[app].displayName);
      assert.equal(manifest.version, config.apps[app].version);
      assert.equal(manifest.description, config.apps[app].description);
      assert.equal(manifest.type, config.apps[app].type);
    });
  });

  describe('removeApp', function(){
    it('should remove app manifest from the config file', function () {
      var app = 'cozy-labs/cozy-test'
      configHelpers.removeApp(app);
      var config = require(CONFIG_PATH);
      assert.equal(undefined, config.apps[app]);
    });
  });

  describe('addPlugin', function(){
    it('should add plugin manifest to the config file', function () {
      var manifest = {
        "name": "cozy-test-plugin",
        "displayName": "Cozy Test Plugin",
        "version": "1.1.13",
        "description": "Test plugin.",
      };
      var plugin = 'cozy-labs/cozy-test-plugin'
      var config = require(CONFIG_PATH);
      configHelpers.addPlugin(plugin, manifest);
      assert.equal(manifest.name, config.plugins[plugin].name);
      assert.equal(manifest.displayName, config.plugins[plugin].displayName);
      assert.equal(manifest.version, config.plugins[plugin].version);
      assert.equal(manifest.description, config.plugins[plugin].description);
      assert.equal(manifest.type, config.plugins[plugin].type);
    });
  });

  describe('removePlugin', function(){
    it('should remove plugin manifest from the config file', function () {
      var plugin = 'cozy-labs/cozy-test'
      var config = require(CONFIG_PATH);
      configHelpers.removeApp(plugin);
      assert.equal(undefined, config.plugins[plugin]);
    });
  });

  describe('copyDependency', function(){
    it('should copy dependency in the cozy light folder.', function () {
      var destPath = pathExtra.join(HOME, 'node_modules', "path-extra");
      configHelpers.copyDependency("path-extra");
      assert(fs.existsSync(destPath));
    });
  });

});


describe('NPM Helpers', function () {

  describe('install', function () {
    it('should install module in the cozy-light folder.', function (done) {
      this.timeout(10000);
      process.chdir(HOME);
      var destPath = pathExtra.join(HOME, 'node_modules', 'hello');
      npmHelpers.install('cozy-labs/hello', function () {
        assert(fs.existsSync(destPath));
        done();
      });
    });
  });

  describe('uninstall', function(){
    it('should remove module from the cozy-light folder.', function (done) {
      process.chdir(HOME);
      var destPath = pathExtra.join(HOME, 'node_modules', 'hello');
      npmHelpers.uninstall('hello', function () {
        assert(!fs.existsSync(destPath));
        done();
      });
    });
  });
});


describe('Server Helpers', function () {

  it.skip('initializeProxy', function(){
  });

  it.skip('createApplicationServer', function(){
  });

  it('startApplication', function (done) {
    var source = pathExtra.join(__dirname, 'fixtures', 'test-app');
    var dest = pathExtra.join(HOME, 'node_modules', 'test-app');
    fs.copySync(source, dest);

    var sourceExpress = pathExtra.join(__dirname, 'node_modules', 'express');
    var destExpress = pathExtra.join(dest, 'node_modules', 'express');
    fs.copySync(sourceExpress, destExpress);

    var manifest = require(pathExtra.join(dest, 'package.json'));
    manifest.type = "classic";
    var db = new PouchDB('test');
    serverHelpers.startApplication(manifest, db, function assertAccess () {
      var client = request.newClient('http://localhost:18001');
      client.get('', function assertResponse (err, res, body) {
        assert.equal(err, null, 'An error occured while accessing test app.');
        assert.equal(res.statusCode, 200, 'Wrong return code for test app.');
        done();
      });
    });
  });

  it('stopApplication', function (done) {
    var appHome = pathExtra.join(HOME, 'node_modules', 'test-app');
    var manifest = require(pathExtra.join(appHome, 'package.json'));
    manifest.type = "classic";

    serverHelpers.stopApplication(manifest, function assertStop () {
      var client = request.newClient('http://localhost:18001');
      client.get('', function assertResponse(err, res, body) {
        assert.notEqual(err, null,
                        'Application should not be accessible anymore.');
        done();
      });
    });
  });

  it('reloadApps', function(done) {
    var appHome = pathExtra.join(HOME, 'node_modules', 'test-app');
    var manifest = require(pathExtra.join(appHome, 'package.json'));
    configHelpers.addApp('test-app', manifest);

    serverHelpers.reloadApps(function assertAppAccess () {
      var client = request.newClient('http://localhost:18002');
      client.get('', function assertResponse (err, res, body) {
        assert.equal(err, null, 'An error occured while accessing test app.');
        assert.equal(res.statusCode, 200,
                     'Wrong return code for test app.');
        configHelpers.removeApp('test-app');
        serverHelpers.stopApplication(manifest, done);
      });
    });
  });

  it.skip('loadPlugins', function(){
  });

  it.skip('exitHandler', function(){
  });

});


describe('Controllers', function () {

  it.skip('index', function(){
  });

  it.skip('proxyPrivate', function(){
  });

  it.skip('proxyPublic', function(){
  });

  it.skip('automaticRedirect', function(){
  });

});


describe('actions', function () {

  describe('start', function () {
    it('should listen and respond to http requests.', function (done) {
      var opt = {port: 8090};
      actions.start(opt,function(){
        var options = {
          host: 'localhost',
          port: opt.port
        };
        http.get(options, function(res) {
          res.setEncoding('utf8');
          var body = '';
          res.on('data', function (chunk) {
            body += chunk;
          });
          res.on('end', function () {
            var expected = 'Cozy Light: Your Personal Cloud at Home';
            assert(body.indexOf(expected) > -1);
            done();
          });
        }).on('error', function(e) {
          done(e);
        });
      })
    });
  });

  describe('installApp', function () {
    it('should add app folders and update configuration.', function (done) {
      var app = 'cozy-labs/hello';
      actions.installApp(app, function () {
        var config = require(CONFIG_PATH);
        assert.equal('hello', config.apps[app].name);
        done();
      });
    });
  });

  describe('uninstallApp', function () {
    it('should remove app folder and update configuration. ', function (done) {
      var app = 'cozy-labs/hello';
      actions.uninstallApp(app, function () {
        var config = require(CONFIG_PATH);
        assert.equal(config.apps[app], undefined);
        done();
      });
    });
  });

  //describe('addPlugin', function (done) {
    //actions.addPlugin('cozy-labs/cozy-light-html5-apps', done);
  //});

  //describe('removePlugin', function () {
    //actions.removePlugin('cozy-labs/cozy-light-html5-apps', done);
  //});

});


describe('Functional tests', function () {
  describe('Hot app install', function () {
    it('start server.', function (done) {
      done()
    });
    it('install fake app manually.', function (done) {
      done()
    });
    it('change configuration file.', function (done) {
      done()
    });
    it('wait 1s.', function (done) {
      done()
    });
    it('fake app should be started.', function (done) {
      done()
    });
  });
});
