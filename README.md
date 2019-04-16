Cordova Medic
=============

---
📌 **Deprecation Notice**

This repository is deprecated and no more work will be done on this by Apache Cordova. You can continue to use this and it should work as-is but any future issues will not be fixed by the Cordova community.

Feel free to fork this repository and improve your fork. Existing forks are listed in [Network](../../network) and [Forks](../../network/members).

- Learn more: https://github.com/apache/cordova/blob/master/deprecated.md#deprecated-tooling
---

# Description

This repository contains Buildbot configuration and automation tools for setting up a continuous integration system for Apache Cordova. It currently supports builds on the following platforms:

- iOS
- Android (OS X)
- Windows Universal Apps (Windows 8.0, Windows 8.1, Windows Phone 8.1)
- Windows Phone 8

It also contains a runner script to run Appium tests designed for Cordova core plugins. To run only Appium tests, please refer to [APPIUM.md](APPIUM.md).

# Prerequisites

## CouchDB

Medic depends on CouchDB for reporting results. The following steps document how to install a CouchDB server for development. If a CouchDB server already exists for use, feel free to skip to the Setting Up section.

### Installation

CouchDB can be installed from [this page][couchdb] as per the documentation provided there. Once CouchDB is installed, configure it to accept requests from external hosts by setting the following value in its `local.ini` file:

    bind_address = 0.0.0.0

Firewall rules for port 5984 (the default CouchDB port) may need to be added to allow access to the server. To test that it is configured correctly, open `http://[COUCHDB_HOST]:5984/_utils/` from a browser.

### Setup

Create the following databases:

- build_errors
- test_details
- mobilespec_results

They can be created by going to the CouchDB admin page (located at `http://[COUCHDB_HOST]:5984/_utils/`) and clicking the `Create Database ...` button.

Next, add the following document to the `mobilespec_results` database:

    {
        "_id": "_design/results",
        "views": {
            "sha": {
                "map": "function(doc){emit(doc.sha, {\"total\":doc.mobilespec.total,\"passed\":(doc.mobilespec.total - doc.mobilespec.failed),\"version\":doc.version,\"model\":doc.model,\"fails\":doc.mobilespec.failures});}"
            }
        }
    }

Lastly, make sure that devices and machines that will be using Medic have access to the Internet and to the CouchDB server that was just created.

## Python

Medic contains Python code and therefore requires Python. Install Python 2.7.x from [here][python]. *Do not install Python 3.x, because Medic does not run on it.* Make sure that the Python package manager, pip, is installed with Python. To verify that Python and pip are installed, run the following:

    python --version
    pip --version

On Windows, the PyWin32 extensions are required, and they can be acquired [here][pywin32].

## Buildbot

Medic uses Buildbot for running builds and performing continuous integration. Buildbot has the concept of master and slave machines, and has different libraries for each. (More info about Buildbot concepts can be found [here][bbconcepts]). To install the Buildbot library for a master, run the following:

    pip install buildbot

For a machine that will run Buildbot slaves, install the Buildbot slave library by running the following:

    pip install buildbot-slave

## UNIX tools

To run builds, Medic slaves use some standard Unix tools such as `cp`, `rm`, and `git`. To run them on Windows, install Git from [here][git] and make sure to select the option to make basic Unix tools bundled with Git available within `cmd`.

## Cordova

Any core depencencies of Cordova, like Node.js and NPM, are naturally dependencies of the slave machines that will run Cordova builds. Node.js and NPM can be obtained from [here][node].

# Installation

Medic contains configuration for a Buildbot installation to run Apache Cordova continuous integration. Buildbot uses the master-slave paradigm to orchestrate builds, and medic contains configuration for a Buildbot master and slaves, as well as a few extra files, all inside the `buildbot-conf` directory.

The instructions provided below describe a simple development setup, not a full-blown production deployment, which is outside the scope of this document. More official documentation on Buildbot can be found [here][buildbot], and on running Buildbot on Windows can be found [here][buildbot_windows].

Although a Buildbot master and slaves are separate tasks, they do not need to be run on different machines, and the following steps can either be performed on separate machines or the same one. Keep in mind however that a slave can only run builds that its machine's environment supports.

All of the following steps assume that Buildbot's slaves and masters will be installed under `/home/buildbot`.

## Master

First, create a Buildbot master. The following steps are a summary of [these official steps][buildmaster], so please feel free to follow the official ones instead.

Create a master directory at `/home/buildbot/master` by running:

    buildbot create-master /home/buildbot/master

Then, install the Medic master configuration by copying the following files into `/home/buildbot/master`, overwriting any files if prompted:

- master.cfg
- projects.conf
- cordova.conf
- cordova-repos.json
- *cordova-config.json*<sup>[1]</sup>
- *cordova-exta.conf*<sup>[1]</sup>
- *private.py*<sup>[1]</sup>
- *github.passwd*<sup>[1]</sup>

<sup>[1]</sup> These files do not exist in the repository and must be created for each installation of Medic. Create them from their respective `.sample` files.

## Slaves

Now, create slaves. Similarly to the above instructions, the following steps are a summary of [the official ones][buildslave], so please feel free to follow the official ones.

On OS X:

    buildslave create-slave /home/buildbot/osx http://[MASTER_HOST]:9889 cordova-ios-slave pass

