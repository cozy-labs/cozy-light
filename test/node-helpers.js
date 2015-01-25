
var assert = require('assert');
var fs = require('fs-extra');
var pathExtra = require('path-extra');
require('should');
var nodeHelpers = require('../lib/helpers/node');

var workingDir = pathExtra.join(__dirname, '.test-working_dir');
var fixturesDir = pathExtra.join(__dirname, 'fixtures');

before(function(){
  try {
    fs.removeSync(workingDir);
  } catch(err) {
    console.log(err);
  }
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
    var p = pathExtra.join(baseModulePath, '/server.js');
    assert(require.cache[p] !== undefined,
      'Module should be cached before clearing it.');
    nodeHelpers.clearRequireCache(baseModulePath);
    assert(require.cache[p] === undefined,
      'Module should not be cached anymore after clearing it.');
  });
  it.skip('clearRequireCache effectively resolve linked path', function(){});
  it.skip('invoke', function(){});
  it.skip('clearCloseServer', function(){});
});
