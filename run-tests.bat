
:: about '|| exit /b' see http://stackoverflow.com/a/21912169

mocha --no-exit test/actions.js || exit /b
mocha --no-exit test/application-helpers.js || exit /b
mocha --no-exit test/config-helpers.js || exit /b
mocha --no-exit test/config-watcher.js || exit /b
mocha --no-exit test/cozy-light.js || exit /b
mocha --no-exit test/functional.js || exit /b
mocha --no-exit test/main-app-helpers.js || exit /b
mocha --no-exit test/node-helpers.js || exit /b
mocha --no-exit test/npm-helpers.js || exit /b
mocha --no-exit test/plugin-helpers.js || exit /b
mocha --no-exit test/cli.js || exit /b