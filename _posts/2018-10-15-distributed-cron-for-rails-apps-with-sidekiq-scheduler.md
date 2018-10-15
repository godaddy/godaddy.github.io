---
layout: post
title: "Distributed cron for Rails apps with Sidekiq Scheduler"
date: 2018-10-15 12:00:00 -0800
cover: /assets/images/sidekiq_scheduler.png
excerpt: In some of our Ruby on Rails applications, we have migrated from using OS based cron to distributed cron using Sidekiq Scheduler. We will discuss the motivation for this change and the benefits from it.
options:
  - full-bleed-cover
authors:
  - name: Dalibor Nasevic
    url: https://dalibornasevic.com
    photo: https://avatars.githubusercontent.com/dalibor
---

We are heavy users of [Sidekiq](https://github.com/mperham/sidekiq). Sidekiq is a Ruby background jobs processing library that uses Redis for storage and is widely used in Ruby on Rails applications. It has a nice ecosystem that allows extending its functionality with plugins.

One such plugin that helped us run distributed cron, reduce maintenance costs and simplify our deployments is [Sidekiq Scheduler](https://github.com/moove-it/sidekiq-scheduler). We will discuss the motivation for migrating from OS based cron to distributed cron using Sidekiq Scheduler and the benefits we get from it.

## Our deployment setup

We maintain some legacy Ruby on Rails applications along with new Ruby on Rails microservices. We build our new microservices with the [public cloud](/2018/06/28/amazon-eks/) in mind and deploy them on [Kubernetes](https://kubernetes.io/). We deploy our legacy applications with [Capistrano](https://github.com/capistrano/capistrano) while we work on migrating them to the public cloud. We landed on a strategy for deploying cron jobs that works well for us in both scenarios.

With our standard Capistrano deploys, we deploy an application to web servers that handle web requests and to worker servers that process background jobs.

The web servers deploy is consistent and all running processes are [Phusion Passenger](https://www.phusionpassenger.com/) instances. The workers deploy is more complex. Besides deploying the Sidekiq processes, it deploys cron jobs to a specific worker server and depending on the application it might deploy other stand-alone runner processes to specific worker servers.

## What are the main problems with this setup?

There are two main problems with this setup that we want to resolve:

1. Single point of failure

   The crons and the runner procesess are each deployed to a specific server respectively. In case of an issue like a network or out of memory incident, we risk having a partial failure in how the service operates.

2. Running tasks twice at the same time

   If a cron job needs to run frequently and it has a long processing time, there is nothing to prevent an overlap with the next cron schedule. With experimental canary deploys, human error is possible too, that could result in deploying the crons or the runner process to more than one server.

## Distributed cron with Sidekiq Scheduler

Let's first start with a brief introduction to how Sidekiq Scheduler works and then we will discuss its benefits over OS based cron jobs and look at some of the alternatives.

[Sidekiq Scheduler](https://github.com/moove-it/sidekiq-scheduler) is a lightweight job scheduling extension for Sidekiq. It uses [Rufus Scheduler](https://github.com/jmettraux/rufus-scheduler) under the hood, that is itself an in-memory scheduler.

Sidekiq Scheduler extends Sidekiq by starting a Rufus Scheduler thread in the same process, loading and maintaining the schedules for it. By starting Sidekiq Scheduler in all Sidekiq processes distributed on all hosts we get a distibuted cron solution that resolves the single point of failure issue.

Running Sidekiq Scheduler on multiple hosts could have some [issues](https://github.com/moove-it/sidekiq-scheduler#notes-about-running-on-multiple-hosts). Although, we exclusively use the `cron` type of schedules, we still couple the cron jobs in Sidekiq Scheduler with using a Sidekiq plugin for unique jobs. That covers the uniqueness goal and also guarantees that no duplicate cron jobs run at the same time until the cron job finishes with success.

Each Sidekiq process running Sidekiq Scheduler will first try to register the cron job to get a lock and only then enqueue it. The increased load to Redis when every single process tries to get a lock is acceptable for us because Redis capacity allows for that.

## Configuring and using Sidekiq Scheduler

We have a custom config for Sidekiq Scheduler that allows for more control over sharing configs between environments. In an initializer, we require `sidekiq-scheduler` and its UI component and configure the Sidekiq server:

```ruby
# config/initializers/sidekiq.rb

require 'sidekiq'
require 'sidekiq/web'
require 'sidekiq-scheduler'
require 'sidekiq-scheduler/web'

Sidekiq.configure_server do |config|
  config.on(:startup) do
    SidekiqScheduler::Scheduler.instance.rufus_scheduler_options = { max_work_threads: 1 }
    Sidekiq.schedule = ConfigParser.parse(File.join(Rails.root, "config/sidekiq_scheduler.yml"), Rails.env)
    SidekiqScheduler::Scheduler.instance.reload_schedule!
  end
end
```

Rufus Scheduler starts [28 threads](https://github.com/moove-it/sidekiq-scheduler#notes-about-connection-pooling) by default. Because its job is only to enqueue Sidekiq jobs and Sidekiq workers will do the actual execution, we can decrease the `max_work_threads` to 1.

`ConfigParser.parse` is a small utility function that converts the YAML config to a hash:

```ruby
require 'yaml'
require 'erb'

class ConfigParser
  def self.parse(file, environment)
    YAML.load(ERB.new(IO.read(file)).result)[environment]
  end
end
```

Sidekiq Scheduler config looks like this:

```yaml
# config/sidekiq_scheduler.yml

default: &default
  active_mailings:
    class: ActiveMailingsWorker
    cron: '*/10 * * * * * America/Phoenix'
  scheduled_mailings:
    class: ScheduledMailingsWorker
    cron: '* * * * * America/Phoenix'

development:
  <<: *default

staging:
  <<: *default

production:
  <<: *default
```

Rufus Scheduler allows for seconds precision with an optional cron expression format consisting of a six fields time specifier where the first one is for the seconds. Per that config example, we specify a run of `ActiveMailingsWorker` every 10 seconds and a run of `ScheduledMailingsWorker` every minute.

By default, when no timezone is set with the cron string, it uses the Rails' configured timezone in `config/application.rb`. We have an option to change it if we need to.

The scheduled tasks are standard Sidekiq workers:

```ruby
class ActiveMailingsWorker
  include Sidekiq::Worker

  sidekiq_options queue: :cron, unique_for: 30.minutes

  def perform
  end
end
```

## Benefits of using Sidekiq Scheduler vs OS based cron jobs

There are some other benefits of using Sidekiq Scheduler vs OS based cron jobs that are worth discussing:

1. No process bootup wait time

   Each time OS based cron jobs run, it takes time for the process to bootup before it executes. Depending on the app size, it could take from seconds to minutes. That means the cron execution is always delayed. With Sidekiq Scheduler, it's an already running thread as part of the Sidekiq process and there are no bootup delays.

2. Seconds precision

   The most frequent an OS based cron job can run is minutes frequency. Because Rufus Scheduler runs in-memory it can schedule jobs every second.

3. Error monitoring

   When OS based cron jobs fail, we can log errors to log files and remember to check them later. With Sidekiq Scheduler, the cron jobs are normal Sidekiq jobs and the standard Sidekiq UI and application error monitoring mechanisms apply.

4. Consistency

   We can write `rake` tasks, custom scripts or rails runners and configure the OS based cron jobs to call them. While there are ways to test all these types of tasks, it's more consistent when we define cron jobs as normal Sidekiq workers.

5. Run it everywhere

   Cron jobs run as part of Sidekiq workers and that makes it easy to deploy cron jobs in different environments. From production, staging to running the cron jobs locally.

## Converting runner processes to Sidekiq Scheduler

Our runner processes are responsible for operations like booting up scheduled mailings, throttling operations or sending mailing batches. These tasks need to run more frequently than once a minute, which is the minimum frequency for OS based cron jobs.

Rufus Scheduler allows for seconds frequency and we can convert these runner processes into normal Sidekiq jobs scheduled and enqueued by Sidekiq Scheduler. With that we get a consistent workers deploy that is as simple as the apps deploy resulting in all running instances being Sidekiq workers.

## Look at some alternatives

- An alternative solution is using Sidekiq Enterprise feature for [Periodic Jobs](https://github.com/mperham/sidekiq/wiki/Ent-Periodic-Jobs). It has a standard crontab format that does not have seconds frequency and the [Leader Election](https://github.com/mperham/sidekiq/wiki/Ent-Leader-Election) feature can help implement a custom seconds frequency.

- [Sidekiq Cron](https://github.com/ondrejbartas/sidekiq-cron) is another valid alternative. It uses the internal Sidekiq's `Sidekiq::Poller` and has fewer dependencies, but also does not allow for seconds frequency.

- [Kubernetes Cron Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/) is another alternative when deploying to Kubernetes. It documents its [limitations](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#cron-job-limitations), long bootup process and no seconds frequency make it not ideal.

## Final thoughts

We have been running Sidekiq Scheduler in production for few months and it's working reliably. We use the `cron` type of schedules exclusively and we use a Sidekiq plugin for unique jobs that guard us against the [potential of duplicate jobs](https://github.com/moove-it/sidekiq-scheduler#notes-about-running-on-multiple-hosts).
