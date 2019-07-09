---
layout: post
title: "Asherah: An Application Encryption SDK"
date: 2019-07-09 09:00:00 -0700
cover: /assets/images/asherah/encryption.jpg
excerpt: Enterprise data encryption is difficult, error-prone and problematic to scale. In 
particular, managing key rotation and limiting the blast radius of a leaked private key are 
difficult problems. GoDaddy is releasing its proposed solution to this problem as open source. 
It's an Application Encryption SDK called Asherah. Asherah's foundational principle is that 
you plug in your choice of key management services and then use it to manage your hierarchical 
key set and encrypt data using a method known as envelope encryption. We're an incubator project 
and currently in a request-for-feedback phase as we test the implementation internally.
authors:
  - name: Nikhil Lohia
    title: Software Engineer
    url: https://github.com/nikoo28
    photo: https://avatars3.githubusercontent.com/u/2421956?s=60&v=4
  - name: Sushant Mimani
    title: Software Engineer
    url: https://github.com/sushantmimani
    photo: https://avatars1.githubusercontent.com/u/16171711?s=60&v=4
  - name: Joey Paskhay
    title: Sr. Software Engineer
    url: https://github.com/jpaskhay
    photo: https://avatars3.githubusercontent.com/u/684963?s=60&v=4
---


> "...Most Creation myths begin with a 'paradoxical unity of everything, evaluated either as chaos or as Paradise,' and the 
> world as we know it does not really come into being until this is changed. I should point out here that Enki's original name 
> was En-Kur, Lord of Kur. Kur was a primeval ocean -- Chaos -- that Enki conquered."
>
> "Every hacker can identify with that."
>
> "But Asherah has similar connotations. Her name in Ugaritic, 'atiratu yammi' means 'she who treads on (the) sea (dragon).'"
>
> "Okay, so both Enki and Asherah were figures who had in some sense defeated chaos. And your point is that this defeat of 
> chaos, the separation of the static, unified world into a binary system, is identified with creation."
>
> "Correct."

> Ng mumbles something and a card appears in his hand. "Here's a new version of the system software," he says. "It should be a 
> little less buggy."
> 
> "A little less?"
> 
> "No piece of software is ever bug free," Ng says.
> 
> Uncle Enzo says, "I guess there's a little bit of Asherah in all of us."
>
> -- <cite>Snow Crash</cite>, Neal Stephenson

Developers often write software that handles sensitive data like customer information. Best practice and company standards 
dictate that this data should be encrypted at multiple levels: at rest, in transit and at the application. Easy-to-use 
solutions exist for encryption at rest, like encrypted block stores, and for encryption in transit, like TLS, but writing 
solid code for application-level encryption is still challenging. Common problems to tackle include choosing a good 
cryptographic technique, generating keys and managing them properly, preventing memory scanning attacks and rotating keys. For 
example, if you encrypt everything with one key and it is compromised, rotating the key and decrypting-then-re-encrypting all 
of the data is expensive and time consuming.

