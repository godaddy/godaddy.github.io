---
layout: post
title:  "Health Checks and Graceful Shutdown for Node.js Applications"
date:   2018-02-22 11:16:01 -0800
cover: /assets/images/graceful-shutdown.jpg
excerpt: Your application is serving requests constantly for your users. You and your team want to ship features and fixes as soon as they are ready, so you do continuous delivery. But what happens to your users who used your product at the time of the deployment? Chances are, the requests they have in progress are going to fail. This post helps you fix that.
canonical: https://nemethgergely.com/nodejs-healthcheck-graceful-shutdown
author: Gergely Nemeth
author_twitter: nthgergo
author_photo: https://avatars2.githubusercontent.com/u/2174968?s=460
---

Your application is serving requests constantly for your users. You and your team want to ship features and fixes as soon as they are ready, so you do continuous delivery. **But what happens to your users who used your product at the time of the deployment? Chances are, the requests they have in progress are going to fail.** This post helps you fix that.

# Graceful shutdown for Node.js

When you deploy a new version of your application, the old must be replaced. The process manager you are using *(no matter if it is Heroku, Kubernetes, supervisor or anything else)* will first send a `SIGTERM` signal to the application to let it know, that it will be killed. Once it gets this signal, it should **stop accepting new requests, finish all the ongoing requests, and clean up the resources it used**. Resources may include database connections or file locks.

For your Node.js process you may add something like this:

```javascript
process.on('SIGTERM', () => {
  logger.info('shutdown started')
  server.stop()
    .then(closeMysqlConnection())
    .then(() => {
      logger.info('process is stopping')
    })
})
```

# Health checks for Node.js applications

Health checks of your applications are called by the load balancer of your application to let it know if the application instance is healthy, and can server traffic. If you are using Kubernetes, Kubernetes has two distinct health checks:

* **liveness** is used by the kubelet to know when to restart a container,
* **readiness** is used by the kubelet to know when a container is ready to start accepting traffic - when a pod is not ready, it is removed from the Service load balancers.

On how to set up health checks for Kubernetes, check out the official [Configure Liveness and Readiness Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/) docs.

{% include cta.html %}

# Enter `terminus`

[terminus](https://github.com/godaddy/terminus) is an open-source project, which adds health checks and graceful shutdown to your applications - to save you from the boilerplate code you would add otherwise. You only have to provide the cleanup logic for graceful shutdowns, and the health check logic for health checks, all the rest is handled by [terminus](https://github.com/godaddy/terminus).

Let's take a look at an example:

```javascript
const http = require('http')
const terminus = require('@godaddy/terminus')

const server = http.createServer((request, response) => {
  response.end('<html><body><h1>Hello, World!</h1></body></html>')
})

const PORT = process.env.PORT || 3000

function onSigterm () {
  console.log('server is starting cleanup')
  return Promise.all([
    // your clean logic, like closing database connections
  ])
}

terminus(server, {
  // healtcheck options
  healthChecks: {
    '/_health/liveness': livenessCheck,
    '/_health/readiness': readinessCheck
  },

  // cleanup options
  timeout: 1000,
  onSigterm,

  logger
})

server.listen(PORT)
```

The example above decorates your HTTP server with two endpoints, `/_health/liveness` and `/_health/readiness` *(sure, you can use other paths here)*. They both are given a function returning a Promise - if the Promise resolves, it will return with a `200`, if it rejects, it will return with a `500`.

The `onSigterm` function will be called, once all the ongoing requests are served. You can also provide the `timeout` option - once the timeout elapses, the server will be terminated, no matter if there are still ongoing requests.

---

I hope with the help of `terminus` you'll build more reliable services. If you miss anything / would like to contribute, please visit the project's Github page: [https://github.com/godaddy/terminus](https://github.com/godaddy/terminus).
