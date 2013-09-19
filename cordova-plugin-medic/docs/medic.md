---
 license: Licensed to the Apache Software Foundation (ASF) under one
         or more contributor license agreements.  See the NOTICE file
         distributed with this work for additional information
         regarding copyright ownership.  The ASF licenses this file
         to you under the Apache License, Version 2.0 (the
         "License"); you may not use this file except in compliance
         with the License.  You may obtain a copy of the License at

           http://www.apache.org/licenses/LICENSE-2.0

         Unless required by applicable law or agreed to in writing,
         software distributed under the License is distributed on an
         "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
         KIND, either express or implied.  See the License for the
         specific language governing permissions and limitations
         under the License.
---

Medic
======

> The `medic` object provides support for continuous integration. It is not intended for use in applications.

Properties
----------

- device.name
- device.cordova
- device.platform
- device.uuid
- device.version
- device.model

Variable Scope
--------------

Since `device` is assigned to the `window` object, it is implicitly in the global scope.

    // These reference the same `device`
    var phoneName = window.device.name;
    var phoneName = device.name;

Permissions
-----------

### Android

#### app/res/xml/config.xml

    <plugin name="Medic" value="org.apache.cordova.Medic" />

#### app/AndroidManifest.xml

    <uses-permission android:name="android.permission.READ_PHONE_STATE" />

### iOS

    No permissions are required.