On Linux:

    buildslave create-slave /home/buildbot/linux http://[MASTER_HOST]:9889 cordova-linux-slave pass

On Windows 8 and Windows 8.1:

    buildslave create-slave /home/buildbot/windows http://[MASTER_HOST]:9889 cordova-windows-slave pass

No further steps are necessary to make a slave obey a Medic master. However, every slave needs to be configured appropriately for its platform. For platform-specific details on slave configuration, see [SLAVES.md](SLAVES.md).

# Testing

To test a Buildbot master config, run the following command in the directory that contains is `master.cfg`:

    buildbot checkconfig

# Running

To start the master, run:

    buildbot start /home/buildbot/master

To start a slave (e.g. for Windows), run:

    buildslave start /home/buildbot/windows

To view the master control panel, browse the URI: `http://[MASTER_HOST]/`.

To stop either task, just replace `start` with `stop` in the above commands. **NOTE**: On Windows, the slave task blocks the console, and `Ctrl-C` will stop it. On all other platforms both master and slave run as daemons, and using the `stop` command will terminate them.

To check logs for a master or a slave, look at the `twistd.log` file in its respective directory. Using the `tail` utility is very handy for this, like so:

    tail -n 100 -f /home/buildbot/osx/twistd.log

# Changing Configuration

Buildbot has an unusual configuration mechanism (Python code) and as such requires a restart to reload it. The Buildbot documentation also describes a  `buildbot reconfig` command, but it does not work in all cases. More information is [here][reconfig].

In general, when any of the files in the master directory are changed, a restart/reconfig is necessary. However, slaves do not need to be reconfigured or restarted when the master's configuration changes.

# Configuration Layout

**master.cfg**: The main configuration file for Buildbot. This file is made to be similar to the one used on the Apache Infrastructure Buildbot because Medic runs on there.

**projects.conf**: This file is included because it also mirrors the Apache Infrastructure setup.

**cordova.conf**: This file contains the actual Buildbot configuration that is unique to Apache Cordova.

**cordova-extra.conf**: An extension of `cordova.conf` that is internal to a particular installation of Medic, is not tracked in the repo, and does not make it into the Apache Infrastructure Buildbot. *Only a sample of this file is provided in the repo, with a `.sample` extension.*

**cordova-repos.json:** List of Cordova repositories and their relevant information.

**cordova-config.json**: Installation-specific file that defines miscellaneous parameters like CouchDB host and port, and email credentials. *Only a sample of this file is provided in the repo, with a `.sample` extension.*

**private.py**: Python file containing sensitive configuration. *Only a sample of this file is provided in the repo, with a `.sample` extension.*

**github.passwd**: File containing one line: a username and password for authenticating GitHub hooks. *Only a sample of this file is provided in the repo, with a `.sample` extension.*

# Deployment

The [Buildbot master][apache_master] is configured directly from the Apache Infrastructure [SVN repository][infra_svn]. Changes from `cordova-medic` are submitted to the Buildbot master by copying config files from `buildbot-conf` into the Buildbot master's config directory. Only Apache Committers have access to this config. Remember, **before submitting any changes, verify that the new config works** by [testing it](#testing).

To get the config of the Buildbot master, check out the SVN repository:

    svn checkout https://svn.apache.org/repos/infra/infrastructure/buildbot/aegis/buildmaster/master1/

This will create a folder called `master1` that contains the master's config files. To apply changes, copy the Cordova-specific config files from `cordova-medic/buildbot-conf` into the SVN repo:

    cp cordova-medic/buildbot-conf/cordova-config.json master1/projects/cordova-config.json
    cp cordova-medic/buildbot-conf/cordova-repos.json master1/projects/cordova-repos.json
    cp cordova-medic/buildbot-conf/cordova.conf master1/projects/cordova.conf

To check the changes that were made, go into `master1` and run:

    svn diff

To undo changes, run (also in `master1`):

    svn revert -R ./*

**WARNING**: it may be necessary to *manually undo some changes* because `cordova.conf` in `buildbot-config` and `cordova.conf` in the SVN repo have slightly different settings (indeed, this is something that can be improved by, for example, making the file in `buildbot-conf` match the one in the SVN repo; please feel free to correct this and then remove this warning.).

Finally, commit the changes:

    svn commit -m "[message about the changes]"

[couchdb]:          http://couchdb.apache.org/
[python]:           https://www.python.org/downloads/
[pywin32]:          http://sourceforge.net/projects/pywin32/files/
[buildbot]:         http://docs.buildbot.net/0.8.10/manual/installation.html
[buildmaster]:      http://docs.buildbot.net/0.8.10/manual/installation.html#creating-a-buildmaster
[buildslave]:       http://docs.buildbot.net/0.8.10/manual/installation.html#creating-a-buildslave
[bbconcepts]:       http://docs.buildbot.net/0.8.10/manual/concepts.html
[git]:              http://git-scm.com/download/win
[node]:             http://nodejs.org/download/
[buildbot_windows]: http://trac.buildbot.net/wiki/RunningBuildbotOnWindows
[reconfig]:         http://docs.buildbot.net/0.8.10/manual/cfg-intro.html#reloading-the-config-file-reconfig
[apache_master]:    http://ci.apache.org/waterfall?category=cordova
[infra_svn]:        https://svn.apache.org/repos/infra/infrastructure/buildbot/aegis/buildmaster/master1/
