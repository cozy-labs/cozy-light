
var fs = require('fs');
var npm = require('npm');
var pathExtra = require('path-extra');

module.exports = function(cozyLight){

  var configHelpers = cozyLight.configHelpers;
  var nodeHelpers = cozyLight.nodeHelpers;

  var mutexer = {

    /**
     * Tells if mutex file exists
     */
    path: function () {
      var mutexPath = configHelpers.getHomePath();
      return pathExtra.join(mutexPath, 'mutex');
    },

    /**
     * Tells if mutex file exists
     */
    exists: function () {
      return fs.existsSync(mutexer.path());
    },

    /**
     * Writes mutex file
     */
    write: function () {
      fs.writeFileSync(mutexer.path(), process.pid);
    },

    /**
     * Reads mutex file
     */
    read: function () {
      if ( mutexer.exists() ) {
        return fs.readFileSync(mutexer.path());
      }
      return '';
    },

    /**
     * Removes mutex file
     */
    remove: function () {
      if ( mutexer.exists() ) {
        return fs.unlinkSync(mutexer.path());
      }
      return false;
    },

    /**
     * Tells if process is master
     */
    amIMaster: function () {
      // check if it the master / child process
      var masterPid = mutexer.read();
      return masterPid !== process.pid;
    },

    /**
     * Kills master process
     * according to mutex information
     */
    killMaster: function (then) {
      process.kill(mutexer.read(), 'SIGHUP'); // can take up to ten seconds
      setTimeout(function(){
        nodeHelpers.invoke(then);
      },10 * 1000);
    }
  };

  return mutexer;
};
