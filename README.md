# Cozy Light


![Cozy Logo](https://raw.github.com/cozy/cozy-setup/gh-pages/assets/images/happycloud.png)

Lightweight personal cloud based on Node.js and PouchDB.

Cozy Light allows you to store on your own box your files, calendars, contacts,
todos, etc. It requires little configuration and can be run on cheap hardwares
like a Raspberry Pi, a Digital Ocean VPS or a good old desktop computer.

For more information about what is Cozy, you can check the 
[full version website](http://cozy.io).

# Benefits

* No targeted ads because your data are stored where noone profiles you.
* No more headaches with relying on too many services, all your apps are
  located in the same place.
* No need to learn a lot of system administration stuff, everything can be done
  with very few command lines.
* Cozy apps are simple, that means more productivity and time for you.
* It's extensible, you can build your app to satisfy your specific needs.
* Finally, you are no more dependant from your web app provider anymore.

# Install 

Install Node.js (>= 0.10) and essential build tools then install
cozy-light from the NPM package manager:

    sudo npm install cozy-light -g

# Run

    cozy-light start

Then, with your browser, connect to: `http://localhost:19104/`

# Applications

## Install application

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
* cozy-labs/cozy-light-docker: experimental plugin to manage docker containers like classic apps.

*Ideas*

* updates: add a plugin that manages application and/or platform updating.
* sync: add sync capabilities with a remote Cozy (great for a desktop usage).

# Configuration

The configuration file is located at `~/.cozy-light/config.json` path. App and
plugin configuration is set through the command line. Other settings must be
filled directly in the configuration file. 

*NB: The configuraiton file follows the JSON format.*

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

# FAQ

*What's the main difference with Cozy?*

Cozy is a great and full featured. But its installation process and its memory
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

*Why did you write Cozy Light in Javascript instead of Coffeescript?*

We are Coffescript fanboys but many people complain that our language choice
prevented them to contribute. We think that collaborative work matters the
most. So we decided to write Cozy Light in Javascript. 

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

