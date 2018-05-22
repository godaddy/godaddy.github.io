---
layout: post
title:  "UI Testing: moving from WebdriverIO and Selenium to Puppeteer"
date: 2018-05-07 7:16:01 -0800
cover: /assets/images/headers/puppet-theater.jpg
excerpt: When our team was losing engineering hours to Selenium-related test flakiness, we switched to Puppeteer for some of our UI tests. Given our constraints, we found that Puppeteer had a better developer experience and that the similar syntaxes of the two frameworks made the switch easy. We recommend Puppeteer for projects that do not need cross-browser compatibility.
authors:
  - name: Conor Fellin
    url: https://www.linkedin.com/in/conor-fellin-840ba354/
    photo: /assets/images/conor-fellin.jpg
---

### Our Motivation

I work on a full-stack team at GoDaddy that helps support a range of products, from GoDaddy's new customer portal to an internal tool for developing new web content. To test each of these frontends, we used the [WebdriverIO](http://webdriver.io/) test framework with [Selenium](https://www.seleniumhq.org/) browser automation. While we appreciated the setup's cross-platform configurability, we were running into a few issues with Selenium.

#### Deploying Browser Images

The first issue came when incorporating a Selenium browser into a deployment. One approach we tried was to download a Selenium browser into the same container as the codebase at deploy-time. This lead to complex Dockerfiles, and when there was an issue with the browser deploy, it became expensive to debug.

Fortunately, this problem had a simple solution: [Selenium's pre-built Docker containers](https://github.com/SeleniumHQ/docker-selenium). These images are modular, maintained, and ready-to-go. But it came with its own problems. By default Docker would not allow you to see the browser UI when developing locally, but the images come with [a handy debug mode to get around that](https://github.com/SeleniumHQ/docker-selenium#debugging).

#### CICD Flakiness

The second pain point was that Selenium was causing flakiness within our CICD pipeline. Jenkins slaves were failing to connect to the browser containers they had just spun up. At some points, as many as 3 out of 4 builds would fail.

Granted, blaming only Selenium for this would be a little unfair. It was simply proving to be a difficult system to maintain given our development and CICD setups. We could almost certainly have reduced the flakiness if we had dedicated time to making our pipeline more resilient to these failures (which would have been expensive, given that the failures were only happening within our CICD pipelines). Nevertheless that loose coupling between the test suite and the browser was a persistent point of failure, and the time spent trying to resolve our CICD issues could be better spent ... well, finding another UI test framework.

#### Enter Puppeteer

It was at this point that we discovered [Puppeteer](https://github.com/GoogleChrome/puppeteer), a detached-head UI testing framework developed by Google. Puppeteer implements the Chrome devtools protocol, which is currently only supported by Google Chrome and Chromium. The lack of cross-browser support was an issue, but it also allowed for a tighter coupling between test framework and the browser, removing our chief point of friction with WebdriverIO/Selenium.

Conveniently, the codebase we were most actively developing was an internal tool where one supported browser was acceptable. It seemed like a perfect opportunity to pilot Puppeteer. And the promise of increased reliability was too tempting to resist.

So what exactly did the transition between these two frameworks look like? Let's start with one of the most conspicuous points of comparison...

### Syntax

Syntactically, Puppeteer and WebdriverIO can look very similar. Take, for example, each framework's code for clicking a link with the className `myLinkComponent`:

WebdriverIO:
```js
await browser.waitForExist('.myLinkComponent');
await browser.click('.myLinkComponent');
```

Puppeteer:
```js
await page.waitFor('.myLinkComponent');
await page.click('.myLinkComponent');
```

Perhaps the most notable difference in these examples (and this really speaks to how similar they are) is that WebdriverIO utilizes a global `browser` constant, whereas Puppeteer utilizes a `page` object created at the start of a test.

For another example, consider the Puppeteer and WebdriverIO code for finding and reading a text component with the className `myTextComponent`:

WebdriverIO:
```js
await browser.waitForExist('.myTextComponent');
const myText = await browser.getText('.myTextComponent');
```

Puppeteer:
```js
await page.waitFor('.myTextComponent');
const myText = await page.$eval('.myTextComponent', component => component.textContent);
```

Here the Puppeteer example is a little less straightforward: there is not a utility for grabbing text content, so we have to pass a function for scraping the appropriate content to the page's `$eval` method. Still, the testing code is very similar.

Probably the most substantive difference between the two syntaxes is how you configure the tests. Most of WebdriverIO's setup happens in a `wdio.conf.js` file (example [here](https://github.com/webdriverio/webdriverio/blob/master/examples/wdio.conf.js)):

Meanwhile, Puppeteer acts much like a run-of-the-mill npm module, and you configure the tests (much more concisely) in the code that runs them:

```js
const browser = await puppeteer.launch({
  headless: false
});
const page = await browser.newPage();
```

This distinction highlights the differences between the two languages: WebdriverIO allows for a much wider variety of configurations, where Puppeteer takes less effort to get working out of the box.

In general, the syntactic similarities between the two frameworks made it simple to port our existing test suite from WebdriverIO to Puppeteer.

### Development Cycle

I've already made my team's pain points with Selenium fairly clear, so I'll jump right to what I like about Puppeteer here.

By default, Puppeteer operates in headless mode, meaning that tests execute without actually opening a Chrome UI window. For local development, you will often want to disable headless mode so that you can watch the test executing in browser.

Puppeteer supports a number of options to make local development easier. Here are some examples:

```js
const browser = await puppeteer.launch({
  headless: false,  // Turn on local browser UI
  devtools: true,  // Open Chrome devtools at the beginning of the test
  slowMo: 250  // Wait 250 ms between each step of execution
});
const page = await browser.newPage();

// Log browser output to console
page.on('console', (msg) => {
  console.log('console:log', ...msg.args);
})

// Handle dialogs.
page.on('dialog', (dialog) => {
  if (dialog.type() === 'alert') {
    await dialog.dismiss();
  }
});

// Take a screenshot of the page.
await page.screenshot({path: 'my-screenshot.png'});
```

[This blog post](http://nemethgergely.com/puppeteer-browser-automation/) gives you a more detailed look at these and other Puppeteer development options.

Most significantly, in the five months since we adopted Puppeteer, the framework itself has caused no flakiness in our CICD pipeline. This is a framework where developers can be confident that tests that pass locally will also pass in CICD.

### Conclusion

WebdriverIO/Selenium:

* Loose coupling with browser can provide a frequent point of failure
* Platform agnostic
* Lots of examples and documentation on [their website](http://webdriver.io/)

Puppeteer:

* No cross-platform testing
* More reliable for automated testing
* Readily customizable for debugging

In short, there are many apps that need to support more browsers than just Google Chrome. In these cases, Puppeteer is not an option, and you should use WebdriverIO with Selenium or another cross-platform UI testing framework. Otherwise, consider Puppeteer. The conversion is straightforward, and depending on your team's development cycle and CICD setup, it may be a more developer-friendly and reliable UI testing experience.

### Resources

* [WebdriverIO](http://webdriver.io/)
* [Selenium](https://www.seleniumhq.org/)
* [Selenium Docker containers](https://github.com/SeleniumHQ/docker-selenium)
* [Puppeteer](https://github.com/GoogleChrome/puppeteer)
* [Puppeteer Developer Guide](https://developers.google.com/web/tools/puppeteer/)
* [Puppeteer basic setup](https://nemethgergely.com/puppeteer-browser-automation/)
