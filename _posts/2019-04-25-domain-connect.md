---
layout: post
title: "Creating the Domain Connect Standard"
date: 2019-04-25 09:00:00 -0700
cover: /assets/images/domain-connect/cover.png
excerpt: Domain Connect is an open standard that makes it easier for users of services like Squarespace or O365 to configure DNS without having to understand the details. The protocol involves two parties. The first is the Service Provider whose user wants to configure DNS to enable the service, and the other is the DNS Provider. The most immediate reaction to it is usually 'This is a no-brainer'. But how did it get created and evolve? How can it help others?
authors:
  - name: Arnold Blinn
    title: Chief Architect
    url: https://www.linkedin.com/in/arnoldblinn/
    photo: /assets/images/domain-connect/arnold-blinn.jpeg
---

## A Problem Configuring Services

A few years ago we noticed something at GoDaddy. Third party services for email (e.g. O365 or G Suite) or web hosting (e.g. Squarespace or Shopify) were becoming more popular, and our customers were struggling to properly configure DNS. Even with the best instructions, this continues to be a high barrier for many users.  They struggle with making these changes. So services end up not being configured.

To fix this, we started working with some of these third parties and developed a simple protocol and experience that allowed customers to setup these applications without having to worry about the specifics of the DNS records.  A “one click” configuration. 

We got this working with about a dozen different services when we realized something.  There wasn’t any rocket science in what we were doing; the protocol we developed was, largely speaking, a simple and properly formatted web-based link from the Service Provider to us. So why not turn it into an open standard? We took our protocol, filled in a few gaps, and generalized it up to make it more standards friendly.  

Out of this process we created Domain Connect.

## What is Domain Connect?

