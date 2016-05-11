<!--
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#
-->

# Jenkins Master Setup
## Purpose
The purpose of this document is to provide instructions on installation/deployment of the Jenkins master machine.

## Jenkins Installation
The Jenkins Installation instructions could be found [here][Jenkins Installation].

## Plugins Installation
* [GitHub Pull Request Builder Plugin][GitHub Pull Request Builder Plugin]
* [Github Authentication plugin][Github Authentication plugin]
* [Multiple SCMs plugin][Multiple SCMs plugin]

These plugins, listed above, needs to be installed on the Jenkins master. These plugins are installed along with their dependencies (automatically). Steps on installing the plugins could be found [here][Jenkins Plugins].

_Note_: A restart of the jenkins server is required after plugin installation

## GitHub User Creation
A new GitHub user has to be created for the purpose of CI. This user will be used for 2 purposes:

* To update the status of the CI jobs in the PR (success/failure).
* To create a new OAuth Application that is used to authenticate users into your CI system [This topic will be covered while configuring Github Authentication Plugin]

For the initial setup, a new GitHub User has been created with id - [Cordova QA][Cordova QA] and associated with [apachecordovabot@gmail.com][apachecordovabot@gmail.com]

## GitHub OAuth Application Creation
Once a GitHub User has been created, it is time to create a new OAuth Application. This application will be used to login users into your CI system and provide them with the required access rights (such as admin, read only, etc.). The steps to create the OAuth Application could be found [here][OAuth Application Creation Instruction]

## Authentication Configuration
* Go to Jenkins Home Page -> Manage Jenkins -> Configure Global Security
* Check *Enable Security* checkbox
* Under Access Control ->  Security Realm, Select *Github Authentication Plugin*
* The following items must be configured under *Global Github OAuth Settings*:
    * *GitHub Web URI*: https://github.com
    * *GitHub API URI*: https://api.github.com
    * *Client Id*: *Client Id from the newly created GitHub OAuth Application*
    * *Client Secret*: *Client Secret from the newly created GitHub OAuth Application*
    * *OAuth Scope*: read:org,user:email
* Under Authorization, Select *GitHub Commiter Authorization Strategy*
* The following items must be configured under *GitHub Authorization Settings*
    * *Admin User names*: Provide the github usernames of the persons to be designated as admins.
    * Check *Grant READ permissions to all Authenticated Users*
    * Check *Grant READ permissions for Anonymous Users*
    * Check *Grant ViewStatus permissions for Anonymous Users*

__Note__: The OAuth scope could be modified per requirements. Details on the scopes could be found [here][GitHub OAuth Scopes]. But it is important to remember that "read:org,user:email" are basic and **mandatory** requirements for the Authentication plugin. If the scope does not contain them, then the authentication will fail.

## Port Configuration
The Jenkins slaves uses a TCP Port to connect to the Master machine. Jenkins provides the option to use a fixed port or random port. If your master machine is on Cloud (such as Azure), you must choose the Fixed port and also open that port on the master machine in cloud.

### On Jenkins
* Go to Jenkins Home Page -> Manage Jenkins -> Configure Global Security
* Check *Enable Security* checkbox
* Under *TCP port for JNLP slave agents*, choose *Fixed* and provide the port number (such as 49666)

### On Master Machine in cloud
In Azure cloud, you need to open this port as an end point. By default, this port will have an idle timeout of 4 minutes. This will not be sufficient. So, we need to use Azure Powershell Tools, to modify this value (There is no UI option to modify this). The following command could be used to create a port and set the idle timeout value.

```Get-AzureVM -ServiceName cordova-ci -Name cordova-ci | Add-AzureEndpoint -Name "JenkinsSlave" -Protocol "tcp" -PublicPort 49666 -LocalPort 49666 -IdleTimeoutInMinutes 30 | Update-AzureVM```

