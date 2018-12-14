---
layout: post
title: "require-suffix - Testing Without Custom Loaders"
date: 2018-12-14 12:00:00 -0800
cover: /assets/images/require-suffix/cover.jpg
excerpt: require-suffix is an opensource package to shim Node.js's require to optionally load different files based on platform and file extensions. It ships with custom presets for handling ios, android, and native files targeting react-native.
options:
  - full-bleed-cover
authors:
  - name: Michael Luther
    url: https://github.com/msluther
    photo: https://avatars.githubusercontent.com/msluther
---

As a JavaScript developer, I frequently find myself working with various frameworks that rely on bundlers or file-loaders which use custom file extensions to provide signals when they should be used. These frameworks typically do this to allow you to only ship code that will be consumed by a specific platform. The most common case of this for me is when I'm using [`react-native`]. `react-native` allows you to name your files using [platform-specific extensions] of the form `my-component.ios.js`, `my-component.android.js`, etc. Those file names are a signal to the script bundler to only include the appropriate files when building for iOS or Android. It also allows consumers of this code to be platform agnostic and simple require the component without the platform extension (e.g. `my-component`).

Here's a sample `react-native` component that takes `my-component` and wraps it in a ScrollView:
```js
import React from 'react';
import { ScrollView } from 'react-native';
// The following import might consume any of these files:
//   my-component.ios.js, my-component.android.js, my-component.native.js, or my-component.js
import MyComponent from './my-component';

export default function ScrollingComponent(props) {

  // ...Other logic for this component...

  return (<ScrollView><MyComponent /></ScrollView>);
}
```

> Note: Similar build systems may exist in other frameworks, I'm using `react-native` here to illustrate the point. This system could very well be used to say include `*.server.js` vs `*.client.js` files as a signal to include the right file for a Node environment vs a Browser environment, or any myriad of other possibilities.

Unfortunately tests are frequently not run in exactly the same environment as the target system. In most cases, this means that you're running your tests on [Node.js] without specialized framework bundlers rather than in the real target environment. So if I wanted to test my `ScrollingComponent` above, which file should Node.js be using for `MyComponent`? iOS? Android? A mock? In some cases, using a mock might be the right thing. If `my-component` is really just a wrapper around a bunch of platform calls, that's probably the right choice. However, often that's not the case and you just have some minor rendering differences between components. In those cases, it would be nice to be able to test the interaction between the consuming code (`ScrollingComponent`) and consumed code (`my-component`). Normally I would have to do this with something like Jest mocks or proxyquire to get it to load the right code. And if I want to test all the permutations, that's a lot of extra infrastructure to setup.

### A new challenger appears...
That was the motivation that led to [`require-suffix`]. I wanted a simple API that would allow me to always test against the right platforms.

```js
require('require-suffix/ios');
```

That's it. That's the API. All I need to do is put that in my test setup and then all the imports/requires from my test code will use same semantics as the `react-native` bundler. No extra setup needed.

And if I'm using a test framework like [`mocha`] I can easily setup my npm test scripts like this:

```json
{
  "scripts": {
    "test:all": "npm run test:android && npm run test:ios",
    "test:android": "mocha --require require-suffix/android ./test/*.test.js",
    "test:ios": "mocha --require require-suffix/ios ./test/*.test.js"
  }
}
```

Then running this command in my shell will run through all my tests, verifying that everything works with both ios and android builds.

```sh
npm run test:all
```

### Targets

`require-suffix` was built with the `react-native` bundler in mind. As such it ships with a bunch of preset configurations that target those environments:

```js
require('require-suffix/native'); // just *.native.js files
require('require-suffix/ios'); // *.ios.js or *.native.js files
require('require-suffix/android'); // *.android.js or *.native.js files
require('require-suffix/win'); // *.win.js or *.native.js files
```

However, it isn't limited to `react-native`. It is extensible and you can define your own configurations easily.

Using my example above where I wanted to allow `*.server.js` and `*.client.js` files, we would want to test both the server and client variants. To do that, you would just need to include one of the following in your test setup infrastructure:

```js
// Prefer *.server.js files
require('require-suffix/shim')('server');
```

or

```js
// Prefer *.client.js files
require('require-suffix/shim')('client');
```

### How does it work?

[`require-suffix`] is basically a thin shim that [monkey-patches] its way into require. It intercepts the require calls and tries all combinations that it's been configured with (e.g. `*.ios.js`, `*/index.ios.js`, `*.js`, etc.) catching all the `MODULE_NOT_FOUND` exceptions until it finds a combination that works or it runs out of combinations.

### Caveats

#### Can I use it in production?

Please don't. I mean... there's nothing stopping you. It's intended to be used just for testing purposes where you don't have a full framework or build environment in place. It's a thin shim on top of require and wasn't built for performance. It currently relies on a lot of exception handling in JavaScript and doesn't do any caching. So it's likely to destroy your performance. If you find yourself wanting it in production code, contributions are always welcome and we can work together to find a way to suit your needs.

#### Do I still need to test other ways?

`require-suffix` is a hack. It's not a replacement for a real environment, just a way to simulate something more complicated. You should not use it to replace 100% of your tests. You should absolutely test in a real environment. It's most useful in unit tests or light testing of integration between a few components. But, nothing should replace testing of your full system in as close to a production environment as possible.

### Conclusion

Hopefully, you find this project as useful as I have. You can read more and get started using it over on [Github][`require-suffix`].


([Doors image source](https://pixabay.com/en/doors-choices-choose-open-decision-1587329/), CC0 license)

[`require-suffix`]: https://github.com/godaddy/require-suffix
[Node.js]: https://nodejs.org
[`react-native`]: https://facebook.github.io/react-native/
[platform-specific extensions]: https://facebook.github.io/react-native/docs/platform-specific-code#platform-specific-extensions
[`mocha`]: https://mochajs.org/
[monkey-patches]: https://en.wikipedia.org/wiki/Monkey_patch