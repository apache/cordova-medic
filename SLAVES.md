Cordova Medic Slaves
====================

This document describes slave-specific setup for Cordova Medic for running builds on each platform.

## Machine Setup

### Disk Indexer Thrashing

Since the build process writes and rewrites many files to the file system of the slave machine, the slave directory *should be excluded from the operating system's file system indexing process* to avoid disk thrashing. This can be accessed by changing Disk Indexer settings on Windows, or changing Spotlight Privacy settings on OS X.

### Machine Sleep

Disable machine sleep so that the slave is always on.

### Screen Saver

Enabling a screen saver has been observed to interfere with running emulators. Disable screen savers to avoid this problem.

## Environment Setup

### iOS

For iOS slaves, Xcode is required. It can be obtained from the Apple App Store, which requires an Apple ID. For deployment to physical devices, a valid Apple Developer license is also necessary.

Two special NPM packages are also required for Medic builds on iOS: `ios-sim` and `ios-deploy`. You can install them by running the following command with root/Administrator privileges:

    npm install -g ios-deploy ios-sim

To run Appium tests on real iOS devices you may need to install ios-webkit-debug-proxy. If you don't have Homebrew installed, please install according to the [Homebrew docs][brew].

When you've got Homebrew installed, just run the following commands:

 ``` center
 > brew update
 > brew install ios-webkit-debug-proxy
 ```

More info on installing ios-webkit-debug-proxy can be found in [Appium docs][appium_docs].

### Android

For Android slaves, the Android SDK is required, and can be installed with Android Studio as described [here][android_full] or without Android Studio as described [here][android_cli]. Alternatively (but only if the slave is running Windows) all tools required for Cordova can be installed in bulk using the the VS [tools for Cordova][vs_cordova].

#### Environment Variables

To make the Android commands available on the command line, set the following environment variables:

- `ANDROID_HOME`, equal to the absolute path to the Android SDK directory
- `PATH`, extended to contain `ANDROID_HOME/tools` and `ANDROID_HOME/platform_tools`

#### SDK

Once the SDK base is installed, actual tools and libraries can be installed by running:

    android

Select and install the tools and SDK appropriate for the latest version of Android supported by Cordova. Usually these are the latest set of tools that are automatically selected by running `android`. Alternatively, if you execute `cordova build` without the proper SDK installed, the build process will terminate with a message telling you which version of the Android SDK it needs.

For emulation, at least one Android Virtual Device should be available, which can be created by running:

    android avd

**Note:** Due to an [existing issue][issue], configure the AVD such that it has an SD card with space greater than 0KB.

#### Ant

If you're using Ant to build, you will also need it to be installed. The official Ant installation instructions are [here][ant].

### Windows 8 and Windows 8.1

For Windows slaves, Visual Studio is required. For deployment to devices, a Windows Developer License is also required. To install a license, run the following from PowerShell:

    Show-WindowsDeveloperLicenseRegistration

In order for medic to be able to gather and display detailed logs when running windows store apps, you'll also need to enable some of the windows logs channels. Please run the following commands in a command prompt with administrator privileges:

     wevtutil set-log "Microsoft-Windows-AppHost/Admin" /e:true /rt:true /ms:4194304
     wevtutil set-log "Microsoft-Windows-AppHost/ApplicationTracing" /e:true /rt:true /ms:4194304

## Connecting to Apache's Master

There is an installation of Buildbot running on Apache Infrastructure, which can be reached at [ci.cordova.io][ci], and which also runs Medic builds. To connect a slave to this master, the following few extra steps are required:

1. The slave needs to be defined in `master.cfg` in the Apache Infrastructure [SVN repository][infra_svn] (this requires Cordova committer access)
2. Credentials for connecting to the master need to be obtained via a [JIRA ticket][infra_jira] to the Apache Infrastructure team
3. The slave needs to be configured to connect to the Apache master, which can done either:

    a. By modifying an existing slave's `buildbot.tac` to point to the Apache master and use the given password **OR**
    b. By creating a new slave with a **dummy** password\*, and then editing the slave's `buildbot.tac`

\***WARNING**: The real password should *not* be passed as a CLI parameter when creating a new slave because then *the password would be exposed in shell history*

[android_full]: http://developer.android.com/sdk/installing/index.html?pkg=studio
[android_cli]:  http://developer.android.com/sdk/installing/index.html?pkg=tools
[vs_cordova]:   http://www.visualstudio.com/en-us/explore/cordova-vs.aspx
[issue]:        https://issues.apache.org/jira/browse/CB-8535
[ci]:           http://ci.cordova.io
[infra_jira]:   https://www.apache.org/dev/infra-contact
[infra_svn]:    https://svn.apache.org/repos/infra/infrastructure/buildbot/aegis/buildmaster/master1/
[ant]:          http://ant.apache.org/manual/install.html
[appium_docs]:  https://github.com/appium/appium/blob/master/docs/en/advanced-concepts/ios-webkit-debug-proxy.md
[brew]:         http://brew.sh/
