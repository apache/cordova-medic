Cordova Medic Slaves
====================

This document describes slave-specific setup for Cordova Medic for running builds on each platform.

## Slave Setup

### All Operating Systems

Since the build process writes and rewrites many files to the file system of the slave machine, the slave directory *should be excluded from the operating system's file system indexing* process to avoid disk thrashing.

### iOS

For iOS slaves, Xcode is required. It can be obtained from the Apple App Store, which requires an Apple ID. For deployment to physical devices, a valid Apple Developer license is also necessary.

Two special NPM packages are also required for Medic builds on iOS: `ios-sim` and `ios-deploy`. You can install them by running the following command with root/Administrator privileges:

    npm install -g ios-deploy ios-sim

### Android

For Android slaves, the Android SDK is required, and can be installed with Android Studio as described [here][android_full] or without Android Studio as described [here][android_cli]. Alternatively, if the slave is running Windows, all tools required for Cordova can be installed in bulk using the the VS [tools for Cordova][vs_cordova].

Once the SDK is installed, Android tools can be installed by running:

    android

For emulation, at least one Android Virtual Device should be available, which can be created by running:

    android avd

**Note:** Due to an [existing issue][issue], configure the AVD such that it has an SD card with space greater than 0KB.

### Windows 8 and Windows 8.1

For Windows slaves, Visual Studio is required. For deployment to devices, a Windows Developer License is also required. To install a license, run the following from PowerShell:

    Show-WindowsDeveloperLicenseRegistration

## Connecting to Apache's Master

There is an installation of Buildbot running on Apache Infrastructure, which can be reached at [ci.cordova.io][ci], and which also runs Medic builds. To connect a slave to this master, the following few extra steps are required:

1. The slave needs to be defined in `master.cfg` in the Apache Infrastructure [SVN repository][infra_svn] (this requires Cordova committer access)
2. Credentials for connecting to the master need to be obtained via a [JIRA ticket][infra_jira] to the Apache Infrastructure team
3. The slave needs to be configured to connect to the Apache master, which can done either:
    a. By modifying an existing slave's `buildbot.tac` to point to the Apache master and use the given password **OR**
    b. By creating a new slave with a **dummy** passwpord\*, and then editing the slave's `buildbot.tac`

\***WARNING**: The real password should *not* be passed as a CLI parameter when creating a new slave because then *the password would be exposed in shell history*

[android_full]: http://developer.android.com/sdk/installing/index.html?pkg=studio
[android_cli]:  http://developer.android.com/sdk/installing/index.html?pkg=tools
[vs_cordova]:   http://www.visualstudio.com/en-us/explore/cordova-vs.aspx
[issue]:        https://issues.apache.org/jira/browse/CB-8535
[ci]:           http://ci.cordova.io
[infra_jira]:   https://www.apache.org/dev/infra-contact
[infra_svn]:    https://svn.apache.org/repos/infra/infrastructure/buildbot/aegis/buildmaster/master1/
