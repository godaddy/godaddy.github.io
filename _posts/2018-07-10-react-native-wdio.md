---
layout: post
title: "React Native Application UI testing using WebDriverIO and Appium"
date: 2018-07-09 12:00:00 -0800
cover: /assets/images/react-native-wdio/cover-wdio.png
excerpt: We recently adopted WebDriverIO based UI testing for our React Native application. Benefits of using WebDriverIO include allowing us to write UI tests just as we wrote tests for the web. WebDriverIO configuration allows us to plugin Sauce Labs Emulators or Real Devices for cloud-based testing.
authors:
  - name: Raja Panidepu
    url: https://www.linkedin.com/in/rpanidepu/
    photo: /assets/images/rpanidepu.png
  - name: Chad Neff
    url: https://github.com/ineffably
    photo: https://avatars0.githubusercontent.com/u/1356998?s=150&v=4
---

## Motivation:

We want to automate the validation of our user experiences in order to consistently maintain a high level of quality.

The Mobile App team I work on utilizes native code for parts of our application, yet, most of the user interfaces are written using React Native and JavaScript. Given that most of the UI is written in JavaScript, we wanted to use a similar tech stack for the automation and validation of our user experiences (also known as functional tests) on Android and iOS platforms.

Although, testing frameworks like Espresso, Robotium, XCTest are currently in use by other teams at Godaddy, we needed the ability to write cross-platform UI tests for mobile platforms in Javascript and these frameworks don't support our needs there.

