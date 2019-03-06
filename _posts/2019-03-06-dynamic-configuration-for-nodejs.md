---
layout: post
title: "Dynamic Configuration for Node.js Applications"
date: 2019-03-06 12:00:00 -0700
cover: /assets/images/headers/flipr.jpg
excerpt: Dynamic configuration is a powerful tool for software applications. Use it to solve problems like authorization, feature flags, and A/B tests, in addition to normal application configuration. See how GoDaddy uses a library called flipr to achieve this for some of its Node.js applications.
options:
  - full-bleed-cover
authors:
  - name: Grant Shively
    url: https://github.com/gshively11
    photo: https://avatars.githubusercontent.com/gshively11
---

Software systems that use dynamic configuration have the ability to change their configuration at runtime. The benefits of this pattern are vast and not altogether obvious. At GoDaddy, we use dynamic configuration in many of our Node.js applications to implement authorization, feature flags, and A/B tests, in addition to normal application configuration. Read on to learn more about dynamic configuration, its many benefits, and how we've implemented it at GoDaddy using an in-house open source library called [flipr](https://github.com/godaddy/node-flipr).

### Different Flavors of Dynamic Configuration

Runtime configuration changes fall into two categories.

* Application reads and uses new configuration data from an outside source
* A catalyst changes the application's existing configuration

When the term dynamic configuration is thrown around it is often in reference to the first category. Reading configuration changes in real-time from an outside source is a useful behavior in software systems, especially in today's distributed architectures. To achieve the true power of dynamic configuration, you must embrace the second category as well, which assumes that configuration data contains multiple values for a single data point. At runtime, the application calculates a single value from the multiple values, usually based on some outside entity that interacts with the system. A software system that handles both categories using dynamic configuration can achieve:

* Complex authorization rules
* Safe, incremental releases using feature flags
* A/B tests
* Service discovery
* Dynamic routing
* Custom user experiences

And this is far from an exhaustive list. All of these software features boil down to configuration data that changes in response to some catalyst. Consider these three catalysts:

* **Engineers:** An engineer modifies configuration in a data store and pushes the change to connected systems.
* **Environment:** An application's runtime environment changes, resulting in a configuration change.
* **End User**: The end user makes a request to an application and the configuration changes based on the end user's characteristics.

Now let's re-phrase the behaviors mentioned in the previous section to show how dynamic configuration can solve them:

* **Authorization:** Authorization logic uses configuration data that changes based on end user characteristics
* **Feature flags:** Features wrapped in logic uses configuration data that changes based on end user characteristics or engineers pushing updates
* **A/B tests:** Features and metrics wrapped in logic uses configuration data that changes based on end user characteristics
* **Service discovery:** Service endpoints are read from configuration data that changes based on engineers pushing updates or changes in the environment
* **Dynamic routing:** A reverse proxy uses configuration data that changes based on engineers pushing updates or changes in the environment
* **Custom user experiences:** Different user experiences wrapped in logic use configuration data that changes based on end user characteristics

Dynamic configuration provides a solid foundation for all of these features. Next we'll introduce [flipr](https://github.com/godaddy/node-flipr) and provide examples of how GoDaddy uses it to solve various problems.

### Dynamic Configuration with Flipr

