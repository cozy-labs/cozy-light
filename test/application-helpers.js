var fs = require('fs-extra');
var pathExtra = require('path-extra');
var assert = require('assert');
var requestJSON = require('request-json-light');
require('should');

var cozyLight = require('../lib/cozy-light');
var configHelpers = cozyLight.configHelpers;
var applicationHelpers = cozyLight.applicationHelpers;

var workingDir = pathExtra.join( __dirname, '.test-working_dir');
var fixturesDir = pathExtra.join( __dirname, 'fixtures');
fs.removeSync(workingDir);
fs.mkdirSync(workingDir);

before(function(){
  cozyLight.init({home: workingDir});
});

after(function(done){
  cozyLight.stop(function(){
    try {
      fs.removeSync(workingDir);
    } catch(err) {
      console.log(err);
    }
    done();
  });
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
      applicationHelpers.start(manifest,
        function assertAccess () {
          var client = requestJSON.newClient('http://localhost:18001');
          client.get('', function assertResponse (err, res) {
            assert.equal(err, null,
              'An error occurred while accessing test app.');
            res.statusCode.should.eql(200,
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
