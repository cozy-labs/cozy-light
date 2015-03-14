#!/bin/sh
set -e
set -x

mocha test/actions.js
mocha test/application-helpers.js
mocha test/config-helpers.js
mocha test/config-watcher.js
mocha test/cozy-light.js
mocha test/main-app-helper.js
mocha test/node-helpers.js
mocha test/npm-helpers.js
mocha test/plugin-helpers.js
mocha test/functional.js
NODE_ENV=need-all-logs
mocha test/cli.js
