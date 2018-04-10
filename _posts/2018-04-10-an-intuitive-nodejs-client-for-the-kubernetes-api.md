---
layout: post
title:  "An Intuitive Node.js Client for the Kubernetes API"
date: 2018-04-10 4:16:01 -0800
cover: /assets/images/kubernetes-client.jpg
excerpt: This post explains the motivation for and design of kubernetes-client. We provide an short example on how to write your custom Kubernetes extentions using Node.js and kubernetes-client.
authors:
  - name: Silas Boyd-Wickizer
    url: https://github.com/silasbw
    photo: https://avatars1.githubusercontent.com/u/1919311?s=400&v=4
---

Do you use Node.js and Kubernetes?  Have you wanted to invoke the Kubernetes API directly in Node.js?  Perhaps you’ve wanted to implement a Custom Resource Definition supported by a controller written in Node.js, or you’ve wanted to build some custom tools for your CICD pipeline.  GoDaddy uses Kubernetes and Node.js, and software developers at GoDaddy often find themselves in a position where it makes sense to call the Kubernetes API directly.  We wrote [kubernetes-client](https://github.com/godaddy/kubernetes-client) to provide an easy-to-use Node.js interface to the Kubernetes API.
 
One challenge with writing an interface to the Kubernetes API is the rapid evolution of Kubernetes.  The Kubernetes community releases a new minor version every [three months](https://gravitational.com/blog/kubernetes-release-cycle/). These “minor” releases include a raft of new features that help solve problems or improve existing solutions; and the community doesn’t hesitate to remove features or evolve them in non-backwards compatible ways (*e.g.*, \[[1]\]) It’s an explicit expectation that cluster operators keep their clusters reasonably up-to-date with the latest release, and the community aims to support only three minor releases \[[2]\]. In order to follow best practices and leverage new features, kubernetes-client needs to keep pace with the Kubernetes release cycle.
 
Our first approach was to manually implement support for new features.  We weren’t quite able to keep up with new features: frequently we’d get issues asking to support new features before kubernetes-client contributors implemented them.  Even if adding support for new features was relatively simple, it was a maintenance tax we felt like we should avoid paying.
 
One potential solution is to use [swagger-js-codegen](https://github.com/wcandillon/swagger-js-codegen) to generate API bindings from Swagger or OpenAPI specifications. We could either generate API bindings dynamically (although there’s some practical performance problems we would need to address first); or generate they statically and distribute them with kubernetes-client.
 
We like the Swagger-based approach because it alleviates a maintenance burden, but we do not like the unwieldy client and function names that many of the current tools generate. For example, function names are often based on the Swagger operation ID (*e.g.*, createCoreV1NamespacedPod) and in many instances there isn’t an obvious mapping from the Kubernetes API reference documentation to the operation ID. We wanted our interface to have a more direct mapping to the Kubernetes API documentation and to be close to what you might expect from a handwritten implementation for Node.js.
 
The approach we’ve taken with kubernetes-client is to map path items (*e.g.*, "namespace") to chained objects, and to map path parameters ("path templates" in Swagger terminology) to function arguments. We add HTTP operations (like "GET") as methods on the chained objects. The end result is an interface where the API calls you make in Node.js closely resemble the paths and descriptions in the Kubernetes API reference documentation.
 
To make this more concrete, here's a snippet for initializing a kubernetes-client instance and fetching all the Deployments in the default Namespace:
 
```js
const Client = require('kubernetes-client').Client;
const config = require('kubernetes-client').config;
 
const client = new Client({ config: config.fromKubeconfig(), version: '1.9' });
const deployments = await client.api.v1.namespaces('default').deployments.get();
```
 
With kubernetes-client 5.0.0 we added support for generating these bindings dynamically from your kube-apiserver's swagger.json.  You can now do the following to get a client that matches the operations your Kubernetes cluster supports:
 
```js
const client = new Client({ config: config.fromKubeconfig() });
await client.loadSpec();
```
 
We think the kubernetes-client interface makes it easy to write and maintain code that calls the Kubernetes API directly.  To illustrate
that, here’s snippets for a couple of ways that we use kubernetes client internally at GoDaddy (we plan on releasing all the all code associated with these projects in upcoming months).

{% include cta.html %}
 
### Example: Deployment Notifier
 
It is often useful to track the state of your Deployments outside of your Kubernetes API. For example, [there is a New Relic API to record changes to Deployments](https://docs.newrelic.com/docs/apm/new-relic-apm/maintenance/record-deployments). If your automation deploys a new image, or if a Horizontal Pod Autoscaler scales out a Deployment, automatically notifying New Relic makes it easy to track potential performance improvements or regressions. Many third party services offer similar APIs for notifying them about changes to deployed services (*e.g.*, [GitHub Deployments](https://developer.github.com/v3/repos/deployments/), [ServiceNow Change Requests](https://docs.servicenow.com/bundle/kingston-it-service-management/page/product/change-management/task/t_CreateAChange.html), [GitLab deployments](https://docs.gitlab.com/ee/ci/environments.html), [Slack Incoming Webhooks](https://api.slack.com/incoming-webhooks), ...).
 
We wrote an example, called the [Deployment Notifier](https://github.com/godaddy/kubernetes-client/blob/master/examples/deployment-notifier.js), that logs messages to the console when specific Deployments change. Deployment Notifier uses a DeploymentNotifier Custom Resource Definition (CRD) to allow Kubernetes users to specify which Deployments they want notifications on, and a [custom controller](https://kubernetes.io/docs/concepts/api-extension/custom-resources/#custom-controllers) implemented with kubernetes-client to process DeploymentNotifiers and "notify" the console at the right time.
 
#### Extending the API with a DeploymentNotifier
 
The first thing our custom controller does is create an API client and attempt to extend the Kubernetes API by creating a DeploymentNotifier CRD. We create the DeploymentNotifier in the controller to make it easy to install Deployment Notifier on a new Kubernetes cluster simply by running the controller.
 
```js
async function main() {
  try {
    const client = new Client({ config: config.fromKubeconfig() });
    await client.loadSpec();
 
    //
    // Create the CRD if it doesn't already exist.
    //
    try {
      await client.apis['apiextensions.k8s.io'].v1beta1.customresourcedefinitions.post({ body: crd });
    } catch (err) {
      //
      // API returns a 409 Conflict if CRD already exists.
      //
      if (err.statusCode !== 409) throw err;
    }
 
    //
    // Add endpoints to our client
    //
    client.addCustomResourceDefinition(crd);
 
    //
    // Watch DeploymentNotifiers.
    //
    watchDeploymentNotifiers();
  } catch (err) {
    console.error('Error: ', err);
  }
}
 
main();
```
 
#### Watching DeploymentNotifiers
 
After extending the Kubernetes API, the Deployment Notifier controller begins watching events on DeploymentNotifier objects.
 
```js
function watchDeploymentNotifiers(client) {
  const stream = client.apis['kubernetes-client.io'].v1.watch.deploymentnotifiers.getStream();
  const jsonStream = new JSONStream();
  stream.pipe(jsonStream);
 
  const watchers = {};
  jsonStream.on('data', async event => {
    const id = `${ event.object.metadata.namespace }/${ event.object.metadata.name }`;
    if (event.type === 'ADDED') {
      //
      // Watch the Deployment for each DeploymentNotifier.
      //
      watchers[id] = watchDeployment(client, event.object);
    } else if (event.type === 'DELETED') {
      watchers[id].abort();
      delete watchers[id];
    }
  });
}
```
 
The function `watchDeploymentNotifiers` is responsible for detecting when users add new DeploymentNotifier objects and then calling `watchDeployment`.  `watchDeployment` is a function that monitors a specific Deployment and returns a Node.js stream. `watchDeploymentNotifiers` saves a mapping from DeploymentNotifier name to stream. When a user deletes a DeploymentNotifier, `watchDeploymentNotifiers` cleans up by aborting the stream associated with that DeploymentNotifier.
 
#### Watching Deployments
 
The last critical piece of functionality the Deployment Notifier implements is watching events on Deployment objects that have an associated DeploymentNotifier object and "notifying" when a relevant event occurs.
 
```js
function watchDeployment(client, notifier) {
  let version = '(none)';
  const stream = client.apis.apps.v1beta.watch.ns('default').deploy(notifier.deploymentName).getStream();
  const jsonStream = new JSONStream();
  stream.pipe(jsonStream);
 
  jsonStream.on('data', async event => {
    const newVersion = event.object.spec.template.spec.containers.map(container => container.image).join(',');
    //
    // Simple "notification": log to the console. A better option could be
    // calling the New Relic Deployment API or GithHub Deployment Status or ...
    //
    console.log(`DeploymentNotifier ${ notifier.metadata.name }: ${ event.object.metadata.name } ${ event.type }`);
    if (version !== newVersion) {
      console.log(`${ version } -> ${ newVersion }`, JSON.stringify(notifier.notify, null, 2));
      version = newVersion;
    }
  });
 
  return stream;
}
```
 
`watchDeployment` is similar to `watchDeploymentNotifiers` except that it's watching for changes to Deployment objects. In this example we are interested in changes to any container image. If a user updates a container images, for example using `kubectl set image`, `watchDeployment` calls `console.log` to log the update. As discussed above, a more useful notification might be to call a third party API, like New Relic's Deployment API.
 
### Next up
 
We hope that kubernetes-client provides an intuitive Kubernetes API client for developers building services that call the Kubernetes API directly. The kubernetes-client GitHub project has a handful of [examples](https://github.com/godaddy/kubernetes-client#more-examples) to help jump start potential projects. We are also planning on releasing our internal projects that leverage kubernetes-client, including a production-ready version of the Deployment Notifier example.
 
[1]: https://kubernetes.io/docs/tasks/access-kubernetes-api/migrate-third-party-resource/
[2]: https://github.com/kubernetes/community/blob/master/contributors/design-proposals/release/versioning.md
