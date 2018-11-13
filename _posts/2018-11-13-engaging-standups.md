---
layout: post
title: "Engaging Standups"
date: 2018-11-13 12:00:00 -0800
cover: /assets/images/headers/coworking.jpg
excerpt: When team members become disengaged in standup, it can be easy to
  question the value of the ceremony. By committing to decrease siloing and help
  each other with blockers, a team can achieve a more healthy culture and become
  more engaged in each others' progress.
authors:
  - name: Conor Fellin
    url: https://github.com/cfellin1
    photo: /assets/images/conor-fellin.jpg
---

## Our Motivation

GoDaddy is a Scrum shop. Most teams exercise some sort of Scrum ceremonies as a part of their planning, and the company offers Agile Dojo sessions where teams can meet with an agile expert to iterate and improve upon their process. So like most agile teams (and many non-agile ones), my team performed "standup" status updates every morning. And our standups were beginning to fall into a rut.

The pattern looked something like this: each team member said what they did the day before and what they were planning on doing today. People almost never mentioned blockers. People almost never responded to other people's updates. The section at the end of the meeting for miscellaneous business, enigmatically named "parking lot," usually passed in silence. Within five minutes of its starting, standup would end and everyone would get back to the solitary work that really mattered.

As a new Scrum Master, I found the pattern perfectly adequate: people had an incentive to reflect daily on their progress, and the whole process barely increased the amount of time people had to spend in meetings. Then one day, I sent out a survey to the team asking how much value they got out of different Scrum ceremonies. Far and away the team found standup to be the least useful Scrum ceremony. More probingly, when asked what could improve about Scrum ceremonies, multiple people posed the same question: if standup is just a bunch of people giving status updates, why not just let people post their update on Slack?

It was a good question. After all, every meeting foisted a potentially wasteful context switch upon our engineers. If people could give updates on their own time, maybe it would free up more valuable coding time. When we discussed the results of the survey as a team, there were some people who expressed a personal preference for keeping standup meeting, but their reasons were generally nebulous or amounted to "because Scrum says so." So we decided to try doing standup over Slack for a single two-week sprint.

Admittedly, two weeks is not enough time to collect anything resembling a scientific verdict on something. Still, by the end of the trial sprint, team sentiment had shifted markedly away from the idea of doing standup over Slack. The engineers who had advocated for Slack standup did not think that their productivity had improved noticeably, and many other engineers had a sense that their work had been less focused over the course of the week.

It was clear that we needed to return to in-person standup. More importantly, we needed to return to a version of in-person standup that was more than just a bunch of engineers giving status updates for the record. We needed to figure out what exactly Scrum meant to accomplish by putting us in the same room once a day.

Below are a few techniques that we found helped improve our communication as a team.

## Siloing

If people are not interested in others' status updates, it may be a sign that the team is breaking into silos. Some specialization is fine, but in the case of a production incident (or someone winning the lottery and quitting) you need the whole team to have at least a shallow knowledge of all of the team's projects.

The risk of siloing increases for distributed teams, where the convenience of hallway conversations can encourage people to form informal sub-teams that share knowledge within themselves rather than with the team as a whole.  

There are plenty of ways to break team members out of their silos. To some extent, it should happen naturally if you are following the Scrum adage of focusing on one goal at a time. It's unlikely that a contributor will be able to stick with their pet code base if the team is collectively moving from one goal to another in order of priority.

Distributed teams should be aware of the downsides to in-person conversations that do not include all team members. Whenever they happen, one of the team members present should post in a team-wide channel to debrief the team on what was discussed.

Yet another way to keep contributors invested in each others' code is code reviews. Our team requires at least two code reviews for each PR, one from someone who is an "authority" on the codebase/technology and one from someone who is relatively new to that part of the codebase. In addition to having a fresh perspective that helps them find non-intuitive code, the less experienced reviewer will gain knowledge of the code base and grow to being a more well-rounded contributor to the team.

## Blockers

In my team's attempt to improve our standups, we sought out the opinions of more experienced Scrum Masters. One of the things they said consistently was that blockers were central to the purpose of standup. If someone surfaces a blocker, people should drop what they are doing to help the person with the blocker. If the team goes out of its way to help people who are surfacing blockers, more people will feel motivated to share their blockers at standup.

(Additionally, team members will absolutely not share blockers if they fear that they will be looked down upon for hitting roadblocks in their development process. Teams must work to develop an emotionally safe environment.)

This is all probably right, but it raises a question: how do you jumpstart the process if no one is surfacing blockers to start with?

Surfacing blockers is hard. If you go straight into standup without any prep, you are probably still immersed in whatever you just did. Maybe you were blocked the moment standup started, but the odds are pretty good you were doing something where you felt like you were making progress. You will think about the work you did yesterday while you are preparing your update, but you may also find it pretty easy to forget about road blocks that are on the back burner.

So how do you as an individual become good at identifying and surfacing blockers at standup? Practice! During the day, interrupt yourself to see if anything has happened recently that could be a blocker. Make notes that you can reference at future stand-ups.

## Mechanical Considerations

There are also smaller mechanical ways to improve engagement at standup.

* Get everyone in one room. If the team is spread across multiple offices, at least experiment with putting everyone in the same office in one room. This may not be particularly helpful if there's only one or two people in an office, but it's worth trying.
* Have a visual prompt for people to look at when talking about their progress. Issue tracking software like Jira is excellent for this. (It also has the side-effect of making it easier to notice when someone is going down a rabbit hole that diverges from the team's priorities.) The visual prompt can also include the team's sprint goal. Thus contributors have a reference point to contextualize their progress as well as that of their teammates.

## Conclusion

Though there are some simple fixes you can make to improve your team's standup process, the greatest gains will come from working on your collaboration outside of standup. You need:

* Well-rounded contributors who are invested enough in their teammates' work to care about what they have to say
* An environment where contributors will respond to blockers by offering support
* Engineers that are actively reflecting upon their work habits to identify blockers and other pain points

If the team performs on these levels, then contributors will find more value in their teammates' updates and will also find that their own updates are more valuable to the team as a whole. Standup becomes a dialog rather than a black box into which people dump status reports.
