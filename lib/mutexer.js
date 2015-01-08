
var fs = require('fs');
var npm = require('npm');
var pathExtra = require('path-extra');

module.exports = function(cozyLight){

  var configHelpers = cozyLight.configHelpers;
  var nodeHelpers = cozyLight.nodeHelpers;

  var mutexer = {

    /**
     * Path to the mutex file
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
     * if it does not exist,
     * returns -1;
     *
     * @return {int} Pid of the current process
     */
    read: function () {
      if ( mutexer.exists() ) {
        return parseInt(fs.readFileSync(mutexer.path(), 'utf-8'));
      }
      return -1;
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
     * Tells if this process is the master
     */
    amIMaster: function () {
      // check if it the master / child process
      var masterPid = mutexer.read();
      return masterPid === process.pid;
    },

    /**
     * Kills master process
     * according to mutex information
     */
    killMaster: function (then) {
      var pid = mutexer.read();
      if ( pid ) {
        try{
          process.kill(mutexer.read(), 'SIGINT'); // can take up to ten seconds
        }catch(ex){
          console.log(ex)
        }
      }
      setTimeout(function(){
        nodeHelpers.invoke(then);
      },10 * 1000);
    }
  };

  return mutexer;
};
