---
layout: post
title: "Kubernetes External Secrets"
date: 2019-04-16 09:00:00 -0700
cover: /assets/images/kubernetes-external-secrets/cover.jpg
excerpt: Engineering teams at GoDaddy use Kubernetes with secret management systems, like AWS Secrets Manager. "External" secret management systems often provide useful features, such as
rotation, that the native Kubernetes [`Secret`](https://kubernetes.io/docs/concepts/configuration/secret/) object does not support. External systems, however, require extra work for engineering teams to leverage in their Kubernetes clusters. For example, a team might need to implement custom application code to load secret data at run-time.  Kubernetes External Secrets is a new open source project that addresses this issue by introducing the `ExternalSecret` object type. With an `ExternalSecret` object, an engineering team can manage its secret data in an external system and access that data in the same way they would if they were using a `Secret` object.
authors:
  - name: Silas Boyd-Wickizer
    title: Sr. Director of Engineering
    url: https://github.com/silasbw
    photo: https://avatars.githubusercontent.com/silasbw
  - name: Jacopo Daeli
    title: Sr. Software Engineer
    url: https://github.com/JacopoDaeli
    photo: https://avatars.githubusercontent.com/JacopoDaeli
---

Teams at GoDaddy use the AWS managed Kubernetes offering,
[EKS](https://aws.amazon.com/eks/), to deploy their services. We also
use AWS [Secrets Manager](https://aws.amazon.com/secrets-manager/) for
storing secrets, like private keys and database passwords. EKS,
however, does not provide much support for accessing Secrets
Manager. Therefore, teams develop custom solutions for
accessing secret data from their EKS clusters. One approach, for
example, is to fetch secrets from Secret Manager when the application
starts. The result is overlapping efforts for developing these custom
solutions and because security is critical in this context, the
individual efforts can require substantial engineering time.

This blog post describes a generalized approach and
implementation for supporting secret management systems, like AWS Secrets
Manager, in Kubernetes. We call this system Kubernetes External
Secrets and we have [open
sourced](https://github.com/godaddy/kubernetes-external-secrets) our
initial implementation. Our current solution focuses on making it easy
for developers to manage secrets with AWS and deploy them to their EKS
clusters, but we think our approach is general enough for other types
of Kubernetes clusters and secret management systems.

The rest of this blog post describes the motivation for and design of
Kubernetes External Secrets. The
[README.md](https://github.com/godaddy/kubernetes-external-secrets)
has instructions for adding Kubernetes External Secrets to your
cluster if you are looking to get started immediately.

## Overview

Kubernetes has a built-in object for managing secrets called a
[`Secret`](https://kubernetes.io/docs/concepts/configuration/secret/). The
`Secret` object is convenient to use: it provides a declarative API
that makes it easy for application
[`Pods`](https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets)
to access secret data without any special code.  One downside of
`Secret` objects is that they do not support storing or retrieving
secret data from external secret management systems. It's often
beneficial, however, to use Kubernetes with an external service that
handles secret management and includes useful features. For
example, Secrets Manager integrates with other AWS services, like
Lambda functions, includes encryption at rest, and has a useful
mechanism for codifying rotation policies.

Kubernetes External Secrets aims to provide the same ease of use as
native `Secret` objects and provide access to secrets stored
externally. It does this by adding an `ExternalSecret` object to the
Kubernetes API that allows developers to inject external secrets into
a `Pod` using a declarative API similar to the native `Secret`
one.

Instead of inlining base64 encoded secret data into a `Secret` object,
developers define an `ExternalSecret` object that specifies a secret
management system and properties to load from that system.

For example, instead of using a `Secret` object to store a database
password:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cats-and-dogs
type: Opaque
data:
  password: d29vZgo=
```

a developer can use an `ExternalSecret`, specifying the secret
management systems as `backendType` and the properties to access in the
`data` array:

```yaml
apiVersion: 'kubernetes-client.io/v1'
kind: ExtrenalSecret
metadata:
  name: cats-and-dogs
secretDescriptor:
  backendType: secretsManager
  data:
    - key: cats-and-dogs/mysql-password
      name: password
```

and access that password from a `Pod` in the same way they would
if they were using a `Secret` object:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: cats-and-dogs
spec:
  containers:
  - name: cats-and-dogs
    image: cats-and-dogs
    env:
      - name: SECRET_PASSWORD
        valueFrom:
          secretKeyRef:
            name: cats-and-dogs
            key: password
```

Notice that the `ExternalSecret` does not contain secret data. It's
safe to store in plain text along with your other Kubernetes manifest
files for your service.

## Design

Kubernetes External Secrets adds the `ExternalSecret` object to
Kubernetes using a
[`CustomResourceDefinition`](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/),
and adds an `ExternalSecret` controller we wrote in Node.js that implements
the behavior of the object type itself.

The `ExternalSecret` controller follows a familiar pattern seen in
other Kubernetes objects, like
[`Deployments`](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/):
users declare a desired state in an `ExternalSecret` object and the
controller creates or updates a complementary `Secret` object to reach
that state. The controller monitors `ExternalSecret` objects, fetches
secret data from the specified external secret management system, and automatically
creates native `Secret` objects that hold the secret data. The
architecture diagram below illustrates this process.

![Architecture Diagram](/assets/images/kubernetes-external-secrets/architecture.png)

## Using

You can add Kubernetes External Secrets to your cluster with a single command:

```
kubectl apply -f https://raw.githubusercontent.com/godaddy/kubernetes-external-secrets/master/external-secrets.yml
```

and begin manipulating `ExternalSecret` objects like you would any
other Kubernetes object type:

```
kubectl -n cats-and-dogs get es
```

If you're interested in converting existing `Secret` objects to
`ExternalSecret` objects, one of the authors of Kubernetes External
Secrets wrote a [Kubernetes External Secrets
CLI](https://github.com/silasbw/kubernetes-external-secrets-cli) that
makes migration easy by converting a `Secret` to a series of AWS
CLI commands and a kubectl command that loads your secret data
into AWS Secrets Manager and creates a complementary `ExternalSecret`
object.

## Other approaches

We experimented with and drew inspiration from other projects that
help manage access to secret data from Kubernetes.

[cmattoon/aws-ssm](https://github.com/cmattoon/aws-ssm) uses annotations on
`Secret` objects to identify properties in AWS Parameter Store and
populate the `Secret` object with those properties' values.

[kubesec](https://github.com/shyiko/kubesec) makes it easy to encrypt
data before storing it in a `Secret` object or manifest. At run-time,
applications are responsible for decrypting the data before using it.

The [Kubernetes Vault
Integration](https://github.com/Boostport/kubernetes-vault) project
provides Vault auth tokens to `Pod` objects. Application code running
in a `Pod` can use that token to authenticate with Vault and retrieve
secret data.

We explored configuring nodes in our CICD pipeline to inject
`Secret` objects during testing and deployment. One benefit of this
approach is that Kubernetes clusters would not need to access the
external secret management system directly, which might help mitigate
data leaks during an attack. On the other
hand, it required the Kubernetes manifest files for a single
application to be stored in several locations and complicated
application debugging and deployment because developers would need to
use a combination of kubectl and specialized CICD tools.

## Upcoming improvements

Kubernetes External Secrets supports AWS Secrets Manager and AWS
Systems Manager, however, we believe the approach is general enough to
support other external secret management systems and would be excited
about working with community members to add them.

The Kubernetes External Secrets controller does not have a broad
attack surface since it is accessible only via the Kubernetes API. We
have worked, however, to tighten security by leveraging RBAC to
restrict what the [controller can
access](https://github.com/godaddy/kubernetes-external-secrets/blob/master/external-secrets.yml),
using
[eslint-plugin-security](https://github.com/nodesecurity/eslint-plugin-security)
to identify potentially vulnerable code patterns, and doing design
reviews at GoDaddy. Nevertheless, we think it is important to
continually improve security and take advantage of new features and
patterns as they emerge. We plan on continuing to improve security by:

* [restricting network access](https://github.com/godaddy/kubernetes-external-secrets/issues/37) to staunch potential attacks that might try to leak secrets;
* facilitating rotation by [triggering restarts](https://github.com/godaddy/kubernetes-external-secrets/issues/38) when there is an update to an `ExternalSecret`;
* working through a threat model analysis; and
* adopting upcoming EKS features, like [IAM roles for `Pods`](https://github.com/aws/containers-roadmap/issues/23), that
will help harden our implementation.

## Conclusion

We hope that Kubernetes External Secrets can provide teams outside of
GoDaddy with a common way to access secret data in secret management
systems. Using Kubernetes External Secrets does not require any
application modifications and existing `Pod` specifications that
leverage `Secret` objects will work with `ExternalSecret` objects
without any changes.

If you want to get started with Kubernetes External Secrets or
contribute please visit
<https://github.com/godaddy/kubernetes-external-secrets>.

## Acknowledgements

[Celia Waggoner](https://www.linkedin.com/in/celiawaggoner/) and
[Jarrett Cruger](https://www.linkedin.com/in/jcruger/) provided
feedback on the Kubernetes External Secrets design and contributed to
early versions of the implementation.