[Flipr](https://github.com/godaddy/node-flipr) is a Node.js library for both static and dynamic configuration. It was created back in 2015 when we needed a way to create granular feature flags for one of our applications. At the time there weren't any existing modules that met our requirements, so we opted to write our own. It's been used in production since its release and has recently received an ES6 rewrite along with some new features.

Flipr reads configuration data from a source and then exposes that data via a simple interface. Applications retrieve configuration individually by key or all at once. Applications can also define rules and pass input to flipr that make the configuration dynamic.

Let's start out with a simple static configuration to show off flipr's components. We'll use [flipr-yaml](https://github.com/godaddy/node-flipr-yaml) as the source, which reads configuration from yaml files that exist alongside application code and provides it to flipr.

```yaml
---
# Exists as a file at ./config.yaml
# "description" is optional, but documenting your config is a good idea
# use "value" for static configuration

databaseServer:
  description: >
    This is the IP of the database server where the app stores its data.
  value: 127.0.0.1
```

```javascript
const Flipr = require('flipr');
const FliprYaml = require('flipr-yaml');

const source = new FliprYaml({
  filePath: './config.yaml'
});
const flipr = new Flipr({ source });

// Assume that we're inside an async function and thus can use await
console.log(await flipr.getValue("databaseServer"));
// 127.0.0.1
```

All this code does is define a simple yaml config file, setup flipr to read it, and retrieve the value of the databaseServer config item. An important takeaway from this example is that retrieving configuration from flipr is always an asynchronous action. Even if the source is able to retrieve configuration data synchronously, the interface remains asynchronous for the sake of compatibility.

Let's look at a simple dynamic example. Remember that we described two types of dynamic configuration: retrieving new configuration and changing existing configuration. We're going to focus on the latter for this example. Assume that we want to change the databaseServer our application uses depending on a user's ID.


```yaml
---
# use "values" for dynamic configuration

databaseServer:
  description: >
    These are the IPs of the database servers where the app stores its data.
  values:
    - userId: 123       # this is a rule property
      value: 10.0.0.1
    - value: 127.0.0.1  # no rule property, this is the default value
```

```javascript
const Flipr = require('flipr');
const FliprYaml = require('flipr-yaml');

const rules = [
  {
    type: 'equal',      // rule type, determines how rule compares input to rule property.
    input: 'id',        // the object-path of the input to evaluate, i.e. input.id (supports nesting)
    property: 'userId', // the name of the rule property in the config
  }
];
const source = new FliprYaml({
  filePath: './config.yaml'
});
const flipr = new Flipr({ source });

const userA = {
  id: 123,
};
const userB = {
  id: 456,
};

console.log(await flipr.getValue("databaseServer", userA));
// 10.0.0.1
console.log(await flipr.getValue("databaseServer", userB));
// 127.0.0.1
```

This is a contrived example, but it's sufficient to show that flipr can return different config values by evaluating some input against a rule. The database server for userA is 10.0.0.1 because its `id` property equals the value defined in the config's `userId` rule property. Whereas userB is 127.0.0.1 because it doesn't match any of the `userId` values in the config and thus uses the default value.

### Using Flipr for Common Application Needs

Remember that applications can use dynamic configuration to implement many interesting behaviors. Let's see that in action with flipr. The following examples exclude some of the boilerplate code to keep things concise.

##### Authorization

Authorization is usually a simple boolean decision: does an identity have access to do something, yes or no? Flipr allows you to declaratively define authorization points in your config and use rules to make those decisions.

Assume that we have an application that allows users to post comments, but only allows moderators to delete comments. Moderators are users that have a userType of `2`.

```yaml
canDeleteComments
  values:
    - isModerator: true
      value: true
    - value: false
```

```javascript
const rules = [
  {
    type: 'equal',
    input: (user) => user.userType === 2,
    property: 'isModerator',
  }
];
// ...
if (await flipr.getValue('canDeleteComments', user)) {
  await deleteComment(commentId);
} else {
  throw new Error('You are not authorized to delete comments.');
}
```

Alternatively, you could also implement the equal rule like this.

```yaml
canDeleteComments
  values:
    - userType: 2
      value: true
    - value: false
```

```javascript
const rules = [
  {
    type: 'equal',
    input: 'userType',
    property: 'userType',
  }
];
```

Rules and inputs are very flexible, it's up to you to determine how best to define them. Just remember, as a rule of thumb, it's generally better to define each authorization point in your configuration than to create a configuration item such as "isAdmin" and use that to make authorization decisions in your code.

##### Feature Flags

Feature flags are really just authorization decisions with a fancy name. Their purpose is to enable or disable features in your application. Using flipr, your feature flags can respond differently depending on the current user context. This is handy for rolling out features incrementally to a small set of users before opening the gates to everyone. You can also disable features entirely in certain environments, e.g. disable features in production until they're finished so that code can continually be to pushed to master without impacting users.

```yaml
someNewFeature
  values:
    - locations:
      - AZ
      - CA
      value: true
    - value: false
```

```javascript
const rules = [
  {
    type: 'list',
    input: 'location',
    property: 'locations',
  }
];
// ...
if (await flipr.getValue('someNewFeature', user)) {
  loadSomeNewFeature();
}
// ...
```

Here we've enabled some new feature for users in Arizona and California and disabled it for everyone else.

##### A/B Tests

At the risk of sounding like a broken record, A/B tests are really just feature flags with a fancy name. Their purpose is to enable different behaviors for different groups of users, record metrics based on how those users respond, and then compare the results. Flipr isn't a complete A/B test tool by any means, but you can get pretty far with just a little extra code.

```yaml
purchasePathTest
  values:
    - testGroup: a
      value: one-click
    - testGroup: b
      value: new-checkout
```

```javascript
const rules = [
  {
    type: 'equal',
    // idToPercent creates a hash of the user id and the test id, then converts that to a percentage
    input: (user) => idToPercent(user.id, 'purchasePathTest') <= 0.5 ? 'a' : 'b',
    property: 'testGroup',
  },
];

// ...

// metric logs would contain the user context, which would contain the abTests
user.abTests.push(await flipr.getValue('purchasePathTest', user));

// ...

// display different UX based on test group
switch(await flipr.getValue('purchasePathTest', user)) {
  case 'one-click':
    return renderOneClickPurchasePath();
  case 'new-checkout':
    return renderNewCheckoutPath();
  default:
    return renderCheckoutPath();
}
// ...
```

##### Service Discovery

Most of the examples thus far have relied on existing configuration changing its values based on some catalyst. Service discovery relies more on receiving and using new configuration data. To achieve this, you must use a flipr source that can automatically receive updates from an external data store. At one point flipr had an [etcd](https://coreos.com/etcd/) source that implemented this behavior, but we no longer maintain it. You can check out the code [here](https://github.com/godaddy/node-flipr-etcd) for inspiration, there's not much to it (note: it's targeting flipr's v1 interface).

```javascript
const response = await fetch(await flipr.getValue('someServiceUrl'));
console.log(response.json());
```

When flipr receives new configuration, `someServiceUrl` changes, and the code above starts directing traffic to a new endpoint.

##### Other Uses

Dynamic configuration is a good choice for any application that would benefit from defining logical decisions external to itself. Whether that configuration should exist alongside your application code in separate files, or in some external data source depends on your use case. When looking for places to implement dynamic configuration, try asking yourself:

* Would I benefit from having this logic maintained and documented in a centralized location?
* Would I benefit from being able to change this logic without re-deploying my application?
* Would I benefit from being able to change this logic based on the current context or the runtime environment?

### Flipr Best Practices

Flipr's flexibility can act against you if used incorrectly. Here are some best practices we use at GoDaddy to keep our code and configuration maintainable.

* One instance of flipr per source per process. This takes full advantage of flipr's internal caching.
* Prefer configuration files to exist alongside application code and validate configuration in unit tests.
    * This depends a lot on your CICD pipeline and deployment strategy. If you are able to quickly build, test, and deploy your application, having the configuration files coupled to the application code gives you built in auditing, versioning, and easy rollback thanks to source control. However, if your CICD pipeline is slow, or you need config changes to immediately propagate to live applications, then you'll want your configuration data to exist in a source capable of live updates, e.g. [etcd](https://coreos.com/etcd/).
* Create separate configuration files by environment and purpose, e.g. dev/test/prod and feature flags/authorization/ab tests.
* Document your configuration. Flipr's schema is metadata friendly.
* Clean up stale configuration. This is especially important with feature flags, which tend to go stale quickly.
    * Tip: Use "sunset tests", which are unit tests that fail after a certain date if some targeted configuration still exists.

### Related Resources

* [Dynamic configuration at Twitter](https://blog.twitter.com/engineering/en_us/topics/infrastructure/2018/dynamic-configuration-at-twitter.html)
* [flipr](https://github.com/godaddy/node-flipr), [flipr-yaml](https://github.com/godaddy/node-flipr-yaml), [flipr-validation](https://github.com/godaddy/node-flipr-validation), [flipr-etcd](https://github.com/godaddy/node-flipr-etcd)
