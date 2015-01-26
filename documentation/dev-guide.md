
# Developer guide

Checkout and install the project

    git checkout https://github.com/cozy-labs/cozy-light.git
    cd cozy-light
    git remote add upstream https://github.com/cozy-labs/cozy-light
    npm install
    npm install eslint -g
    npm install mocha -g

Before you push your PR

    npm test
    npm run lint

### Tips

To improve speed of repetitive testing we recommend to use sinopia,
a private/caching npm repository server.

    cozy-light install cozy-sinopia

If your app runs also as a standalone cli binary, you may have interest in cozy-stub

add it as a dependency of your app.

    npm i cozy-stub --save
    
Find out more at https://github.com/maboiteaspam/cozy-stub
