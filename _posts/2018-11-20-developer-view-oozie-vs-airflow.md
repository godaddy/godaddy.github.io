---
layout: post
title: "Data pipeline job scheduling in GoDaddy: Developer’s point of view on Oozie vs Airflow"
date: 2018-11-15 12:00:00 -0800
cover: /assets/images/time.png
excerpt: This blog discusses the pros and cons of Oozie and Airflow to help you choose which scheduler to use for your data pipeline jobs. 
         It also contains a sample plugin which implements the Airflow operator.
authors:
  - name: Anusha Buchireddygari
    url: https://www.linkedin.com/in/anushabuchireddygari/
    photo: /assets/images/anusha-buchireddygari.png
---

On the Data Platform team at GoDaddy we use both Oozie and Airflow for scheduling jobs. 
In the past we've found each tool to be useful for managing data pipelines but are migrating all of our jobs to Airflow because of the reasons discussed below. 
In this article, I'll give an overview of the pros and cons of using Oozie and Airflow to manage your data pipeline jobs.
To help you get started with pipeline scheduling tools I've included some sample plugin code to show how simple it is to modify or add functionality in Airflow.

### Why use scheduling tools (Oozie/Airflow) over Cron? ###

These tools (Oozie/Airflow) have many built-in functionalities compared to Cron.

These are some of the scenarios for which built-in code is available in the tools but not in cron:
* Automatically rerun jobs after failure.
* Add dependency checks; for example triggering a job if a file exists, or triggering one job after the completion of another.
* Trigger a job from a failure step.
* Cause the job to timeout when a dependency is not available.
* Add Standard Level Agreement (SLA) to jobs.

With cron, you have to write code for the above functionality, whereas Oozie and Airflow provide it.


### Oozie ###

