
# Install 

Install Node.js (>= 0.10), Git and essential build tools then install
cozy-light from the NPM package manager:

### Install Node for Rapsberry Pi

```bash
# Not secured (unknown vendor) but easy
wget http://node-arm.herokuapp.com/node_0.10.34.deb
sudo dpkg -i node_latest_armhf.deb
```

#### More secured way (offical vendor)

```bash
sudo su -
cd /opt
wget http://nodejs.org/dist/v0.10.26/node-v0.10.26-linux-arm-pi.tar.gz
tar xvzf node-v0.10.26-linux-arm-pi.tar.gz
ln -s node-v0.10.26-linux-arm-pi node
chmod a+rw /opt/node/lib/node_modules
chmod a+rw /opt/node/bin
echo 'PATH=$PATH:/opt/node/bin' > /etc/profile.d/node.sh
```

### Ubuntu

    sudo apt-get install build-essential
    sudo apt-get install git npm nodejs-legacy
    sudo npm install cozy-light -g

### Fedora

    su -
    yum install make automake gcc gcc-c++ kernel-devel git nodejs
    # yum install glibc-devel.i686 # for 64bits arch
    yum remove node-gyp # see https://github.com/TooTallNate/node-gyp/issues/363
    exit
    # npm install mocha -g # if you intend to hack the platform
    npm install node-gyp -g # required by pouchdb / leveldown
    npm install cozy-light -g

# Run

    cozy-light start

Then, with your browser, connect to: `http://localhost:19104/`

### Daemonize

To run Cozy Light in the background at each startup, it requires you to daemonize
it with a system tool. To achieve that, the simplest way is to use a platform
agnostic daemonizer tool. We recommend [supervisor](http://supervisord.org/).

Install it that way:

    sudo apt-get install supervisor

Then create a new configuration file `/etc/supervisor/conf.d/cozy-light.conf`
with the following content (don't forget to put the right user in the user
field):

    [program:cozy-light]
    autorestart=true
    autostart=true
    command=cozy-light start
    redirect_stderr=true
    user=youruser

Finally refresh Supervisor configuration and enjoy your Cozy Light:

    supervisorctl update

