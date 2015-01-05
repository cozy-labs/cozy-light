set -e
set -x

mocha --globals s,cooked --reporter spec test/actions.js
mocha --globals s,cooked --reporter spec test/application-helpers.js
mocha --globals s,cooked --reporter spec test/config-helpers.js
mocha --globals s,cooked --reporter spec test/config-watcher.js
mocha --globals s,cooked --reporter spec test/cozy-light.js
mocha --globals s,cooked --reporter spec test/functional.js
mocha --globals s,cooked --reporter spec test/main-app-helper.js
mocha --globals s,cooked --reporter spec test/node-helpers.js
mocha --globals s,cooked --reporter spec test/npm-helpers.js
mocha --globals s,cooked --reporter spec test/plugin-helpers.js