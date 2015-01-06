
var configWatcher = require('../lib/config-watcher');
var should = require('should');
var pathExtra = require('path-extra');
var fs = require('fs-extra');

var workingDir = pathExtra.join( __dirname, '.test-working_dir');
var cozyHOME = pathExtra.join(workingDir, '.cozy-light' );
var testFile = pathExtra.join(workingDir, 'testfile' );

before(function(){
  fs.removeSync(workingDir);
  fs.mkdirSync(workingDir);
  fs.mkdirSync(cozyHOME);
  fs.writeFileSync(testFile,'');
});


after(function(){
  try {
    fs.removeSync(workingDir);
  } catch(err) {
    console.log(err);
  }
});

describe('Config watcher', function () {

  it('on', function(done){
    var watcher = configWatcher(testFile);
    watcher.on(function(){
      watcher.mainWatcher.close();
      done();
    });
    fs.writeFileSync(testFile,'some changes');
  });

  it('one', function(done){
    var watcher = configWatcher(testFile);
    var cnt_ = 0;
    watcher.one(function(){
      cnt_++;
    });
    fs.writeFileSync(testFile,'some more changes');
    setTimeout(function(){
      cnt_.should.eql(1,'watcher not properly called.');
      watcher.watchers.length.should.eql(0,'watcher not properly removed.');
      watcher.mainWatcher.close();
      done();
    },1500); // not great, but works fine
  });

  it('off', function(done){
    var watcher = configWatcher(testFile);
    var cnt_ = 0;
    var h = function(){
      cnt_++;
    };
    watcher.on(h);
    watcher.off(h);
    fs.writeFileSync(testFile,'some more changes occurred');
    setTimeout(function(){
      cnt_.should.eql(0,'watcher not properly removed.');
      watcher.watchers.length.should.eql(0,'watcher not properly removed.');
      watcher.mainWatcher.close();
      done();
    },1500); // not great, but works fine
  });

  it.skip('trigger', function(){});

});
