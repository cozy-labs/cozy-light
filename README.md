# Cozy Light

Lightweight personal cloud based on Node.js and PouchB.
Store and manage through web apps your files, calendars, contacts, todos, etc.
Set your apps on your own hardware: Raspberry Pi at home, VPS on digital ocean
servers or on your desktop computer.

# Install 

Install Node.js (>= 0.10) and essential build tools then install
cozy-light from the NPM package manager:

    sudo npm install cozy-light -g

# Run

    cozy-light start

# Install application

Application are fetched from github. Application name is build from the
username and the repository name:

    cozy-light install cozy-labs/calendar

Most of the apps are runnable without Cozy Light. You can install and run them
separately:

    npm install cozy-calendar -g
    cozy-calendar 

# Uninstall application

    cozy-light uninstall cozy-labs/calendar

# Benefits

* No targeted ads because your data are stored where noone profiles you.
* No more headaches with relying on too many services, all your apps are
  located in the same place.
* No need to learn a lot of system administration stuff, everything can be done
  with very few command lines.
* Cozy apps are simple, that means more productivity and time for you.
* Extensible: build your app to satisfy your specific needs.
* Finally, you are no more dependant from your web app provider anymore.

# Available applications

* cozy-labs/tasky: simple and efficient task manager.
* cozy-calendar: alarm and events manager;

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
management, powerful indexing capabilities, app isolation and better realtime
management.

*Why auth management is not included?*

For the first publication of Cozy Light we wanted to make it as lean as
possible. Self hosting platform like Yunohost or arkOS already manages auth for
the installed app. So we prefer to let that them do the work (a simple 
proxy server like Nginx or Apache is good too for that).

*Why don't you handle https?*

Not sure that it's a good thing. We prefer you put Cozy behind a proxy like on
Nginx or Apache. Then you could set HTTPS on that proxy. 
If many people find an usage where it's useful, we'll think about adding this
support.

*Why don't you propose CalDAV/CarDAV synchronization?*

It could be done easily by reusing the Sync app from Cozy. Once again, if many
many people ask for it, we'll probably implement it. 

*How do I manage multi-user?*

Cozy Light is tied to the Unix user who runs it. So you could start easily a
new instance of Cozy Light by making it run by another Unix user. It will run
the full stack again, but you will have a strong isolation between the two
users.

*Why did you write Cozy Light with Javascript instead of Coffeescript?*

We are Coffescript fanboys but many people complain that our language choice
prevented them to contribute. We think that collaborative work matters the
most. So we decided to write Cozy Light with Javascript. 

*How do I write my own application?*

Start from an existing one to understand the architecture. Then we recommend
you to use the Americano web framework and its plugin Americano-cozy-pouchdb.
You can refer to the actual Cozy.io documentation. Everything works the same
except that you only need Node.js and Brunch as development environment.

*I don't want or can't code, how can I help?*

You have two options. You can either submit bug reports to us or application
developers or simply spread the word. Tweeting about this new project or
starring the Github repository are two great way to support the project!