[Domain Connect](https://domainconnect.org) is an open standard that makes it easier for users of services like Squarespace or O365 to configure DNS without having to understand the details. Domain Connect involves two parties. The first is the Service Provider whose user wants to configure DNS to enable the service, and the other is the DNS Provider.

Historically a Service Provider would first ask the user for a domain name. The Service Provider would then try to figure out the company providing DNS, typically by querying the top-level-domain (the TLD) for the nameservers for the domain. The TLD for godaddy.com is .com. Based on a hard-coded table, the Service Provider would then give instructions to the user telling them how to setup DNS.  This might involve screen shots, videos, or simple instructions.

This is a complex operation for users and they often get lost or confused, resulting in a bad user experience. This often leads to higher support costs for both the Service and DNS Providers. And ironically the more help the Service Provider gives the user, the more likely things go off the rails if and when the DNS Provider updates their interface.

Domain Connect solves this problem for the user. The protocol has two components.

The first is in the “discovery” stage of the protocol. Having a hard-coded table of nameservers to determine the DNS Provider is error prone. So instead of doing a query to the TLD for the nameserver, the Service Provider can query the `_domainconnect` TXT record directly from DNS for the domain and determine the DNS Provider.  

The second component makes the changes to DNS. For this the Service Provider will have first onboarded a template of changes to enable their service with the DNS Provider. Now when the user types their domain name, the Service Provider links to the DNS Provider providing (amongst other data) the domain name, the template, and any other settings. The DNS Provider signs the user in, verifies the user owns the domain name, confirms the change with the user, and makes changes to DNS by applying the template.

Note: There is also an OAuth based version where instead of the DNS Provider making the changes to DNS, an OAuth token is handed back to the Service Provider which later calls an API to apply a template.

These templates are the cornerstone of Domain Connect. The template encapsulates all the DNS changes a Service Provider requires, and allows the DNS Provider to approve and manage the changes.

The current version of the specification can be found [here](https://www.domainconnect.org/specification/).

## A Standard is Born

Our next step was to gain adoption.  We already had a dozen plus Service Providers supporting the protocol. But we wanted more DNS Providers.  We started talking about it with all the main DNS Providers, and while there was a great deal of interest and support there was little action.  Implementation fell into their various backlogs.

This all changed at a Hackathon at Cloudfest in the spring of 2017.  Some engineers from GoDaddy, Host Europe Group, and United Domains got together and implemented two projects. The first was to add Domain Connect support to United Domains.  The other project was to build a simple example Service Provider. The latter has since evolved, but can be found at [https://exampleservice.domainconnect.org](https://exampleservice.domainconnect.org).

At the end of the hackathon we successfully demonstrated configuring our new example service with a domain at United Domains and at GoDaddy.  Coincidently the MC of the hackathon was Paul Mockapetris, who along with Jon Postel is credited as a co-inventor of DNS. A highlight was when we explained the reason for doing this was that normal users don’t understand DNS.  Paul is a good-natured person who appreciated and largely agreed with this jab. 

After the hackathon things really took off. United Domains recruited 1&1 which launched an implementation. This led to several more DNS Providers. The Service Providers now had more incentive to implement the protocol.  Other companies like Microsoft and Automattic got behind it.  

## Providing more Customer Value

Building on this we decided to do some more projects at the Cloudfest Hackathon in 2018. This time we helped Plesk add support for the protocol, both as a DNS and Service Provider. 

We also decided to build something useful for customers. We wondered if we could build a Dynamic DNS (DDNS) application using Domain Connect. This allows a server that uses DHCP and gets a dynamic IP address to update a DNS entry whenever the IP address changes. This functionality was popular in the late 1990s with some routers and DNS provides supporting proprietary protocols. While not as commonly used today, some small business customers and advanced users still use this capability.  

As you may guess, we were successful and built a [nifty little Windows Application](https://github.com/Domain-Connect/DomainConnectDDNS-Windows) that does this. It runs as a Windows Service or as a System Tray Icon (later we also built Linux versions). It uses the Domain Connect protocol to update an A record whenever your IP address changes. With a short TTL, this is what DDNS does. 

Note: For this implementation the Domain Connect is implemented using OAuth.  The end user grants permission for the application to update DNS using Domain Connect on their behalf.

There are two interesting things about this application.

First, we built our DDNS application on top of an open source protocol. This means that any DNS service that supports Domain Connect using the asynchronous OAuth flow can support DDNS.

Second, to our knowledge this is the first use of OAuth where a single application is implemented to talk to multiple OAuth providers.  While most OAuth implementations are built to allow multiple applications to access an API, they are purpose built for one service.  For example, Facebook uses OAuth to allow third-party applications to access Facebook APIs on behalf of the granting users. But these third-party applications only talk to Facebook.

This application uses OAuth to call the same API at different providers. It talks to GoDaddy, or just as easily to 1&1.  Pretty cool to a nerd.  The application can be found at [https://github.com/Domain-Connect/DomainConnectDDNS-Windows](https://github.com/Domain-Connect/DomainConnectDDNS-Windows).

Of course coming out of this hackathon participants from multiple companies helped to improve and evolve the specification.  It has since evolved and is supported by over 40 companies with contributors from a wide variety of them, all listed at [https://domainconnect.org](https://domainconnect.org).

As time passed, more Service Providers onboarded. This included G Suite from Google. 

## Removing Barriers for DNS Providers

One challenge we continued to face was getting more DNS Providers onboard. They were all highly supportive, but had trouble getting past the implementation hurdle.  Service Providers were able to onboard in a matter of a couple of days using the examples, but DNS Providers didn’t have the same level of support.

So we went into our third year at the Cloudfest Hackathon with a goal to solve this problem.

We built a reference implementation for DNS Providers. This library was used to build a proof of concept on top of PowerDNS and Bind.  

Like all the open source examples as part of Domain Connect, this can be found at [https://www.domainconnect.org/code/](https://www.domainconnect.org/code/).

We currently have several major DNS Providers leveraging this library and launching their implementations in the coming months.
 
## The Future

At GoDaddy, we continue to onboard Service Providers onto the platform. And we are looking forward to working with the community to push forward the spec. We also enjoy and will continue to work with the other DNS Providers to help them onboard to the protocol. This helps consumers and makes the Internet easier to use. They say a rising tide lifts all boats, and we feel that Domain Connect is a great ‘tide’.

As an open standard, it is the community at large that owns and improves it. Feel free to check out [https://domainconnect.org](https://domainconnect.org) to learn more or get involved.