## Job Creation
* Go to Jenkins Home Page -> New Item
* Provide a *Item Name* (Such as "cordova-plugin-console")
* Choose *Multi-configuration project*
* Click *Ok*
* Provide a *Description*
* Check *GitHub Project*. Provide the correct project URL. (__Note__: This is an important parameter. GitHub Pull Request will not work without this value)
* Check *This build is parameterized*.
    * Add a String Parameter
    * Add *ghprbActualCommit* as *Name*
    * Add *master* as *Default Value*
    * This value will be used to start parameterized builds manually.
* Under *Source Code Management*, Choose *Multiple SCMs*
* Add each repository you want to use. Normally for paramedic testing (say for cordova-plugin-console), you need 3 repositories
    * cordova-plugin-console
    * cordova-paramedic
    * cordova-medic (for configuration files)
* For the specific repository that is tested, specify **${ghprbActualCommit}** as the branch to build. For other two repositories, you could use master.
* Checkout each repository to a sub-directory. (This option could be found under Additional Behaviors)
* Under *Build Trigger*, Choose *GitHub Pull Request Builder*.
* Under *Advanced*:
    * Choose a Trigger phrase
    * Choose the correct crontab
    * Choose *Build every pull request automatically without asking (Dangerous!).*
* Under *Trigger Setup*, the following values need to be configured:
    * *Commit Status Build Triggered*: --none--
    * *Commit Status Build Started*: --none--
    * *Commit Status Build Result*: Provide appropriate messages for success and failure
* Under *Configuration Matrix*:
    * Add *Slaves* axis
    * Add *User Defined axis*
        * Provide platformName as Name
        * Provide the following values
            * windows-8.1-store
            * windows-10-store
            * windows-8.1-phone
            * ios
            * android
    * Check *Combination Filter* with the following filter:

```(label == "mac-slave" && platformName == "ios") || (label == "mac-slave" && platformName == "android") || (label == "windows-slave" && platformName == "windows-10-store") || (label == "windows-slave" && platformName == "windows-8.1-phone") || (label == "windows-slave" && platformName == "windows-8.1-store") || (label == "windows-slave" && platformName == "android")```
* Under *Build*:
    * Add *Execute Shell* step with the following commands:
        * ``cd cordova-paramedic``
        * ``npm install``
    * Add a second *Execute Shell* step with the following commands:
        * ```node cordova-paramedic/main.js --config $WORKSPACE/cordova-medic/jenkins-conf/$platformName.config.json --plugin $WORKSPACE/cordova-plugin-console --outputDir $WORKSPACE --tccDb $WORKSPACE/cordova-medic/lib/tcc/TCC.db```
* Under *Post-build Actions*:
    * Add *Publish JUnit test result report* step
        * Specify __*.xml__ as *Test Report XMLs*.
        * Check *Retail long standard output/error*
        * Specify *Health Amplification Factor* as *1.0*
    * Add *Archive the artifacts* step
        * Specify __*.txt__ as *Files to archive*.

[GitHub Pull Request Builder Plugin]:https://wiki.jenkins-ci.org/display/JENKINS/GitHub+pull+request+builder+plugin
[Github Authentication plugin]:https://wiki.jenkins-ci.org/display/JENKINS/Github+OAuth+Plugin
[Multiple SCMs plugin]:https://wiki.jenkins-ci.org/display/JENKINS/Multiple+SCMs+Plugin
[Jenkins Plugins]: https://wiki.jenkins-ci.org/display/JENKINS/Plugins
[Cordova QA]: https://github.com/cordova-qa
[apachecordovabot@gmail.com]: mailto:apachecordovabot@gmail.com
[OAuth Application Creation Instruction]: https://wiki.jenkins-ci.org/display/JENKINS/Github+OAuth+Plugin#GithubOAuthPlugin-Setup
[GitHub OAuth Scopes]: https://developer.github.com/v3/oauth/#scopes
[Jenkins Installation]: https://wiki.jenkins-ci.org/display/JENKINS/Installing+Jenkins