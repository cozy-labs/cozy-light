var fs = require("fs");
var pathExtra = require("path-extra");
var assert = require("assert");
var rimraf = require("rimraf");
var express = require("express");
var http = require("http");

var actions = require('./cozy-light').actions;
var configHelpers = require('./cozy-light').configHelpers;
var npmHelpers = require('./cozy-light').npmHelpers;
var serverHelpers = require('./cozy-light').serverHelpers;
var HOME = pathExtra.join(pathExtra.homedir(), '.cozy-light');
var CONFIG_PATH = pathExtra.join(HOME, 'config.json');

describe('Config Helpers', function () {
  before(function (done) {
    this.timeout(10000);
    rimraf(HOME, done);
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

  describe('initializeProxy', function(){
    //app = express();
    //server = app.listen();
    //serverHelpers.initializeProxy(server);

    //server.emit('error', new Error('failure'));
    //server.close();
  });

  describe('createApplicationServer', function(){
  });

  describe('startApplication', function(){
  });

  describe('loadPlugins', function(){
  });

  describe('exitHandler', function(){
  });

});


describe('Controllers', function () {

  describe('index', function(){
  });

  describe('proxyPrivate', function(){
  });

  describe('proxyPublic', function(){
  });

  describe('automaticRedirect', function(){
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

  //describe('installApp', function (done) {
    //var app = 'cozy-labs/hello';
    //actions.installApp(app, function () {
      //var config = require(CONFIG_PATH);
      //assert.equal('hello', config.apps[app].name);
      //done();
    //});
  //});

  //describe('uninstallApp', function () {
    //var app = 'cozy-labs/hello';
    //actions.uninstallApp(app, function () {
      //var config = require(CONFIG_PATH);
      //assert.equal('hello', config.apps[app].name);
      //done();
    //});
  //});

  //describe('addPlugin', function (done) {
    //actions.addPlugin('cozy-labs/cozy-light-html5-apps', done);
  //});

  //describe('removePlugin', function () {
    //actions.removePlugin('cozy-labs/cozy-light-html5-apps', done);
  //});

});
