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

- get [buildbot] (http://buildbot.net) version 0.8.7p1
- install buildbot using the buildbot install/tutorial instructions
- get the sample running
- stop the slave and the master
- add slaves:
  - buildslave create-slave slave_common localhost:9889 common-slave pass
  - buildslave create-slave slave_ios localhost:9889 ios-slave pass
  - buildslave create-slave slave_android localhost:9889 android-slave pass
 
- get two files from the medic repository
  - master.cfg - copy to buildbot/master/master.cfg
  - config.json.sample -  copy to buildbot, then edit for local ip, test platforms, ios keychain, current release build

#Running the System
- start the master with buildbot start master
- start the slaves with:
  -  buildslave start slave_common
  -  buildslave start slave_ios
  -  buildslave start slave_android
- point your browser at http://localhost:8010/waterfall to see the buildbot state
- point your browser to the couchDB http://localhost:5984/_utils/index.html to look at detailed test results

#Controlling
- restart the master with buildbot restart master
- stop the master with buildbot stop master
- force a test by clicking on the test link at the top of the buildbot display and then 'force build'

#Configuring
- all changes for a local install should only require edits to config.json
- new platforms, test procedures, build steps, etc in master.cfg which should still be global
- whenever config.json or master.cfg changes, you need to restart the master (not slaves)

#Overview
Buildbot polls all the repositories every few minutes to look for changes. Whenever a change is detected, those changes trigger one or more build requests. 

Buildbot consists of a master that defines all the tests, the repositories, triggers, etc.
The actual tests are run by slaves that are controlled by the master. The buildbot master describes the steps to run for tests and which slaves those test should run on. 
Slaves that run tests on devices can only run one test at a time.
The common slave can run multiple tests at once.


#Current Test Configuration
- three slaves are configured (Android, iOS and common) Android and iOS wil only run a single test at a time.
- Tools (Coho, CLI, test system) always build from the master branch
- Changes to tooling or the test scripts will trigger all tests.
- Android tests:
  - master branch using cordova-js from master
  - 3.0.x branch with the embedded cordova-js
- iOS tests:
  - master branch using cordova-js from master
  - 3.0.x branch with the embedded cordova-js


The tests use COHO and CLI for as much as possible to ensure that the developer tool chain is working.


