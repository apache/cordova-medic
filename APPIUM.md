Cordova Medic Appium Runner
===========================

This document describes a method to run Cordova Appium tests without full-blown CI setup with [Camera][plugin_camera] and [Contacts][plugin_contacts] plugins taken as an example.
Appium tests can be run on Android and iOS. For additional system requirements please refer to the "Requirements" section of [Appium docs][appium_reqs].

Some Cordova Appium tests are highly dependent on the apps installed on the device running them. For example, it is recommended that you have "Gallery" app installed as a default image viewer on Android. One of our stretch goals is to make them more generic, so it may change in the future.

## Setup

Clone medic repository by running

``` shell
 > git clone https://github.com/apache/cordova-medic
 > cd cordova-medic
 > npm install
 > cd ..
```

You will need an app to test, so create it and add the platform and the plugins:

``` shell
 > cordova create test-app
 > cd test-app
 > cordova platform add <android or ios>
 > cordova plugin add cordova-plugin-camera cordova-plugin-contacts
```

### Running on Android

Cordova Appium tests for Android can be run on either a real device or an emulator. If you're running tests on the emulator you will need to launch it manually before the test run. Please also note that Appium tests are written with Android API 19 (KitKat) and 21 (Lollipop) in mind. They have not yet been tested on higher versions of Android.

``` shell
 > emulator -avd <avd name, for example, api19>
```

Now you're ready to run the tests. Command sample to run the tests on the emulator with the name "api19" and API level 19:

``` shell
 > node cordova-medic/medic/medic.js appium --app test-app --platform android --deviceName api19 --platformVersion 19 --plugins "cordova-plugin-camera cordova-plugin-contacts"
```

When running on real Android device you'll need to specify its name (which you can learn by running `adb devices -l`) and the `--device` argument to explicitly say that you want the tests to run on a real device.

Command sample to run the tests on real Android with KitKat:

``` shell
 > node cordova-medic/medic/medic.js appium --app test-app --platform android --device --deviceName JRTSTKGAWO8D9PSW --platformVersion 19 --plugins "cordova-plugin-camera cordova-plugin-contacts"
```

### Running on iOS

You can run Cordova Appium tests for iOS on either real device or a simulator.

To run Appium tests on real iOS device you may need to install `ios-webkit-debug-proxy`. If you don't have Homebrew installed, please install it according to the [Homebrew docs][brew].

When you've got Homebrew installed, just run the following commands:

 ``` shell
 > brew update
 > brew install ios-webkit-debug-proxy
 ```

More info on installing `ios-webkit-debug-proxy` can be found in [Appium docs][webkit_proxy].

If running on simulator, no need to launch it manually - Appium will do it automatically.

Command sample to run tests on the "iPhone 6" simulator with iOS 8.4:

``` shell
 > node cordova-medic/medic/medic.js appium --app test-app --platform ios --deviceName "iPhone 6" --platformVersion 8.4 --plugins "cordova-plugin-camera cordova-plugin-contacts"
```

When running on real iOS device, please make sure that it is located in the same network with the machine you're launching tests from and that the `UI Automation` option is enabled in `Settings -> Developer` menu.
Please note the `--device` argument which tells Appium that we want to run the tests on a real device. You also need to specify a device UDID here.

Command sample to run tests on the real iPad 2 with iOS 8.1:

``` shell
 > node cordova-medic/medic/medic.js appium --app test-app --platform ios --deviceName "iPad 2" --platformVersion 8.1 --plugins "cordova-plugin-camera cordova-plugin-contacts" --device --udid <device UDID>
```

[webkit_proxy]:    https://github.com/appium/appium/blob/master/docs/en/advanced-concepts/ios-webkit-debug-proxy.md
[brew]:            http://brew.sh/
[plugin_camera]:   https://github.com/apache/cordova-plugin-camera
[plugin_contacts]: https://github.com/apache/cordova-plugin-contacts
[appium_reqs]:     http://appium.io/getting-started.html#requirements
