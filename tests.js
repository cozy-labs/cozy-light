var fs = require("fs");
var pathExtra = require("path-extra");
var assert = require("assert");
var rimraf = require("rimraf");

var configHelpers = require('./cozy-light').configHelpers;
var HOME = pathExtra.join(pathExtra.homedir(), '.cozy-light');
var CONFIG_PATH = pathExtra.join(HOME, 'config.json');

describe('Config Helpers', function(){
  before(function(done) {
    rimraf(HOME, done);
  });

  describe('createHome', function(){
    it('should create Home directory', function(){
      configHelpers.createHome();
      assert.equal(true, fs.existsSync(HOME));
    });
  });

  describe('createConfigFile', function(){
    it('should create an empty config file', function(){
      configHelpers.createConfigFile();
      assert.equal(true, fs.existsSync(CONFIG_PATH));
    });
  });

  describe('addApp', function(){
    it('should add app manifest to the config file', function(){
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
});

describe('NPM Helpers', function(){
});

describe('Server Helpers', function(){
});

describe('Controllers', function(){
});