We looked into Selenium-based [Appium](https://appium.io/), as that is the most popular test automation framework for both native and hybrid mobile applications which supports writing tests in JavaScript. Appium documentation suggests [WD](https://github.com/admc/wd) (a node.js client for Webdriver/Selenium) as the official Appium client for JavaScript. We found a few shortcomings with the WD library, such as: the async nature of the framework made tests complicated and full JSONWire protocol is [not supported](https://github.com/admc/wd#working-with-mobile-device-emulator), which is necessary for running test commands on native.

Another option we came across was [WebDriverIO](http://webdriver.io), a Node.js implementation of the WebDriver Protocol, which has full JSONWire protocol commands implemented and also supports special bindings for Appium. The advantage of WebDriverIO is that you don’t need to care about how to handle a Promise to avoid race conditions and it takes away all the cumbersome setup work and manages the Selenium session for you, which is awesome.

This gives us the possibility to write clean code without the need to resolve Promises which alleviates the overhead of needlessly accommodating tests running asynchronously which has been a common source of mistakes. WebDriverIO also helps us write clean UI tests using [PageObjects](http://webdriver.io/guide/testrunner/pageobjects.html) design pattern.

In order to help make this process easier for you to implement WebDriverIO for mobile functional tests, let's explore how we accomplished the following:

1. [Write UI tests running locally using WebDriverIO and emulators](#write-ui-tests-running-locally-using-webdriverio-and-emulators)
2. [Running tests on emulators using a cloud-based service: Sauce Labs](#running-tests-on-emulators-using-a-cloud-based-service-sauce-labs)
3. [Running tests on real devices using a cloud-based service](#running-tests-on-real-devices-using-a-cloud-based-service)
4. [Making test results consistent and predictable](#making-test-results-consistent-and-predictable)

## Write UI tests running locally using WebDriverIO and emulators

In your React Native project's directory, install WebDriverIO and create a basic WebDriverIO config.

```console
npm install webdriverio -g
wdio config
```

![Screenshot showing wdio config](/assets/images/react-native-wdio/wdio-config.png)

Follow the prompts to create a base WebDriverIO configuration as shown in the above picture.

For now, set the base URL to the default value: http://localhost; we will remove it in the later steps. Once done, let WebDriverIO install all the needed packages.

When finished, the generated WebDriverIO config can be found in the `wdio.conf` file at the root of the project; here is an example of what it should contain:

```js
exports.config = {
  specs: [
    './test/specs/**/ *.js'
  ],
  exclude: [],
  maxInstances: 10,
  capabilities: [{
    maxInstances: 5,
    browserName: 'firefox'
  }],
  sync: true,
  logLevel: 'verbose',
  coloredLogs: true,
  deprecationWarnings: true,
  bail: 0,
  screenshotPath: './errorShots/',
  baseUrl: 'http://localhost',
  waitforTimeout: 10000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,
  framework: 'jasmine',
  jasmineNodeOpts: {
    defaultTimeoutInterval: 10000,
    expectationResultHandler: function (passed, assertion) {
    }
  }
};
```

`wdio config` configures Jasmine as the default test runner, but, you can change it by following the documentation at [WebDriverIO - Test Runner Frameworks](http://webdriver.io/guide/testrunner/frameworks.html). The initial configuration doesn’t have what we need to start running mobile UI tests yet, so, let’s start tweaking it.

WebDriverIO supports multiple services of which Appium is a test automation framework used with mobile applications. [WebDriverIO's Appium service](http://webdriver.io/guide/services/appium.html) lets you automatically run an Appium server in the background, which passes on the UI test commands to the mobile emulator.

Now that we have a WebDriverIO configuration, let's set it up to work with Appium.

**Step 1:** Install Appium and wdio-appium-service:

```console
npm install appium --save-dev
npm install wdio-appium-service --save-dev
```

**Step 2:** Provide capabilities based on the platform you would like to run tests on. Capabilities tell an Appium service what environment and/or devices to run the tests in. Documents here provide insight into capabilities that are supported by Appium: <https://appium.io/docs/en/writing-running-appium/caps/>

For example, you need to make the following changes to `wdio.conf` to configure WebDriverIO to use Appium and run tests on Android Emulator:

```diff
exports.config = {
  specs: [
    './test/specs/**/*.js'
  ],
  exclude: [],
  maxInstances: 10,
+ services: ['appium'],
+ port: 4723,
- capabilities: [{
-    maxInstances: 5,
-    browserName: 'firefox'
-  }],
+ capabilities: [{
+   maxInstances: 1,
+   browserName: '',
+   appiumVersion: '1.7.2',
+   platformName: 'Android',
+   platformVersion: '8.0',
+   deviceName: 'Android GoogleAPI Emulator',
+   app: '<path to .apk file>'
+ }],
  sync: true,
  logLevel: 'verbose',
  coloredLogs: true,
  deprecationWarnings: true,
  bail: 0,
  screenshotPath: './errorShots/',
- baseUrl: 'http://localhost',
  waitforTimeout: 10000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,
  framework: 'jasmine',
  jasmineNodeOpts: {
    defaultTimeoutInterval: 10000,
    expectationResultHandler: function (passed, assertion) {
    }
  }
};
```

> Note: If you are targeting iOS Device for running UI test, you would need a Mac machine with Xcode and command line tools installed. We automate the target devices my manipulating capabilities.

In the above config, we added `appium` to the services list and updated the port to point to the Appium default port. Notice that we removed the `baseUrl` field as we don't need it.

Capabilities have an `app` field value which should be set to the path of the `.apk` for Android or the `.app` for iOS application. The usual location for this file is `<PROJECT_ROOT>/android/app/build/outputs/apk/<FILE_NAME.apk>` for the `.apk` or `<PROJECT_ROOT>/ios/build/Build/Products/Debug-iphonesimulator/<FILE_NAME.app>` for the `.app` file.

We should also set `maxInstances` to 1 to avoid running multiple tests in parallel. This can alleviate the possibility of running out of memory.

**Step 3:** Add a simple WebDriverIO UI test to run.

```js
// ./test/native/specs/simple-test.js
describe('My Simple test', () => {
  it('super test', () => {
    // For demo purpose
    browser.pause(2000);
    console.log('Hey, I ran!');
  });
});
```

Above is a dummy test block that installs and runs the app and then initiates the test and closes the application.

**Run the test:**
For iOS and Android, make sure you have the required Xcode or Android Studio build tools set up to run React Native application. For Android use [AVD Manager](https://developer.android.com/studio/run/managing-avds) to start the emulator before running the tests.

Run the UI test:

```console
wdio wdio.conf.js
```

![Screenshot showing wdio output](/assets/images/react-native-wdio/wdio-output.png)

Now, you have a WebdriverIO UI test running against the local emulator. You are now set to explore [WebDriverIO Mobile API](http://webdriver.io/api.html) to continue writing more complete UI tests.

## Running tests on emulators using a cloud-based service: Sauce Labs

WebDriverIO officially supports some of the popular cloud services like Sauce Labs and BrowserStack by providing a service plugin. Here at GoDaddy, we use [Sauce Labs](https://saucelabs.com/) for performing mobile UI testing on emulators and real devices. If you don't have a Sauce Labs account you can start a free trial here: [Sauce Labs: Sign Up for a Free Trial](https://signup.saucelabs.com/signup/trial?utm_campaign=free+trial&utm_medium=blog&utm_source=godaddy&campid=7011M000001ELsB)

Let's configure our current WebDriverIO test to run using the Sauce Labs emulators.

**Step 1:** Install [WDIO Sauce Service](http://webdriver.io/guide/services/sauce.html)

```console
npm install wdio-sauce-service --save-dev
```

**Step 2:** Update the wdio.conf file.

```diff
- services: ['appium'],
+ services: ['sauce'],
+ host: 'ondemand.saucelabs.com',
- port: 4723,
+ port: 80,
+ user: SAUCE_USERNAME,
+ key: SAUCE_ACCESS_KEY
```

Use [Platform configurator by Sauce Labs](https://wiki.saucelabs.com/display/DOCS/Platform+Configurator) to update your capabilities if needed.

**Step 3:** Upload your `.app` or `.apk` file to SauceStorage or any other accessible endpoint and then update your app path in capabilities to point to the remote storage location (as seen below). You can follow the documentation here; [Uploading Mobile Applications to Sauce Storage for Testing](https://wiki.saucelabs.com/display/DOCS/Uploading+Mobile+Applications+to+Sauce+Storage+for+Testing) for more information around uploading your app to Sauce Labs.

```diff
- app: <app path>
+ app: <sauce-storage:myapp.zip or app link>
```

**Run the test:**
Let's run the test using Sauce Labs with the updated configuration.

```console
wdio wdio.conf.js
```

Check the [Sauce Labs Dashboard](https://saucelabs.com/beta/dashboard/tests) to make sure the test ran successfully. The WebDriverIO Sauce service automatically sets test labels and results. Now that you have run your test on cloud-based emulators, this opens up the ability to scale out the automation of your functional tests. Sometimes, an emulator doesn't quite meet all the requirements necessary to ensure confidence in app quality due to lack of real sensors, older devices, and other aspects like memory and CPU of a real device.

## Running tests on real devices using a cloud-based service

Sauce Labs also provides a real device testing solution through the TestObject platform. With some minor changes to the above `wdio.conf`, we can run UI tests on real devices.

First, create a project in the [TestObject dashboard](https://app.testobject.com/) and upload your `.ipa` or `.apk` file.

There is no official WebDriverIO TestObject service and at the time of writing this blog, Sauce Labs and TestObject do not share the same API calls.

**Update `wdio.conf` file:**

```diff
- services: ['sauce'],
+ protocol: 'https',
+ host: 'us1.appium.testobject.com',
- port: '80',
+ port: '443',
+ path: '/api/appium/wd/hub',
capabilities: {
  ...
-  app: 'sauce-storage:myapp.zip'
+  testobject_api_key: <TESTOBJECT_ACCESS_KEY>,
+  testobject_app_id: <APP_ID>,
}
```

Refer to [Appium Capabilities for Real Device Testing](https://wiki.saucelabs.com/display/DOCS/Appium+Capabilities+for+Real+Device+Testing) to update your capabilities if needed.

**Run the test:**
Let's run the test with the updated configuration.

```console
wdio wdio.conf
```

Check the [TestObject Dashboard](https://app.testobject.com/) to make sure the test has run. WebDriverIO does not update test labels or results in TestObject Dashboard. TestObject does not aggregate the test results when running through WebDriverIO. Therefore, write some extra code to keep test results in sync. Here are some references that can help with that: <https://github.com/pizzasaurusrex/TestObject> or <https://gist.github.com/rajapanidepu/0e8c0f89671a8a563a7463f8c1ff0413>

## Making test results consistent and predictable

These functional tests are automated and work across multiple service and framework layers. These services and frameworks are not synchronous and not consistently responsive; therefore, we have to accommodate intermittent failures.

When we started to write the UI tests and run them as part of CICD, we observed that the tests were failing for reasons which were not related to the test code itself. An example of this was a test would pass in the first run, yet, we would see same test failing randomly in subsequent runs with no changes made to the test code.

There are various timeouts configurations in play here at each level of tech stack: WebDriverIO, Mocha/Jasmine, Appium, and Sauce Labs/TestObject.

**WebDriverIO timeouts:**

- `connectionRetryTimeout`: Http request timeouts while trying to connect to Appium server.
- `waitforTimeout`: Timeout for all `waitFor` commands in the tests.

**TestFramework timeout:**
A test is declared as a failure if it isn't completed within a certain time. Test frameworks and their respective timeout options are listed below.

```js
// Mocha
mochaOpts: {
  timeout
}

// Jasmine
jasmineNodeOpts: {
  defaultTimeoutInterval
}

// Cucumber
cucumberOpts: {
  timeout
}
```

**Appium timeouts:**
The following timeouts deal with how long Appium should wait for Android Virtual Device (AVD) emulator or iOS simulator to be ready and for the app to be installed.

- `appWaitDuration`
- `deviceReadyTimeout`
- `androidDeviceReadyTimeout` (Android only)
- `androidInstallTimeout` (Android only)
- `avdLaunchTimeout` (Android only)
- `avdReadyTimeout` (Android only)
- `launchTimeout` (iOS only)

- `newCommandTimeout` - This limits how long (in seconds) Appium will wait for a new command from the client before assuming the client quit.

**Sauce Labs/TestObject timeouts:**

- `commandTimeout`: Similar to Appium's newCommandTimeout, but for Sauce Labs. How long Selenium can take to run a command.
- `idleTimeout`: Limits how long a browser can wait for a test to send a new command.
- `maxDuration`: A limit for the total time taken to run a test.

 In our case, simple WebDriverIO tests kept failing intermittently until we understood the timeouts and tweaked them. For example, we faced an issue where iOS tests running on Sauce Labs were taking a long time to allocate a simulator and install the application. Resulting in test failures with an error message: `Your test errored. Session did not start. User might have disconnected`. Bumping the default values of `idleTimeout` and `launchTimeout` from 90 seconds to 180 seconds fixed the issue. Your mileage may vary on the timeout values, but, we suggest experimenting with them to find the right values for your case if the defaults aren't consistently working for you.

 Occasionally, we did face few intermittent UI test failures due to the app being unresponsive after installation or network latency. We addressed this issue by adding retry logic on top of the WebDriverIO command to re-run the failed test suites. The retry mechanism we wrote involved aggregating failed tests and re-running them using a [custom reporter](http://webdriver.io/v3.4/guide/testrunner/customreporter.html). We observed that 95% of the time these failed tests pass on the second run increasing our overall success rate.

## Conclusion

I hope the above discussion helps you set up some infrastructure for running WebDriverIO UI tests locally and remotely for emulators and real devices. We are continuing to write UI tests using WebDriverIO + Appium for native features which turned out to be quite effective for development teams while working with both web and native platforms.

GoDaddy is looking for full-stack engineers to join our mobile team. The team is building our next generation experiences for our small business customers to help them start, grow, and run their venture. If you have the passion, enthusiasm, and ability to create compelling interactions for customers on their way to making their small businesses great, we would like to talk to you! Apply here: <https://careers.godaddy.com/>.

## References

- [WebDriverIO API](http://webdriver.io/api.html)
- [Appium Capabilities](https://appium.io/docs/en/writing-running-appium/caps/)
- [TestObject API wrapper](https://github.com/pizzasaurusrex/TestObject)

Note: cover photo courtesy of <http://webdriver.io/>
