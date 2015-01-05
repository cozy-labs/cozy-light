
# about '|| exit /b' see http://stackoverflow.com/a/21912169

mocha --no-exit --globals s,cooked --reporter spec test/actions.js || exit /b
mocha --no-exit --globals s,cooked --reporter spec test/application-helpers.js || exit /b
mocha --no-exit --globals s,cooked --reporter spec test/config-helpers.js || exit /b
mocha --no-exit --globals s,cooked --reporter spec test/config-watcher.js || exit /b
mocha --no-exit --globals s,cooked --reporter spec test/cozy-light.js || exit /b
mocha --no-exit --globals s,cooked --reporter spec test/functional.js || exit /b
mocha --no-exit --globals s,cooked --reporter spec test/main-app-helpers.js || exit /b
mocha --no-exit --globals s,cooked --reporter spec test/node-helpers.js || exit /b
mocha --no-exit --globals s,cooked --reporter spec test/npm-helpers.js || exit /b
mocha --no-exit --globals s,cooked --reporter spec test/plugin-helpers.js || exit /b