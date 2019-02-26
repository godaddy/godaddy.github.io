---
layout: post
title: "Connecting an On-Premises Data Center to AWS with HA Software VPN Tunnels"
date: 2019-02-26 09:00:00 -0800
cover: /assets/images/ha-openvpn/cover.jpg
excerpt: When our team started to deploy our services to Amazon cloud, there was a demand to connect from Amazon VPC back to our On-Premises data center. This post describes how we build HA software VPN tunnels.
authors:
  - name: Kewei Lu
    url: https://www.linkedin.com/in/kewei-lu-216b433a
    photo: https://avatars.githubusercontent.com/keweilu
---

According to [the latest annual State of the Cloud Survey](https://www.rightscale.com/blog/cloud-industry-insights/cloud-computing-trends-2018-state-cloud-survey) conducted by RightScale, about 51 percent of enterprises are using a hybrid cloud strategy. When an enterprise starts to adopt a hybrid cloud strategy, a common issue that arises is how to build a secured connection between the public cloud and On-Premises data centers. When our team started to migrate our services to Amazon cloud, we were facing the same issue of connecting our services from AWS back to our On-Premises data center. In this blog, we describe how we solved this issue and built high-availability software VPN tunnels between AWS and our On-Premises Data Center. We also open sourced our [ha-openvpn-tunnel](https://github.com/keweilu/ha-openvpn-tunnel) project on GitHub which uses terraform to deploy high-availability OpenVPN tunnels.

In general, there are two ways to build the connection: [AWS direct connect](https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html) and VPN tunnels. AWS direct connect allows you to directly connect your internal network to one of the AWS direct connect locations. Direct connect uses a standard 1-gigabit or 10-gigabit ethernet fiber-optic cable to connect your local router to an AWS direct connect router. Direct connect is more secure and can provide better performance over other VPN options.  As my team was one of the early adopters we moved our services to AWS prior to GoDaddy’s direct connect being set up.  This allows GoDaddy to get experience developing and operating on AWS while a more formalized on boarding process was developed that offered a direct connect, details [here](https://www.youtube.com/watch?v=wskODdCBvYc&feature=youtu.be).  Our team has now been onboarded via this process using GoDaddy’s direct connect, however we wanted to share our experience of building and running a [ha-openvpn-tunnel](https://github.com/keweilu/ha-openvpn-tunnel) as it is a solid solution for those that are in the same position we were or don’t have a direct connect.

## High Level Architecture Design

![OpenVPN High-Level Architecture](/assets/images/ha-openvpn/openvpn-arch.png)

To configure a high-availability OpenVPN server on AWS, we used the Active-Passive HA configuration. We set up two OpenVPN servers, one primary and one secondary. We ran them simultaneously on two container instances/EC2 instances in the ECS cluster. Each container instance belonged to an auto-scaling group with a desired count 1. For each auto-scaling group, there was a dedicated auto-scaling launch configuration associated with it. In the launch configuration, we copied the OpenVPN server certs from an S3 bucket to the instance. Also, we assigned an Elastic IP to the container instance to make sure its IP address is persistent after reboot. Then, we connected each OpenVPN Server to an OpenVPN client set up on a GoDaddy VM. This gave us two OpenVPN tunnels.

To facilitate the OpenVPN server and client setup, we also created server and client side docker images. We pushed the images to the docker registry. Then, we could set up the server or client by pulling and running the docker images.  

During any time, only one OpenVPN server (Primary OpenVPN Server) is actively being used. All traffic from AWS to the On-Premises data centers will go through that OpenVPN server. We have a CloudWatch rule defined for AWS ECS task state change event. Based on the event received, the rule will trigger a lambda function to update the route table and promote the secondary server as the primary server if the primary OpenVPN server is down. The figure below shows one such event.

![Route Table Update Event](/assets/images/ha-openvpn/openvpn-route.png)

## Auto-Recovery and Monitor

In the current setup, on the server side, we use AWS auto-scaling with desired count 1. In case of failure on the server side, e.g. the container instance stopped, it will auto recover from failure. On the client side, we do not have any auto recovery scheme and it needs a manual fix in the event of failure. One thing to note here is that we have the primary and secondary tunnels. If the primary tunnel has a problem due to the client failure, we could update the route table to use the secondary tunnel. Then, the on-call engineers can take the time to inspect the OpenVPN client failure without pressure.

Then, we would need monitors to help us to discover any OpenVPN connection failure as soon as it happens. To do this, there is a cron job running on each ECS container instance. It pings one of our internal services at GoDaddy, and then it publishes the status metric to CloudWatch.

![OpenVPN Status](/assets/images/ha-openvpn/openvpn-Status.png)

We configured a CloudWatch alarm for each OpenVPN status metric. Once the alarm is triggered, it will send alerts to our slack channel and on-call engineers can take actions to inspect:

![OpenVPN Alarms](/assets/images/ha-openvpn/openvpn-alarm.png)

## Conclusion

We hope the blog post gives you a high-level idea of our HA solution to build VPN tunnels between your On-Premises data center and public cloud. You can check out our [ha-openvpn-tunnel](https://github.com/keweilu/ha-openvpn-tunnel) project on GitHub, it includes terraform scripts so you can deploy and use it with a few commands.


Photo credit: [Tunnel](https://www.flickr.com/photos/strocchi/44643371845/in/photolist-2b1YX6F-agRBhu-dTC4mM-4sBZoN-WdNarj-4An7ZH-WBskt6-Xg4L1z-7TZupu-2bey7j8-agNQ7p-mXnr5-vVvXe-4GLRB-4f7AHH-3pDsd-k1nH-mDNJcB-Ck4Wu-bnhy4X-YQkYNY-bXqJed-n2GyD-8cidDf-9GLeA4-7XecqJ-p5UNPD-4CmFaP-2RRKM-3Qkiu-6kvCnd-2eyyX-o9nKxC-C7gZ-4DddUh-kjzk-unXV-23uNbN-prWEje-2FFegW-8XmxC-7QTthc-4NnYxH-8cVYDQ-qdV5-UkARf-51BWBJ-foNv1M-unXM-rc1a) by [Enrico Strocchi](https://www.flickr.com/photos/strocchi/) on [Flickr](https://www.flickr.com/photos)
