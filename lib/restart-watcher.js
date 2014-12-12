var restartWatcher = module.exports = {
  watchers: [],
  trigger: function () {
    restartWatcher.watchers.forEach(function(cb){
      cb();
    });
  },
  on: function (cb) {
    restartWatcher.watchers.push(cb);
  },
  off: function (cb) {
    restartWatcher.watchers.splice(
      restartWatcher.watchers.indexOf(cb),1);
  },
  one: function (cb) {
    var oner = function(){
      restartWatcher.off(oner);
      if (cb !== undefined && typeof(cb) === 'function') {
        cb();
      }
    };
    restartWatcher.on(oner);
  }
};