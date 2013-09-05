#Medic using BuildBot
=======

> Tools for Automated Testing of Cordova

#Installation
- install on a Mac if you intend to test iOS (only tested on a Mac)
- get [couchdb] (http://couchdb.apache.org/) 1.3.1 
  - Install couch db
  - Edit the local.ini to accept request from external host.
      bind_address = 0.0.0.0
  - Setup database:
      Create three databases
        - build_errors
        - mobilespec_results
        - test_details

- set up a wireless access point so that the devices being tested can access the couchDB

- get [buildbot] (http://buildbot.net) version 0.8.8
- install buildbot using the buildbot install/tutorial instructions
- get the sample running
- stop the slave and the master
- add slaves:
  - buildslave create-slave slave_ios localhost:9889 ios-slave pass
  - buildslave create-slave slave_android localhost:9889 android-slave pass
 
- get three files from the medic repository
  - master.cfg - copy to buildbot/master/master.cfg
  - config.json.sample -  copy to the buildbot base directory, then edit for local ip, test platforms, ios keychain, current release build
  - repos.json - copy to the buildbot base directory

#Running the System
- start the master with buildbot start master
- start the slaves with:
  -  buildslave start slave_ios
  -  buildslave start slave_android
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
every command has a link to its output o the main display. When a mobile spec test completes, there is a link to the test result written to the output log.

#Current Test Configuration
- Two slaves are configured (Android and iOS) Android and iOS wil only run a single test at a time.
- Tools (Coho, CLI, test system) always build from the master branch
- Changes to tooling or the test scripts will trigger all tests.

- Android tests:
  - platform, mobilespec and js  from master branch, plugins from dev branch (cordova-js is built and copied in)
  - platform and mobilspec 3.0.x branch with the cordova-js embedded in the cordova-android repo, plugins from master

- iOS tests:
  - platform, mobilespec and js  from master branch, plugins from dev branch (cordova-js is built and copied in)
  - platform and mobilspec 3.0.x branch with the cordova-js embedded in the cordova-ios repo, plugins from master


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
  

 