As we have made the transition to cloud native architectures and are well underway moving many services and applications
to AWS, we have continued to focus significant attention on always improving our security posture. We considered how we 
could address problems surrounding encryption, key rotation and blast radius reduction as a company rather than leaving
these comparatively difficult problems to each team to solve. As a result, we are delighted to present **Asherah**: an 
easy-to-use SDK which abstracts away the complexity of advanced encryption techniques and risk mitigation at enterprise scale. 
**Asherah** makes use of **envelope encryption** and **hierarchical keys**. In envelope encryption, the key used to encrypt a 
data element is itself encrypted by a separate, *higher order* key and the encrypted key value is stored *with the data*. 
These higher order keys form a hierarchy of keys that partition the key space and data, reducing the blast radius of a 
compromise and allowing for novel approaches to incremental rotation. **Asherah** abstracts away the complexity of managing 
that system, letting developers interact with data and encryption/decryption in standard ways with familiar APIs while 
offering a very high level of protection against compromise and data loss. Like alternative libraries such as
[Google's Tink](https://github.com/google/tink), we are careful to provide only those encryption algorithms that are known
secure and initialize them in conformance with best practices. Our initially supported algorithm is AES256-GCM and we plan
to provide interfaces for adding others while supporting and including only those that are known to be safe to use. A more 
detailed explanation of how our goals contrast with other open source alternatives and why we chose to propose our own
SDK, see **Related Work** below.

**Asherah** is an incubator project and we are currently testing internally. In addition, we have a roadmap that includes 
plans to have third-party security audits of the code for every supported language. Our goal in open sourcing it is to 
invite the security community and the developer community at large to help us evaluate, test and iterate on this solution so 
that we can help developers manage private data more securely.

## Using Asherah

We wanted to make it easy for developers to write code that manages customer data without being forced to implement 
important features like key rotation and hierarchical key structures from scratch. The API itself is easy to use.

### Step 1: Create a session factory

Each encryption context is wrapped in a new session that is produced from a factory method. The session contains details on
the particular keys from a key hierarchy that will be used, a caching policy, a key rotation policy and the configuration
of how performance metrics will be logged. A session is required for any encryption/decryption operations. For simplicity, 
the session factory uses the builder pattern, specifically a step builder. This ensures all required properties are set before 
a factory is built. 

To obtain an instance of the builder, use the static factory method `newBuilder`. Once you have a builder, you can 
use the `with<property>` setter methods to configure the session factory properties. Below is an example of a 
session factory that uses in-memory persistence and static key management.

```java
AppEncryptionSessionFactory appEncryptionSessionFactory = AppEncryptionSessionFactory
  .newBuilder("productId", "systemId") 
  .withMemoryPersistence()
  .withNeverExpiredCryptoPolicy()
  .withStaticKeyManagementService("secretmasterkey!") // hard-coded/static master key
  .withMetricsEnabled() // Outputs timing and performance metrics to a configured log handler
  .build())
```

We recommend that every service have its own session factory, preferably as a singleton instance within the 
service. This will allow you to leverage caching and minimize resource usage. Always remember to close the 
session factory before exiting the service to ensure that all resources held by the factory, including the 
cache, are disposed of properly.


### Step 2: Create a session

Now that we have session factory, we need to create a session to be able to actually encrypt/decrypt any data. Use the factory 
created in step 1 to do this. The payload and data row record types can be specified while creating the session. These are 
currently restricted to JSON objects and byte arrays.

```java
// The first parameter for AppEncryption is the payload type and the second is the DRR type
AppEncryption<byte[], byte[]> encryptionSessionBytes = appEncryptionSessionFactory.getAppEncryptionBytes("partitionId"))
```

The scope of a session is limited to a partition id, which is used to partition the lowest order of keys Asherah
manages. As with the session factory, remember to close the session at the end of the transactions to dispose of all
the resources properly.


### Step 3: Use the session to accomplish the cryptographic task

We are now ready to use **Asherah** to encrypt and decrypt data. **Asherah** supports two usage patterns. We'll use the 
simpler encrypt/decrypt pattern for the purpose of this post. For usage details of the advanced load/store 
pattern, [please check out our public repo on GitHub](https://github.com/godaddy/asherah).

Encrypt/Decrypt:

This usage style is similar to common encryption utilities where payloads are simply encrypted and decrypted, and 
it is completely up to the calling application for storage responsibility.

```java
String originalPayloadString = "mysupersecretpayload";

// encrypt the payload 
byte[] dataRowRecordBytes = encryptionSessionBytes.encrypt(originalPayloadString.getBytes(StandardCharsets.UTF_8));

// decrypt the payload 
String decryptedPayloadString = new String(encryptionSessionBytes.decrypt(newBytes), StandardCharsets.UTF_8);
```


## Technical details

Here is a diagram showing at a high level a typical encryption operation in **Asherah**:

![Diagram 1](/assets/images/asherah/first.png)

Features:

* **Easy incremental key rotation and blast radius reduction**: **Asherah** generates cryptographically strong keys and 
arranges them in a hierarchy, enhancing the value provided by envelope encryption. The hierarchical key model also encourages 
frequent key rotation which limits the blast radius in case of a security breach. These key rotations happen automatically
as you encrypt and decrypt data according to the *crypto policy* you use in your session. Behind the scenes, **Asherah**
considers whether keys are revoked, stale or otherwise in need of rotation and decrypts and re-encrypts your data and
rotates your keys.
* **User configurable key management service**: **Asherah** can integrate with master key management services using a 
pluggable key management service interface, allowing it to be cloud agnostic or support on-premise implementations.
* **User configurable datastore**: **Asherah** manages generated data keys via a pluggable datastore, providing you with a
flexible architecture.
* **In-memory key protection against a growing number of key hijacking attacks**: **Asherah** takes advantage of our **Secure 
Memory** library, which makes use of native calls and off-heap memory to secure keys. This protects against several memory 
investigation attacks such as scanning memory directly via proc, forcing a process to page to disk to recapture process memory 
and trigging a core dump. As we continue to implement new ways to protect memory and pair these with recommended system level 
settings (such as, on Linux, setting /proc/sys/kernel/yama/ptrace_scope to a restrictive value), the protections we add to 
this library give Asherah's internal key caches greater resilience to attack.

As a developer, the three primary external resources you interact with are the `KeyManagementService`, the `Metastore` and the
`AppEncryptionSessionFactory`. The `KeyManagementService` is used to integrate with a service, typically a cloud provider's 
core key management implementation, that manages the master key you use as the root for our hierarchical key model. The 
`Metastore` is the backing datastore **Asherah** used to manage the data keys it generates to construct the hierarchical 
model. Both of these interfaces follow a pluggable model so that **Asherah** remains highly extensible for the diversity of 
use-cases that must be managed in enterprise scale environments. Finally, the `AppEncryptionSessionFactory` is where you
initialize your encryption or decryption context. A helpful and configurable `CryptoPolicy` is initialized in this conext and 
it wraps and manages the complexity of key rotation schedules and caching behavior, among other things. Future **Asherah** 
features will primarily be exposed via the policy.

![Diagram 2](/assets/images/asherah/envelope.png)

Envelope encryption is a method for managing and storing key material alongside the data that the key encrypts. In this 
model, when you encrypt a data element, you take the key you used to encrypt the data, encrypt the **key** with a separate,
*higher order* key and then store the encrypted key in the same data structure as the encrypted data. In the diagram 
above, the higher order key is used to encrypt a random string, the lower order key plaintext, creating a lower order key
ciphertext. The "envelope" is then created with the lower order key ciphertext and the ciphertext you get by encrypting
your data with the lower order key plaintext. The dotted line shows the inclusion of these elements in the envelope.
Envelope encryption can be useful for simplifying the management of the source of truth for which key is currently in play for 
which data element (the envelope itself is the source of truth, rather than a separate metadata store) and provides a simple 
basis from which a key hierarchy can be built. A very thoughtful description of this methodology can be found [on Google's 
Security Products page](https://cloud.google.com/kms/docs/envelope-encryption).

The notion of higher and lower order keys can be generalized to a hierarchy or tree of keys:

![Diagram 3](/assets/images/asherah/key_hierarchy.png)

The key hierarchy here has several tiers, each of which you can use to partition your data. A good example of a plausible
data partitioning scheme would be to assign each service in your infrastructure a separate SK. Then, assign each customer in 
your service a separate IK. This would mean that every data element in the DRR (data row record) layer is encrypted 
using a private key that even if recovered could never expose the data of another customer, or, any data at all from a 
different service.  

In order to see how all of these pieces fit together, let's take a look a sequence diagram of a encrypting a
payload using **Asherah**:

![Diagram 4](/assets/images/asherah/happy_path_create_all_keys.svg)

The level of complexity increases significantly when different levels of keys are in need of rotation or are
stale in the cache. All of this complexity is already implemented for you in **Asherah**!


## Related work

When we decided to address these problems internally, our first step was to evaluate alternative open source libraries that
might help. There are a small number of well-supported projects that have some of the features we wanted, such as wrapping
calls to cryptographic libraries and exposing pluggable key storage backends. Two of these were similar enough that we
evaluated them in depth: the 
[AWS Application Encryption SDK](https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/introduction.html) and 
[Google's Tink](https://github.com/google/tink). In each case, though we did see some overlap between our goals and the 
goals of these projects, our focus on key rotation, implementing a key hierarchy for blast radius reduction, a modular
*CryptoPolicy* idea for managing aspects of the library's behavior and our thoughts on how to layer the library on top of
a layer that would be an area for us to continue expanding our protections of in-memory cache data ended up moving us
in the direction of our own implementation. We continue to evaluate these and other projects and are always looking for
ways to contribute and work together on these problems.

## Conclusion

Implementing application layer encryption is a challenge to get right. **Asherah** makes it easy to incorporate an 
advanced hierarchical key model with pluggable storage for key management ready-to-use, while never compromising 
on memory protection. We want developers to focus on what drives their business domain and still maintain a high 
security posture.

The release of **Asherah** to the public is significant: it tackles a complex problem across many languages. Internally,
our teams are continuously testing the security model provided to ensure that the ideas work and address real-world
problems. Further, this drives our progress in adding additional languages and features, which are already in the works. 
Our roadmap includes plans to perform external security audits for each codebase as we evolve the project out of the incubator 
phase. We hope the rest of the community can benefit from the work that has been invested into this project.

Help us make it better! Let us know what you think! Head to [our repo](https://github.com/godaddy/asherah) to start learning 
more.


## Acknowledgements

[Joey Wilhelm](https://www.linkedin.com/in/joewilhelm/) and
[Lilia Abaibourova](https://www.linkedin.com/in/liliaparadis/) provided
feedback on the Open Source documentation and contributed valuable
additions that make up the foundation of this effort and this post. [Eddie 
Abrams](https://www.linkedin.com/in/zeroaltitude/) provided cheerleading 
support and bottomless caffeinated beverages on demand.


## Attributions

"encryption" header image by James Shiell is licensed under CC BY-NC-SA 2.0.
