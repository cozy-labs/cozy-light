// control port number attribution

var portscanner = require('portscanner');

var PortController = function(opts){

  opts = opts || {
    host:'127.0.0.1',
    timeout:100
  };

  this.Host = function(h){
    opts.host = h;
    return this;
  };

  this.Timeout = function(m){
    opts.timeout = m;
    return this;
  };

  this.getPort = function(startingFrom, maxPort, callback){
    if ( ! callback ) {
      callback = maxPort;
      maxPort = startingFrom+50;
    }
    portscanner.findAPortNotInUse(startingFrom, maxPort, opts, function(error, port) {
      callback(error,port);
    });
  };

};

exports = module.exports = PortController;