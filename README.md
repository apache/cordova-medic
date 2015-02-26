Medic using BuildBot
=======

> Tools for Automated Testing of Cordova

# Supported Cordova Platforms
- On Mac
  - iOS
  - Android
- On Windows
  - Android
  - Windows Phone 8
  - Windows Universal Apps (Windows 8.0, Windows 8.1, Windows Phone 8.1)

#Installation
##Select target OS
Install on a Mac or Windows depending on target test platform(s)

##Install prerequisites
medic requires grunt-cli npm package to be installed globally. You can install it by typing `npm install -g grunt-cli` in console.

**Note:** this requires admin privileges on Mac OS.

## Setup CouchDB
1. Get and install [couchdb](http://couchdb.apache.org/) 1.3.1 
2. Edit the local.ini to accept request from external host

  `bind_address = 0.0.0.0`
  
  Also you may need to add appropriate firewall rules for port 5984.
  
  To test access to CouchDB portal try to open \<CouchDB host IP\>:5984 from browser

3. Create the following three databases (functionality for creating of them should be available on \<CouchDB host IP\>:5984/_utils/):
  - build_errors
  - mobilespec_results
  - test_details

4. Add new document to `mobilespec_results` table with the following contents:
  ```
  {
      "_id": "_design/results",
      "views": {
          "sha": {
              "map": "function(doc){emit(doc.sha, {\"total\":doc.mobilespec.total,\"passed\":(doc.mobilespec.total - doc.mobilespec.failed),\"version\":doc.version,\"model\":doc.model,\"fails\":doc.mobilespec.failures});}"
          }
      }
  }
  ```

5. Set up a wireless access point so that the devices being tested can access the couchDB

## Install BuildBot
1. Get [buildbot](http://buildbot.net) version 0.8.8
2. Install buildbot using the buildbot install/tutorial instructions
    http://docs.buildbot.net/latest/manual/installation.html

    http://trac.buildbot.net/wiki/RunningBuildbotOnWindows
3. Get the sample running
4. Stop the slave and the master
5. Add slaves:
  - On Mac
    - buildslave create-slave slave_ios localhost:9889 cordova-ios-slave pass
    - buildslave create-slave slave_android localhost:9889 cordova-android-slave pass
  - On Windows
    - buildslave create-slave slave_windows localhost:9889 cordova-windows-slave pass
 
6. Copy the following files from the medic repository to buildbot master directory:
  - master.cfg
  - projects.conf
  - cordova.conf
  - repos.json
  - config.json.sample

  Then update config.json.sample with CouchDB host address, test platforms, ios keychain, current release build and _rename_ it to config.json
  
  **Note:** couchdb host must be specified via ip address due to windows platform restrictions.

  **Note 2:** config.json and repos.json files should be placed near cordova.conf (for local Medic instance in most cases this means that they need to be placed in BuildBot master directory).

#Running the System
- start the master with ~buildbot start master
- start the slaves with:
  - On Mac
    -  buildslave start slave_ios
    -  buildslave start slave_android
  - On Windows
    - buildslave start slave_windows

    **Note:**  on Windows slave instance must be run under administrator; git/bin folder must be added to PATH so that rm, cp, mkdir commands are available from the command prompt.
    
    **Note:**  if you are using Android emulator, please make sure that it has SD card size bigger than 0 (see [CB-8535](https://issues.apache.org/jira/browse/CB-8535)).
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

#Overview
Buildbot polls all the repositories every few minutes to look for changes. Whenever a change is detected, those changes trigger one or more build requests. 

Buildbot consists of a master that defines all the tests, the repositories, triggers, etc.
The actual tests are run by slaves that are controlled by the master. The buildbot master describes the steps to run for tests and which slaves those test should run on. 
Slaves that run tests on devices can only run one test at a time.
The common slave can run multiple tests at once.

At the start of each test run, the collection of components (git repositories) and the checked out SHA for each is collected into a document and written to the couchDB in test_details. 
The DB ref from this document is used as the SHA for the test and is what is recorded in mobilespec_results or build_errors

The various test runners are configured to report a fail/pass by device and the buildbot display will report FAIL if any test on any device fails. 
every command has a link to its output on the main display. When a mobile spec test completes, there is a link to the test result written to the output log.

#Current Test Configuration
- All slaves (Android, iOS, Windows) are configured to only run a single test at a time.
- Tools (Coho, CLI, test system) always build from the master branch
- Changes to tooling or the test scripts will trigger all tests.

- Android tests:
  - platform, mobilespec, js, and plugins from master branch (cordova-js is built and copied in)
  - platform and mobilspec 3.0.x branch with the cordova-js embedded in the cordova-android repo, plugins from master
  - There are additional builder (AndroidWin), which perform builds of mobilespec application for Android in Windows environment.

- iOS tests:
  - platform, mobilespec, js, and plugins from master branch (cordova-js is built and copied in)
  - platform and mobilspec 3.0.x branch with the cordova-js embedded in the cordova-ios repo, plugins from master

- Windows Phone8 tests:
  - platform, mobilespec, js, and plugins from master branch (cordova-js is built and copied in).
  - There are two separate builders, which performs builds in different environments (VS2012 + MSBuild 4.0 / VS2013 + MSBuild 12.0)

- Windows8 tests:
  - platform, mobilespec, js, and plugins from master branch (cordova-js is built and copied in)
  - Tests are executed on Local Machine, no support to run tests on connected device.

- Windows Universal platform tests:
  - platform, mobilespec, js, and plugins from master branch (cordova-js is built and copied in)
  - Tests are executed on Local Machine, mobilespec app for --phone target is launched on emulator. Running mobilespec app on attached devices not supported yet.
  - There are two separate builders, which performs builds in different environments (VS2012 + MSBuild 4.0 / VS2013 + MSBuild 12.0)

The tests use COHO and CLI for as much as possible to ensure that the developer tool chain is working.

#Configuration Files
**master.cfg:** The main configuration file for buildbot. It is a python script and defines the triggers, builders and status display.
It uses both config.json and repos.json to determine which platforms and versions to test.

**projects.conf** Configuration script used to load per-project buildbot configurations.

**cordova.conf** Configuration script that contains cordova project-specific buldbot configuration (Build steps, schedulers, build factories definitions, etc.)

The two files above (_projects.conf_ and _cordova.conf_ are necessary to maintain compatibility with Apache Buildbot configuration files structure)

**config.json:** Used by the buildbot master script and by some of the medic command-line tools. 
It defines the platforms to test, the current release version, the couchdb url, and the ios keychain. 
The release version specified here is used anywhere the keyword "RELEASE" is used in a test definition.

**repos.json:** Contains the definitions for the tests (schedulers) and the various repositories in the project. 
Tests define the components and branches that should trigger a test run. 
This requires multiple triggers for each test path since a build might use tools from master, platforms from release and plugins from dev.

For each repo there is a release branch (most recent supported release) and a current branch (tip-of-tree). 
The branches are used by the python script in conjunction with the tests to set up the trggers.
