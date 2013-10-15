#Medic using BuildBot
=======

> Tools for Automated Testing of Cordova

#Installation
- get [couchdb] (http://couchdb.apache.org/) 1.3.1 
  - Install couch db
  - Edit the local.ini to accept request from external host.
      bind_address = 0.0.0.0
  - Setup database:
      Create three databases
        - build_errors
        - mobilespec_results
        - test_details

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
  - config.json.sample -  copy to buildbot, then edit for local ip, keychain

#Running the System
- start the master with buildbot start master
- start the slaves with:
  -  buildslave start slave_common
  -  buildslave start slave_ios
  -  buildslave start slave_android

- restart the master with buildbot restart master
- stop the master with buildbot stop master

#Configuring
- change test, build steps, etc in master.cfg
- whenever master.cfg changes, you need to restart the master (not slaves)

#Overview
The buildbot master describes the steps to run for tests and which slaves those test should run on. 
Slaves can have limits imposed, so slaves that run tests on devices can only run one test at a time.
The common slave can run multiple tests at once.



