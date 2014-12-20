
var fsExtra = require('fs-extra');

var cozyKernel = {
  home:null,
  initialWd:null,
  configHelpers:null,
  /**
   * Creates home path
   * Change cwd
   * Initialize configuration file
   * Copy pouchdb
   *
   * @return {Object} config
   */
  setHome: function (home) {
    cozyKernel.initialWd = process.cwd();
    cozyKernel.home = home;
    fsExtra.mkdirsSync(home);
    process.chdir(home);
    cozyKernel.configHelpers = require('./config-helper')(home);
    cozyKernel.configHelpers.createConfigFile();
    cozyKernel.configHelpers.copyDependency('pouchdb');
    return cozyKernel.configHelpers.loadConfigFile();
  }
};
exports = module.exports = cozyKernel;