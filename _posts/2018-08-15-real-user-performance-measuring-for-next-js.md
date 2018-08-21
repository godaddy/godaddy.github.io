---
layout: post
title: "Real User Performance Measuring for Next.js"
date: 2018-08-21 12:00:00 -0800
cover: /assets/images/headers/next-rum.jpg
excerpt: With the introduction of navigation timing in browsers it has become a lot easier to measure performance of your front-end application. With the introduction of the `next-rum` component you will be able to gather the same metrics for your Next.js based application as well.
options:
  - full-bleed-cover
authors:
  - name: Arnout Kazemier
    url: https://github.com/3rd-Eden
    photo: https://avatars2.githubusercontent.com/u/28071?s=460&v=4
---

At the end of April 2018, we decided to adopt the [Next.js framework][next] at
GoDaddy for the development of new Node.js based applications. Since then we've
been working hard on creating the tools, components, and integrations to make it
effortless for all GoDaddy Engineers to pick-up and build new GoDaddy branded
applications using this new toolkit.

Today we start contributing small bits of code back to the OpenSource / Next.js
community. We are proud to announce the release of [`next-rum`][rum], a
React/Next component that will allow you to measure the
[navigation-timing][timing] of your Next.js applications.

## Why do you need `next-rum` in your Application?

We all strive to create the best user experience for our customers, and
performance is an important aspect of that experience. With the introduction of
the [navigation timing][timing] API's in browsers, it has become a lot easier to
measure the performance of your front-end application. Unfortunately, this does
not work with Single Page Applications (SPA) as they will no longer create a
"normal" page lifecycle. Instead, they leverage AJAX to fetch content and
re-render the page on the client-side without an extra server roundtrip. This is
great from a performance point of view as your pages will load faster, but that
means that the performance of these pages can't be measured.

This is where `next-rum` comes into play, it hooks into the events that the
`next/router`/`next/link` and `next.emitter` expose to create navigation timing
information that follows the same [processing-model][model]. This output can
then be sent to any service of your liking.

## Integrating it in your application

Adding the `next-rum` component to your application is an easy and
straightforward process. It needs to be loaded on every page of your Next.js
application. This can be easily done with the creation of a `_app.js` component
in the Next.js `/pages` folder to ensure that it's loaded on every page that
Next.js renders.

```js
import App, { Container } from 'next/app';
import React from 'react';
import RUM from 'next-rum';

function navigated(path, data) {
  console.log('navigated to %s', path);
  console.log('timing data', data);

  //
  // Example implementation for Google Analytics, but you can use any
  // service you want to send data.
  //
  for (let metricName in data) {
    ga('send', 'event', {
      eventCategory: 'Performance Metrics',
      eventValue: data[metricName],
      eventAction: metricName,
      nonInteraction: true,
    });
  }
}

export default class MyApp extends App {
  render () {
    const { Component, pageProps } = this.props;

    return (
      <Container>
        <RUM navigated={ navigated } />
        <Component { ...pageProps } />
      </Container>
    );
  }
}
```

The `navigated` function is the only required property on the `<RUM>` component.
This allows you to configure how to send the data to the processing service of
your choosing. This callback receives the `path` of the URL that the page
navigated to, as well as a `data` object that contains the timing information
for the page navigation.

## Continuing the conversation

We would love to hear your thoughts and feedback in the [GoDaddy OpenSource
Slack channel][slack], or maybe even see your contributions to the project on
GitHub: [https://github.com/godaddy/next-rum][rum]

[next]: https://github.com/zeit/next.js
[slack]: https://godaddy-oss-slack.herokuapp.com/
[rum]: https://github.com/godaddy/next-rum
[timing]: https://www.w3.org/TR/navigation-timing
[model]: https://www.w3.org/TR/navigation-timing/#processing-model
