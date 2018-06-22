---
layout: post
title: "Announcing winston@3.0.0!"
date: 2018-06-12 05:53:01 -0800
cover: /assets/images/typeset-cover.jpg
excerpt: After several years the winston team is happy to announce the latest version – 3.0.0! Learn more about the latest version of the most popular logging library for Node.js along with what Node.js LTS means to maintainers of popular npm packages.
authors:
  - name: Charlie Robbins
    url: https://www.github.com/indexzero
    photo: https://avatars2.githubusercontent.com/u/4624?s=400&v=4
---

`winston` is the most popular logging solution for Node.js. In fact, when
measured in public `npm` downloads `winston` is so popular that it has [more
usage] than **the top four comparable logging solutions combined.** For nearly
the last three years the `winston` project has undergone a complete rewrite
for a few reasons:

- Replace the `winston` internals with Node.js `objectMode` streams.
- Empower users to format their logs without changes to `winston` itself.
- Modularize `winston` into several smaller packages: [`winston-transport`](https://github.com/winstonjs/winston-transport),
  [`logform`](https://github.com/winstonjs/logform), and [`triple-beam`](https://github.com/winstonjs/triple-beam).
- Modernize and performance optimize a now seven year old codebase to ES6
  (which it turns out was necessary to meet the API goals).

Why don't you take it for a spin?

```sh
npm i winston@3

# or if `yarn` is more your fancy
yarn add winston@3
```

## `winston@3` API

If you're familiar with `winston` the default `v3` API will look pretty familiar to you:

``` js
const { transports, format, createLogger } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.colorize(),
    format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
  ),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

logger.info('Hello again distributed logs');
```

And that's because the core logging semantics are the same. There are however,
a few key differences:

1. **`createLogger` instead of `new Logger`** this change allowed for a major
   performance increase due to how prototype functions are optimized.
2. **All log formatting is now handled by formats** this overhaul to the API
   will streamline `winston` core itself and allow for userland (i.e.
   user-defined formats to be shared just like userland transports are
   already. We'll discuss formats in-depth below.
3. **`Logger` and `Transport`** instances are now Node.js `objectMode`
   streams.
4. **Logging methods no longer accept a callback** use the core Node.js
   streams `finish` event instead to know when all logs have been written
   and the process is safe to exit.

> There is an extensive [upgrade guide] on how to migrate to `winston@3`.
> Particular care was taken to ensure backwards compatibility with existing
> transports. There are also a long list of full featured [examples].

## Backwards compatibility for ecosystem Transports

You shouldn't be worried about your favorite Transport not working with
`winston@3` – _the `winston-transport` API was designed with this in mind._
Any `winston@2` transport should get seamlessly wrapped with a compatibility
stream that will tell you to politely nudge the author:

```
SomeTransport is a legacy winston transport. Consider upgrading:
- Upgrade docs: https://github.com/winstonjs/winston/blob/master/UPGRADE-3.0.md
```

Are you a transport author? We'd love your input! There's [a great discussion]
going on about how to seamlessly support both `winston@2` and `winston@3` with
low maintenance overhead.

## Formats. Why? What? How?

> "~Life~ Open Source is a series of natural and spontaneous changes."

To understand why formats were the right decision for `winston@3` we must look
backwards. The essence of the `winston@2.x` API is summed up by `common.log`
which will forever exist in [winston-compat] as a compatibility layer for
transport authors. It began innocent enough – a shared utility function that
accepts `options` and returns a formatted `string` representing the log
message.

Then came a series of natural and spontaneous changes over the course of many
years – and it grew. And grew. And grew. And created an unending list of
feature requests for log formatting (see [just a few]).

As this pattern became more evident so did [the cost]. This made the design
goals clear for formats:

1. **Enable userland log formatting:** most importantly _without_ any changes
   needed to `winston` itself.
2. **Strive to make users "pay" only for formatting features that they use:**
   ensure that the performance impact of log formatting features is _opt-in_.
   In other words if you don't use a feature you won't pay any cost for it's
   implementation.

This focus on log formatting features is not by accident. What `winston` has
shown is that reading logs is an immensely personal experience. By putting the
formatting features in userland we support that demand with less burden.

What is a format? Let's start with an example that adds a timestamp, colorizes
the level and message, aligns message content with `\t` and prints using the
template `[timestamp] [level]: [message]`.

``` js
const { format } = require('winston');

const customFormat = format.combine(
  format.timestamp(),              // Adds info.timestamp
  format.colorize({ all: true }),  // Colorizes { level, message } on the info
  format.align(),                  // Prepends message with `\t`
  format.printf(info => `[${info.timestamp}] ${info.level}: ${info.message}`)
);
```

Each one of these `format` methods resemble a Node.js `TransformStream` but are
specifically designed to be synchronous since they do not have to handle
backpressure (i.e. a fast reader and a slow writer – such as reading from file
and writing to an HTTPS socket).

There is too much to go into about Formats in a single blog post, but there's
a lot more in the [Format documentation] and in [logform] where they are
implemented.

## Node.js LTS, ES6 Symbols, & maintaining your `npm` packages – oh my!

The key to the `winston@3` API is [ES6 Symbols] – the API itself would have not
been possible without them. Why? The property value for the `LEVEL` symbol is a
copy of the original `level` value that should be considered **immutable** to
formats.

Without an ES6 Symbol we'd still have the same need to accomplish API goals.
That means instead of `[LEVEL]` in this example `info` object:

```
{ [LEVEL]: 'info', level: 'info', message: 'Look at my logs, my logs are amazing.' }
```

we would have to pick a plain property name, say `_level`:

```
{ _level: 'info', level: 'info', message: 'Look at my logs, my logs are amazing.' }
```

You might think that a `_level` property vs. a `LEVEL` symbol are more or less
the same. They are except for one important difference: **Symbols are excluded
from `JSON` by definition.** This is critical because so many log files are
serialized to JSON and including these internal properties would be
unacceptable.

This seemingly small nuance of the API turned out to be critically important to
the `winston@3` release timeline. To understand why one must understand what
Node.js LTS is and what it can mean to authors of popular `npm` packages such
as `winston`.

Since Node.js began the LTS program it's been the goal of `winston` to _support
all LTS releases of Node (including maintenance LTS)._ Why support such old LTS
releases of Node.js? The underlying motivation is to make `winston` as reliable
for large teams & enterprises as Node.js itself.

This LTS goal is a core reason why this release took three years to ship.
Let's look at a recent release chart for Node.js LTS:

![](/assets/images/nodejs-lts-releases.png)

As you can see `node@4` entered "end of life" in April 2018. Until then it was
in the active support matrix for `winston` releases. Since ES6 features
(including Symbols) were only available in `node@6` this meant that even if API
development and re-write progress was ahead of schedule _(it wasn't)_ that
version wouldn't be able to use it.

Why not polyfill the ES6 Symbol API? That's definitely a possibility to
consider, but given the size and scope of the rewrite itself it didn't seem
necessary to rush ourselves. Having seen how delicate these API decisions can
impact such a large ecosystem of packages (almost [1000 results on npm]).

## Want to get involved?

Looking to get involved in an actively maintained open source project? Then
look no further - we'd love to have you join us on `winston`!

- Learn more [about contributing].
- Checkout [the Roadmap] (spoiler alert: first-class browser support,
  performance analysis using `0x` and even more test coverage).
- Find [your first issue].
- Help us [triage old issues] and close duplicates.

You can find us [on Gitter in `winston`](https://gitter.im/winstonjs/winston).
And with that – happy logging!

> The author would like to extend a very special thanks to all of the
> contributors for the `winston@3` release. In particular: [David Hyde],
> [Chris Alderson], and [Jarrett Cruger].

[more usage]: http://www.npmtrends.com/winston-vs-pino-vs-bunyan-vs-bole-vs-log4js
[upgrade guide]: https://github.com/winstonjs/winston/blob/master/UPGRADE-3.0.md#readme
[examples]: https://github.com/winstonjs/winston/tree/master/examples

[just a few]: https://github.com/winstonjs/winston/issues?q=is%3Aissue+label%3A%22use+a+custom+format%22+is%3Aclosed
[the cost]: https://www.youtube.com/watch?v=Dnx2SPdcDSU
[winston-compat]: https://github.com/winstonjs/winston-compat/blob/master/index.js#L67-L229
[logform]: https://github.com/winstonjs/logform#logform
[Format documentation]: https://github.com/winstonjs/winston#formats

[ES6 Symbols]: http://exploringjs.com/es6/ch_symbols.html#sec_overview-symbols
[1000 results on npm]: https://www.npmjs.com/search?q=winston

[a great discussion]: https://github.com/winstonjs/winston/issues/1331
[about contributing]: https://github.com/winstonjs/winston/blob/master/CONTRIBUTING.md#contributing
[the Roadmap]: https://github.com/winstonjs/winston/blob/master/CONTRIBUTING.md#roadmap
[your first issue]: https://github.com/winstonjs/winston/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22
[triage old issues]: https://github.com/winstonjs/winston/issues?page=6&q=is%3Aopen+is%3Aissue&utf8=%E2%9C%93

[David Hyde]: https://github.com/dabh
[Chris Alderson]: https://github.com/chrisalderson
[Jarrett Cruger]: https://github.com/jcrugzz

