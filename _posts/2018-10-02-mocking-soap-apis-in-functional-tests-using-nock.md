---
layout: post
title: "Mocking SOAP APIs in functional tests using Nock"
date: 2018-10-02 12:00:00 -0800
cover: /assets/images/headers/using-nock.jpg
excerpt: This post explains why and how to mock the external REST and SOAP
  APIs in the functional tests of a service written in NodeJS to have a more
  robust CICD. In this post, We will write a simple functional tests and mock
  the external API using `nock` node module.
authors:
  - name: Deepti Agrawal
    url: https://www.linkedin.com/in/adeepti10/
    photo: /assets/images/dagrawal.jpg
---

I work on writing services using Node.js on a customer experience team at
GoDaddy. These services use data from different products across GoDaddy to
provide personalized customer data to the client teams. To collect these data,
we call different GoDaddy wide services. And this is where the real complication
comes in. Since we don't have control of these services, some of them are still
legacy. And by legacy here I mean SOAP services as well. Yes, you read it right.
[SOAP services](https://en.wikipedia.org/wiki/SOAP).

We initially started writing our functional tests calling real/live APIs. But
then the functional tests became unreliable.

Here are the reasons why:
1. The dependent services were slow.
1. The dependent services were flaky.
1. Covering corner cases with real test data is challenging. An example: Your
   service has a special handling for data returned by external service which
   contains products having last day of their free trial.

Using live APIs became more of a pain for our CICD process. It also made our
CICD process slow and flaky.

This is when we spent time looking at different options to fix the test
flakiness. One of the approach was to avoid calling the dependent services in
our functional tests. During investigation of this approach, we came across
[Nock](https://github.com/nock/nock).

## What is Nock?

Nock is an HTTP server mocking library for Node.js applications.

Nock intercepts HTTP request made using Node's `http.request` or
`http.ClientRequest` modules and responds with the expected/mocked status code
and response.

## Nock setup

Install Nock by running:

```sh
npm i --save-dev nock
```

## Mocking REST service

Assume the service under development has an endpoint `/user` which returns
`fullname` derived from the response of the dependent service, the test snippet
would be: 

```js
const nock = require('nock');
const request = require('request');

const DEPENDENT_SERVICE_HOST = 'https://calling.dependent-service.com';
const DEPENDENT_SERVICE_PATH = '/user';

const NEW_SERVICE_HOST = 'https://testing.new-service.com';

const setupNock = () => {
  nock(DEPENDENT_SERVICE_HOST)
    .get(DEPENDENT_SERVICE_PATH)
    .reply(200, { firstname: 'foo', lastname: 'bar' });
};

describe('New Service', () => {
  it('/user endpoint returns fullname', async () => {
    setupNock();
    const response = await request(NEW_SERVICE_HOST)
      .get('/user')
      .expect(200);
    expect(response.body).toEqual({ fullname: 'foo bar' });
  });
});
```
You can also test how your service handles errors such as a `500` status from
the dependent service. To do so update the `setupNock` to

```js
  nock(DEPENDENT_SERVICE_HOST)
    .get(DEPENDENT_SERVICE_HOST)
    .reply(500)
```

You can also store the mock respone from the dependent service in separate
files. Use `replyWithFile` in such cases

```js
  nock(DEPENDENT_SERVICE_HOST)
    .get(OLD_SERVICE_HOST)
    .replyWithFile(200, path.join(__dirname, './mocks/user.json'));
```

All the above snippets looks pretty straightforward, but they are mocking REST
APIs.

How would you achieve the same when the dependent service is a SOAP service?

## Mocking SOAP services

Mocking SOAP services are a bit tricky since it involves first mocking the WSDL
document which describes the SOAP service and then the SOAP action. Below are
the steps to achieve that.

To get started, use `GetCountriesAvailable` action of the SOAP service
http://holidaywebservice.com/HolidayService_v2/HolidayService2.asmx?WSDL and try
mocking it with Nock.

### Step 1: Create a service

We will build a new service that returns `CountryCode: { Code, Description }`
from the SOAP service's response. The code snippet for the `GET` call would be:

```js
const express = require('express');
const app = express();

app.get('/countries', async (req, res) => {
  const SOAP_API_URL = 'http://holidaywebservice.com/HolidayService_v2/HolidayService2.asmx?WSDL';
  const client = await soap.createClientAsync(SOAP_API_URL);
  const result = await client.GetCountriesAvailableAsync();
  res.status(200).json(result[0].GetCountriesAvailableResult.CountryCode[0]);
});
```

### Step 2: Setup `npm test`

Add a test runner like `mocha` in your repository. Add the below line in
`scripts` key of `package.json`:

```json
  "test": "mocha test-functional/**/*.test.js --timeout 30000"
```

### Step 3: Example Test Code

We will use [supertest](https://www.npmjs.com/package/supertest) npm module for
the API testing.

```js
const request = require('supertest');

describe('GET', () => {
  it('/countries', async () => {
    const server = require('./server');
    const result = await request(server)
      .get('/countries')
      .expect(200);
    expect(result).toEqual({ Code: 'Canada', Description: 'Canada' });
  });
});
```

This will call the external SOAP service when ran in CICD, which leads to slow
and flaky tests.

Instead of relying on the actual service, lets see how to mock the SOAP service.

### Step 4: Mocking WSDL document

This is the first of two steps in mocking the SOAP service.

First, we will have to mock the WSDL response of the SOAP API. The WSDL is an
XML document which describes the service and the actions the service can
perform.

You can find WSDL document for the service
[here](http://holidaywebservice.com/HolidayService_v2/HolidayService2.asmx?WSDL).
For mocking, we copy the contents into `./mocks/holiday-service-wsdl.xml`.

Also, create a function `setupWsdlNock` to mock the wsdl response.

```js
const path = require('path');
const nock = require('nock');

const SOAP_API_HOST = 'http://holidaywebservice.com';
const SOAP_API_PATH = '/HolidayService_v2/HolidayService2.asmx?WSDL';

const setupWsdlNock = () => {
  return nock(SOAP_API_HOST)
    .get(SOAP_API_PATH)
    .replyWithFile(200, path.join(__dirname, './mocks/holiday-service-wsdl.xml'));
};
```

### Step 5: Mocking SOAP action

The next step would be to mock the actual SOAP action which returns the test
data that we expect.

Again, create another file `./mocks/get-countries-mock.xml` with the below
contents:

```xml
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetCountriesAvailableResponse xmlns="http://www.holidaywebservice.com/HolidayService_v2/">
      <GetCountriesAvailableResult>
        <CountryCode>
          <Code>Iceland</Code>
          <Description>Most sparsely populated city in Europe</Description>
        </CountryCode>
        <CountryCode />
      </GetCountriesAvailableResult>
    </GetCountriesAvailableResponse>
  </soap:Body>
</soap:Envelope>
```

Also add the following code in the test

```js
const setupGetCountriesNock = (status, filename) => {
  return nock(SOAP_API_HOST, {
    reqHeaders: {
      soapaction: `"${SOAP_API_HOST}/HolidayService_v2/GetCountriesAvailable"`
    }
  })
    .post('/HolidayService_v2/HolidayService2.asmx')
    .replyWithFile(status, path.join(__dirname, filename));
}

describe('GET', () => {
  it('/countries', async () => {
    setupWsdlNock();
    setupGetCountriesNock(200, './mocks/get-countries-mock.xml');

    const server = require('./server');
    const result = await request(server)
      .get('/countries')
      .expect(200);
    expect(result).toEqual({ Code: 'Iceland', Description: 'Most sparsely populated city in Europe' });
  });
});
```

### Step 6: Running the test

Now run `npm test` and magic - You have your dependent SOAP service mocked.

## Troubleshooting

1. If you get an error like `Error: Nock: No match for request`, make sure to
   compare the `hostname`, `path` and the `reqHeaders.soapaction` in the test
   case with the actual request made.
1. Nock interceptor resets itself after the first call to the SOAP service.
   Hence, if you have more than one call to the same SOAP service, make sure to
   mock the service using `times` function of Nock.

```js

return nock('http://holidaywebservice.com', {
    reqHeaders: {
      soapaction: `"http://www.holidaywebservice.com/HolidayService_v2/GetCountriesAvailable"`
    }
  })
    .post('/HolidayService_v2/HolidayService2.asmx')
    .times(2)
    .replyWithFile(200, path.join(__dirname, './mocks/GetCountriesAvailable.xml'));
```

## Conclusion

Using Nock will make your functional test less flaky and more independent of
external factors. This will make your CICD more robust, fast and trustable.
Hence, increasing your productivity and decreasing the time waiting for the
build to be green with your fingers crossed.

## References:
- [Nock](https://github.com/nock/nock)
- [SOAP](https://en.wikipedia.org/wiki/SOAP)