Apache Oozie is a workflow scheduler which uses Directed Acyclic Graphs (DAG) to schedule Map Reduce Jobs (e.g. Pig, Hive, Sqoop, Distcp, Java functions). 
It’s an open source project written in Java (https://github.com/apache/Oozie).
When we develop Oozie jobs, we write bundle, coordinator, workflow, properties file. A workflow file is required whereas others are optional.
* The workflow file contains the actions needed to complete the job. Some of the common actions we use in our team are the Hive action to run hive scripts, ssh action, shell action, pig action and fs action for creating, moving, and removing files/folders
* The coordinator file is used for dependency checks to execute the workflow.
* The bundle file is used to launch multiple coordinators.
* The properties file contains configuration parameters like start date, end date and metastore configuration information for the job.

At GoDaddy, we use Hue UI for monitoring Oozie jobs.

* Pros:
    * Uses XML, which is easy to learn
    * Doesn't require learning a programming language
    * Retry on failure is available
    * Alerts on failure
    * SLA checks can be added

* Cons:
    * Less flexibility with actions and dependency, for example: Dependency check for partitions should be in MM, dd, YY format, if you have integer partitions in M or d, it’ll not work. 
    * Actions are limited to allowed actions in Oozie like fs action, pig action, hive action, ssh action and shell action.
    * All the code should be on HDFS for map reduce jobs.
    * Limited amount of data (2KB) can be passed from one action to another.
    * Supports time-based triggers but does not support event-based triggers. Can not automatically trigger dependent jobs. For example, if job B is dependent on job A, job B doesn't get triggered automatically when job A completes. The workaround is to trigger both jobs at the same time, and after completion of job A, write a success flag to a directory which is added as a dependency in coordinator for job B. You must also make sure job B has a large enough timeout to prevent it from being aborted before it runs.

### Airflow

Apache Airflow is another workflow scheduler which also uses DAGs.
It’s an open source project written in python (https://github.com/apache/Oozie).
Some of the features in Airflow are:
* Operators, which are job tasks similar to actions in Oozie.
* Hooks to connect to various databases.
* Sensors to check if a dependency exists, for example: If your job needs to trigger when a file exists then you have to use sensor which polls for the file.

At GoDaddy, Customer Knowledge Platform team is working on creating docker for Airflow, so other teams can develop and maintain their own Airflow scheduler.

* Pros:
    * The Airflow UI is much better than Hue (Oozie UI),for example: Airflow UI has a Tree view to track task failures unlike Hue, which tracks only job failure. 
    * The Airflow UI also lets you view your workflow code, which the Hue UI does not.
    * More flexibility in the code, you can write your own operator plugins and import them in the job.
    * Allows dynamic pipeline generation which means you could write code that instantiates a pipeline dynamically.
    * Contains both event-based trigger and time-based trigger. 
    Event based trigger is so easy to add in Airflow unlike Oozie. 
    Event based trigger is particularly useful with data quality checks. 
    Suppose you have a job to insert records into database but you want to verify whether an insert operation is successful so you would write a query to check record count is not zero. 
    In Airflow, you could add a data quality operator to run after insert is complete where as in Oozie, since it's time based, you could only specify time to trigger data quality job.
    * Lots of functionalities like retry, SLA checks, Slack notifications, all the functionalities in Oozie and more.
    * Disable jobs easily with an on/off button in WebUI whereas in Oozie you have to remember the jobid to pause or kill the job.
    

* Cons:
    * In 2018, Airflow code is still an incubator. There is large community working on the code.
    * Manually delete the filename from meta information if you change the filename.
    * You need to learn python programming language for scheduling jobs. 
    For Business analysts who don't have coding experience might find it hard to pick up writing Airflow jobs but once you get hang of it, it becomes easy.
    * When concurrency of the jobs increases, no new jobs will be scheduled. 
    Sometimes even though job is running, tasks are not running , this is due to number of jobs running at a time can affect new jobs scheduled. 
    This also causes confusion with Airflow UI because although your job is in run state, tasks are not in run state.

### What works for your Organization? (Oozie or Airflow)

Airflow has so many advantages and there are many companies moving to Airflow. 
There is an active community working on enhancements and bug fixes for Airflow.
A few things to remember when moving to Airflow:
* You have to take care of scalability using Celery/Mesos/Dask.
* You have to take care of file storage. When we download files to Airflow box we store in mount location on hadoop.

We are using Airflow jobs for file transfer between filesystems, data transfer between databases, ETL jobs etc.
We plan to move existing jobs on Oozie to Airflow.

##### Sample Airflow plugin

Unlike Oozie you can add new funtionality in Airflow easily if you know python programming.
Below I've written an example plugin that checks if a file exists on a remote server, and which could be used as an operator in an Airflow job.
Airflow polls for this file and if the file exists then sends the file name to next task using xcom_push().
We often append data file names with the date so here I've used glob() to check for a file pattern.

This python file is added to plugins folder in Airflow home directory:

```python
import os
import glob

from Airflow.plugins_manager import AirflowPlugin
from Airflow.utils.decorators import apply_defaults
from Airflow.operators.sensors import BaseSensorOperator


class FileSensorOperator(BaseSensorOperator):
    @apply_defaults
    def __init__(self, file_path, file_pattern, *args, **kwargs):
        super(FileSensorOperator, self).__init__(*args, **kwargs)
        self.file_path = file_path
        self.file_pattern = file_pattern
    
    # poke is standard method used in built-in operators
    def poke(self, context):
        file_location = self.file_path
        file_name= self.file_pattern

        for file in glob.glob(file_location + file_name):
            if os.path.exists(file):
                context['task_instance'].xcom_push('file_name', file_name)
                self.log.info('file exists')
                return True

        self.log.info('file not exists')
        return False

class FilePlugin(AirflowPlugin):
    name = 'file_plugin'
    operators = [FileSensorOperator]
```

###### Airflow DAG

The below code uses an Airflow DAGs (Directed Acyclic Graph) to demonstrate how we call the sample plugin implemented above. 
In this code the default arguments include details about the time interval, start date, and number of retries. 
You can add additional arguments to configure the DAG to send email on failure, for example.

The DAG is divided into 3 tasks.
* The first task is to call the sample plugin which checks for the file pattern in the path every 5 seconds and get the exact file name. 
* The second task is to write to the file.
* The third task is to archive the file.

```python
from datetime import datetime, timedelta
from Airflow.models import Variable
from Airflow import DAG
from Airflow.operators import PythonOperator, ArchiveFileOperator
from Airflow.operators.file_plugin import FileSensorOperator


default_args = {
    'owner': 'dag_developer',
    'start_date': datetime.now(),
    'provide_context': True,
    'retries': 2,
    'retry_delay': timedelta(seconds=30),
    'max_active_runs': 1,
    'schedule_interval': '30 18 * * *', #run everyday at 6:30 PM
}

dag = DAG('check_file_and_write_to_file', default_args=default_args)

file_path = Variable.get('source_path')
file_pattern = Variable.get('file_pattern')
archive_path = Variable.get('archive_path')

# Check fo the file pattern in the path, every 5 seconds. Send the exact file name to the next task(process_task)
sensor_task = FileSensorOperator(
    task_id='file_sensor',
    filepath=file_path,
    filepattern=file_pattern,
    poke_interval=5,
    dag=dag)

# Read the file name from the previous task(sensor_task). Write "Fun scheduling with Airflow" to the file
def process_file(**context):
    file_name = context['task_instance'].xcom_pull(
        key='file_name', task_ids='file_sensor')
    file = open(file_path + file_name, 'w')
    file.write('Fun scheduling with Airflow')
    file.close()

# Call python function which writes to file
proccess_task = PythonOperator(
    task_id='process_the_file', 
    python_callable=process_file,
    dag=dag)

# Archive file once write to file is complete
archive_task = ArchiveFileOperator(
    task_id='archive_file',
    filepath=file_path,
    archivepath=archive_path,
    dag=dag)
    
# This line tells the sequence of tasks called
sensor_task >> proccess_task >> archive_task  # ">>" is airflow operator used to indicate sequence of the workflow 
```

Our team has written similar plugins for data quality checks. Unlike Oozie, Airflow code allows code flexibility for tasks which makes development easy. If you're thinking about scaling your data pipeline jobs I'd recommend Airflow as a great place to get started.


Photo credit: [‘Time‘](https://www.flickr.com/photos/smemon/4961717384/in/photolist-8ys6Hs-8bHwZj-HMknRa-cALCvQ-biWKFi-SKekjx-9Cktks-WawY9F-27FxXxM-sbHMwc-6SUnx7-CdHNYT-HkyPUL-egY3ua-d3b4-qfFXBw-dPsJcG-n96Eb8-2aCmV45-9b5fnh-5r97iL-7xcstJ-dqTdUV-LYBzzN-bYY96-b3auhB-pEoeBm-8PLsEH-tEiSH-bEhhhM-HtVJ9U-7M65Ep-jFXZkr-bCM8hm-4H3vzx-bqNWr3-X9Sqi6-WX3EMe-4F4Yhq-9X4LVF-e3aNV2-8ZPjix-frLwC-s3MCyZ-21UgJD3-fa2HL6-s65ay3-MZkYN7-c1Cex7-9TKJ8s) by [Sean MacEntee](https://www.flickr.com/photos/smemon/) on [Flickr](https://www.flickr.com/photos)
