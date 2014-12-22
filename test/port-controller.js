
var net = require('net');
var assert = require('assert');
var PortController = require('../lib/port-controller');

var portController = new PortController();

describe('Port Controller', function () {

  var server;
  before(function(done) {
    server = net.createServer();
    server.listen(8080, done);
  });

  after(function(done) {
    server.close();
    done();
  });

  it('should find open port 8081', function () {
    this.timeout(50000);
    var host = '127.0.0.1';
    portController.Host(host);
    portController.getPort(8080,function(error,port){
      assert.equal(error, null, 'error must be null');
      assert.equal(port, 8081, 'port 8080 must be detected as OPEN at ' + host);
    });
  });

  it('should fails nicely', function () {
    this.timeout(50000);
    var host = 'n0wh3r3-àt-n0h0st.c0m';
    portController.Host(host);
    portController.getPort(8080,function(error,port){
      assert.notEqual(error, null, 'error must be null');
      assert.notEqual(port, null, 'port must be null, no OPEN port at '+host);
    });
  });

});
