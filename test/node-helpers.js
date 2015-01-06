
var assert = require('assert');
var fs = require('fs-extra');
var pathExtra = require('path-extra');
var should = require('should');
var nodeHelpers = require('../lib/node-helpers');

var workingDir = pathExtra.join( __dirname, '.test-working_dir');
var fixturesDir = pathExtra.join( __dirname, 'fixtures');

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

describe('Node Helpers', function () {
  it('clearRequireCache', function () {
    var baseModulePath = pathExtra.join(fixturesDir, 'test-app');
    require(baseModulePath);
    assert(
      require.cache[pathExtra.join(baseModulePath,'/server.js')] !== undefined,
      'Module should be cached before clearing it.');
    nodeHelpers.clearRequireCache(baseModulePath);
    assert(
      require.cache[pathExtra.join(baseModulePath,'/server.js')] === undefined,
      'Module should not be cached anymore after clearing it.');
  });
  it.skip('clearRequireCache effectively resolve linked path', function(){});
  it.skip('invoke', function(){});
  it.skip('clearCloseServer', function(){});
});