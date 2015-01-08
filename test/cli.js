
var request = require('request');
var spawn = require('child_process').spawn;
require('should');


describe.skip('CLI', function () {
    it('displays help', function(done){
        var output = "";
        spawn('cozy-light', ['--help'])
            .on('data', function (d) {
                output += d;
            })
            .on('close', function () {
                console.error(output);
                output.should.match(/some/);
                done();
            });
    });
  it('starts properly', function(done){
      var cozyProcess = spawn('cozy-light', ['--start'])
          .on('close', function () {
              done();
          });
      setTimeout(function(){
          request.get('http://localhost:19104/' , function(error, response){
              response.statusCode.match(/404/);
              cozyProcess.kill();
          });
      },1500);
  });
  it('does not start twice', function(){
      var cozyProcess = spawn('cozy-light', ['--start'])
          .on('close', function (code) {
              code.should.eql(0);
          });
      setTimeout(function(){
          spawn('cozy-light', ['--start'])
              .on('close', function (code) {
                  code.should.eql(1);
                  cozyProcess.kill();
                  done();
              });
      },1500);
  });
  it('creates the mutex', function(){});
  it('can install plugin', function(){});
  it('can install app', function(){});
  it('can install distro', function(){});
  it('displays content properly', function(){});
  it('can remove app', function(){});
  it('can remove plugin', function(){});
  it('can stop properly', function(){
      var cozyProcess = spawn('cozy-light', ['--start'])
          .on('close', function (code) {
              code.should.eql(0);
              done();
          });
      setTimeout(function(){
          request.get('http://localhost:19104/' , function(){
              cozyProcess.kill();
          });
      },1500);});
  it('deletes the mutex', function(){});
});
