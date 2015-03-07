Cordova Medic Slaves
====================

# Introduction

This document describes slave-specific setup for Cordova Medic for running builds on each platform.

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

For Windows slaves, Visual Studio is required. For deployment to devices, a Windows Developer License is also required. To install a developer, run the following from PowerShell:

    Show-WindowsDeveloperLicenseRegistration

[android_full]: http://developer.android.com/sdk/installing/index.html?pkg=studio
[android_cli]:  http://developer.android.com/sdk/installing/index.html?pkg=tools
[vs_cordova]:   http://www.visualstudio.com/en-us/explore/cordova-vs.aspx
[issue]:        https://issues.apache.org/jira/browse/CB-8535
