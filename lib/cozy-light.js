var fs = require('fs');
var pathExtra = require('path-extra');
var express = require('express');
var printit = require('printit');

// Constants
const LOGGER = printit({ prefix: 'Cozy Light' });

// 'Global' variables

var port = 18001;
var config = null;
var server = null;

var cozyLight = {
  status: 'stopped',
  init: function( program ){
    LOGGER.info("initializing..");
    cozyLight.status = 'started';
    cozyLight.npmHelpers.initialWd = process.cwd();
    cozyLight.configHelpers.init(program.home);
    cozyLight.configHelpers.setMainAppPort(program.port || 19104);
    process.chdir(program.home);
    cozyLight.pluginHelpers.loadAll(program);
  },
  routes: {},
  configHelpers: {},
  npmHelpers: {},
  pluginHelpers: {},
  applicationHelpers: {},
  mainAppHelper: {},
  actions: {}
};

cozyLight.configHelpers = require('./config-helper')();

cozyLight.npmHelpers = require('./npm-helpers')(cozyLight);
cozyLight.pluginHelpers = require('./plugin-helpers')(cozyLight);
cozyLight.applicationHelpers = require('./application-helpers')(cozyLight);
cozyLight.mainAppHelper = require('./main-app-helper')(cozyLight);
cozyLight.actions = require('./actions')(cozyLight);

module.exports = cozyLight;
