# Cozy Light


![Cozy Logo](https://raw.github.com/cozy/cozy-setup/gh-pages/assets/images/happycloud.png)

Cozy Light is a micro PaaS that makes self-hosting easy.

Through its various plugins Cozy Light allows you to deal without effort with
many self-hosting use cases like deploying your static website, managing
dockerized web apps or use simple Node.js apps to store your calendars and
your files. Because it's lightweight, it performs well on cheap hardwares like
the Raspberry Pi or small Digital Ocean VPS.

As an illustration here is how you handle the Static Website use case. The goal is
to publish a website made of static files that is updated every time you commit on
the Github repository:

```
# Platform configuration
cozy-light add-plugin cozy-labs/cozy-light-html5-apps
cozy-light add-plugin cozy-labs/cozy-light-domains
cozy-light add-plugin cozy-labs/cozy-light-githooks

# Static Website install
cozy-light install mygithubuser/mywebsite

# Website configuration
cozy-light link-domain mywebsite.com mygithubuser/mywebsite
cozy-light add-githook mygithubuser/mywebsite mysecret

# Run the platform and access to your website on the 80 port
cozy-light start --port 80 
```

# Screencasts

* [Screencast d'introduction (French)](https://vimeo.com/110419102) (Vimeo Link)
* [Introduction Screencast](https://vimeo.com/108332389) (Vimeo Link)

# Use cases

Because of its very flexible architecture Cozy Light can satisfy many usages
related to self-hosting. Here are some examples:

* Static blog deployer 
* Personal cloud (file storage) 
* Simple Docker container manager
* Productivity suite (task, calendar and contact managers)
* Video game console
* Reverse-proxy
* ...

# Benefits

* No need to learn a lot about system administration, everything can be done
  with very few command lines.
* Can run on cheap hardwares like the Raspberry Pi.
* You install only the modules you need.
* No targeted ads because your apps store data where noone profiles you.
* No more headaches with relying on too many services, all your apps are
  located in the same place.
* It's extensible, you can build your own app to satisfy your specific needs.
* Or simply write a plugin to give more features to the platform.

# Install 

Install Node.js (>= 0.10), Git and essential build tools then install
cozy-light from the NPM package manager:

    sudo apt-get install git npm nodejs-legacy
    sudo npm install cozy-light -g

# Run

    cozy-light start

Then, with your browser, connect to: `http://localhost:19104/`

# Platform applications

By default the platform handles only apps based on Node.js and PouchDB.
But through plugins you can install apps made only of
static HTML or containers available on the Docker registry. 

## Install default applications

Application are fetched from github. Application name is built from the
username and the repository name:

    cozy-light install cozy-labs/calendar

For your information, most of the apps are runnable without Cozy Light. You can
install and run them separately:

    npm install cozy-calendar -g
    cozy-calendar 

## Uninstall application

    cozy-light uninstall cozy-labs/calendar
    
## Available applications

* cozy-labs/tasky: simple and efficient task manager;
* cozy-labs/cozy-calendar: alarm and events manager;
* cozy-labs/cozy-files: file storage;
* cozy-labs/cozy-contacts: contact book.

*HTML5 apps (require html5-apps plugin)*

* frankrousseau/coffee-snake: snake game;
* frankrousseau/CrappyBird: Flappy bird clone.

*Docker apps (require docker plugin)*

* frankrousseau/couchdb: a couchdb database, can be useful for your
  PouchDB-based apps;
* frankrousseau/wordpress: Wordpress blog engine.
* frankrousseau/ghost: Ghost blog engine.

# Plugins

## Add plugin

You can extend capability of the platform by adding plugins:

    cozy-light add-plugin cozy-labs/cozy-light-docker

## Remove plugin

    cozy-light remove-plugin cozy-labs/cozy-light-docker

## Available plugins

* cozy-labs/cozy-light-auth: add auth capabilities to Cozy Light.
* cozy-labs/cozy-light-basic-auth: add basic auth capabilities to Cozy Light.
* cozy-labs/cozy-light-html5-apps: to manage HTML5 apps like classic apps.
* cozy-labs/cozy-light-docker: experimental plugin to manage docker containers
  like classic apps.
* cozy-labs/cozy-light-domains: link a domain name to a static app.
* cozy-labs/cozy-light-githook: reinstall an app when a commit occurs on the
  Github repository.

# Configuration

The configuration file is located at `~/.cozy-light/config.json` path. App and
plugin configuration is set through the command line. Other settings must be
filled directly in the configuration file. 

*NB: The configuration file follows the JSON format.*

**Port**

    "port": 80,

**HTTPS**

Once the ssl field is present in the configuration file, Cozy Light will use
SSL and require HTTPS protocol to be browsed.

    "ssl": {
      "key": "/etc/cozy/server.key",
      "cert": "/etc/cozy/server.crt"
    },

# Contributions

Feel free to contribute in any way to this platform. The code is contained in
a single file. So, currently, it's super easy to understand and to propose new
capabilities. Make us proposal on what you want to do in the issue page then
send us your PR!

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

**Tests status**: ![https://travis-ci.org/cozy-labs/cozy-light.svg]

# FAQ

*What's the main difference with Cozy?*

Cozy is great and full featured. But its installation process and its memory
consumption make it too hard to set up for novice and/or cheap hardware owner.
So we decided to provide a ligther architecture. That way anyone could deploy
Cozy applications on their hardware.
Of course, you lost some features on the way like synchronization, auth
management, powerful indexer, app isolation and better realtime
management.

*Why don't you propose CalDAV/CarDAV synchronization?*

It could be done easily by reusing the Sync app from Cozy. It requires some
extra work to be integrated. Once again, if many many people ask for it, we'll
probably include it. 

*How do I manage multi-user?*

Cozy Light is tied to the Unix user who runs it. So you could start easily a
new instance of Cozy Light by making it run by another Unix user. It will run
the full stack again, but you will have a strong isolation between the two
users.

*Why did you write Cozy Light in JavaScript instead of Coffeescript?*

We are Coffescript fanboys but many people complain that our language choice
prevent them to contribute. We think that collaborative work matters the
most. So we decided to write Cozy Light in JavaScript. 

*How do I write my own application?*

Start from an existing one to understand the architecture. Then we recommend
you to use the Americano web framework and its plugin americano-cozy-pouchdb.
You can refer to the actual Cozy.io documentation. Everything works the same
except that you only need Node.js and Brunch as development environment.

*I don't want or can't code, how can I help?*

You have two options. You can either submit [bug reports](https://github.com/cozy-labs/cozy-light/issues)
to us or application developers or simply spread the word. Tweeting about this new project or
starring the Github repository are two great ways to support the project!

## Community

You can reach the Cozy Community by:

* Chatting with us on IRC #cozycloud on irc.freenode.net
* Posting on our [Forum](https://forum.cozy.io)
* Posting issues on this [repo](https://github.com/cozy-labs/cozy-light)
* Mentioning us on [Twitter](http://twitter.com/mycozycloud)

