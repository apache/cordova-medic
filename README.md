Medic using BuildBot
=======

> Tools for Automated Testing of Cordova

# Supported Cordova Platforms
- On Mac
  - iOS
  - Android
- On Windows 
  - Windows Phone 8
  - Windows 8

#Installation
##Select target OS
Install on a Mac or Windows depending on target test platform(s)

## Setup CouchDB
1. Get and install [couchdb] (http://couchdb.apache.org/) 1.3.1 
2. Edit the local.ini to accept request from external host

  `bind_address = 0.0.0.0`

3. Create the following three databases:
  - build_errors
  - mobilespec_results
  - test_details

4. Set up a wireless access point so that the devices being tested can access the couchDB

## Install BuildBot
1. Get [buildbot] (http://buildbot.net) version 0.8.8
2. Install buildbot using the buildbot install/tutorial instructions
    http://docs.buildbot.net/latest/manual/installation.html

    http://trac.buildbot.net/wiki/RunningBuildbotOnWindows
3. Get the sample running
4. Stop the slave and the master
5. Add slaves:
  - On Mac
    - buildslave create-slave slave_ios localhost:9889 ios-slave pass
    - buildslave create-slave slave_android localhost:9889 android-slave pass
  - On Windows
    - buildslave create-slave slave_windows localhost:9889 windows-slave pass
 
6. Get three files from the medic repository
  - master.cfg - copy to buildbot/master/master.cfg
  - repos.json - copy to the buildbot base directory
  - On Mac
    - config.json.sample -  copy to the buildbot base directory, then edit for local ip, test platforms, ios keychain, current release build
  - On Windows
    - config.json.sample-windows -  copy to the buildbot base directory, then edit for local ip

#Running the System
- start the master with ~buildbot start master
- start the slaves with:
  - On Mac
    -  buildslave start slave_ios
    -  buildslave start slave_android
  - On Windows
    - buildslave start slave_windows

    **Note:**  on Windows slave instance must be run under administrator; git/bin folder must be added to PATH so that rm, cp, mkdir commands are available from the command prompt.
- point your browser at http://localhost:8010/waterfall to see the buildbot state
- point your browser to the couchDB http://localhost:5984/_utils/index.html to look at detailed test results

#Controlling
- restart the master with buildbot restart master
- stop the master with buildbot stop master
- force a test by clicking on the test link at the top of the buildbot display and then 'force build'

#Configuring
- all changes for a local install should only require edits to config.json in the buildbot base directory
- new platforms, test procedures, build steps, etc require edits to master.cfg and repos.json which should still be global (all platforms)
- whenever config.json, repos.json or master.cfg changes, you need to restart the master (not slaves)

**Note:**  if you install the master on a separate machine from the slave(s), the config.json must be on both machines. 
The slaves expect to find the file in the buildbot root and require the ios key information, couchdb IP and the start page.

#Overview
Buildbot polls all the repositories every few minutes to look for changes. Whenever a change is detected, those changes trigger one or more build requests. 

Buildbot consists of a master that defines all the tests, the repositories, triggers, etc.
The actual tests are run by slaves that are controlled by the master. The buildbot master describes the steps to run for tests and which slaves those test should run on. 
Slaves that run tests on devices can only run one test at a time.
The common slave can run multiple tests at once.

At the start of each test run, the collection of components (git repositories) and the checked out SHA for each is collected into a document and written to the couchDB in test_details. 
The DB ref from this document is used as the SHA for the test and is what is recorded in mobilespec_results or build_errors

The various test runners are configured to report a fail/pass by device and the buildbot display will report FAIL if any test on any device fails. 
every command has a link to its output o the main display. When a mobile spec test completes, there is a link to the test result written to the output log.

#Current Test Configuration
- All slaves (Android, iOS, Windows) are configured to only run a single test at a time.
- Tools (Coho, CLI, test system) always build from the master branch
- Changes to tooling or the test scripts will trigger all tests.

- Android tests:
  - platform, mobilespec and js  from master branch, plugins from dev branch (cordova-js is built and copied in)
  - platform and mobilspec 3.0.x branch with the cordova-js embedded in the cordova-android repo, plugins from master

- iOS tests:
  - platform, mobilespec and js  from master branch, plugins from dev branch (cordova-js is built and copied in)
  - platform and mobilspec 3.0.x branch with the cordova-js embedded in the cordova-ios repo, plugins from master

- Windows Phone8 tests:
  - platform, mobilespec and js  from master branch, plugins from dev branch (cordova-js is built and copied in)

- Windows8 tests:
  - platform, mobilespec and js  from master branch, plugins from dev branch (cordova-js is built and copied in). Tests are executed on Local Machine, no support to run tests on connected device.

The tests use COHO and CLI for as much as possible to ensure that the developer tool chain is working.

#Configuration Files
master.cfg: The main configuration file for buildbot. It is a python script and defines the triggers, builders and status display.
It uses both config.json and repos.json to determine which platforms and versions to test.

config.json: 
Used by the buildbot master script and by some of the medic command-line tools. 
It defines the platforms to test, the current release version, the couchdb url, and the ios keychain. 
The release version specified here is used anywhere the keyword "RELEASE" is used in a test definition.


repos.json: 
Contains the definitions for the tests (schedulers) and the various repositories in the project. 
Tests define the components and branches that should trigger a test run. 
This requires multiple triggers for each test path since a build might use tools from master, platforms from release and plugins from dev.

For each repo there is a release branch (most recent supported release) and a current branch (tip-of-tree). 
The branches are used by the python script in conjunction with the tests to set up the trggers. 
  

 
