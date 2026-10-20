# Fitness app discovery questionnaire

Use this to describe the product before we choose an architecture or start implementation. Detailed answers are welcome. Skip anything you cannot answer yet; write “not sure” where you want me to research or recommend an option. Correct any starting note below that no longer fits.

You can answer directly in this document, or copy it into a reply. For choices, explain why where that would help. Mark especially important answers **MUST** and lower-priority ideas **LATER**.

## Starting notes from your earlier answers

These are working notes, not locked decisions. Correct or expand them in your answers.

- Intended use: personal activity logging and progress history.
- Priorities: privacy, ongoing costs close to zero, offline use, and dependable recovery.
- Initial phone platform: Android.
- Candidate first activity: strength training.
- Essential strength entry details: exercise, sets, reps, and weight.
- Offline expectation: create logs and view saved history without a connection.
- Progress direction: per-exercise trends; the exact trend is still to be specified.
- Recovery direction: automatic backup or sync is preferred; acceptable storage and account model are still to be specified.
- Product direction to explore: web-first and excellent on a phone. Product name and architecture remain open.

note: everytime I leave and answer like "-" that means I do not have an appropriate answer, or that I think I have provided already earlier or later in the document.
for most "-" type answers, i want you to come up with a solution, and ask me to tweak it or approve it.

## 1. Purpose, audience, and boundaries

1. In your own words, what problem do you want this app to solve for you?
a unified interface for a number of things. logging one's workout activity, accessing past data, seeing predictions about where one can expect their strength/reps/sets/stamina progress to be based on real studies. also for logging calories in a day, keeping track of the nutrients that one ends up having in a day based on the food entered. the logging part I also want to be fairly simple, specially designed UI elements that offer convenient elements like pre-saved workouts, conventional ones (like warmup set 70% of max, first set 85, then 90, then 100, exercise over). and even customizible "elements" like a 5% increase for every set until 100%. Also a way to remember what preset let to failure too early last time or didn't at all, and suggested adjustments based on that. Note, i understand that this sounds elaborate, but I want all of this in a nice-looking, extremely minmal, card-style UI element. NO extensive data loading, reducing that friction is the whole point. I also want it to send appropriate notifications (based on real psychological research that maximised the user's likelines to respond positively) (about missing meal log, missed workout, encouragement, appreciation, predictions [like, Avik, you are on track to hitting a 100kg bench in 3.4 weeks!] and even workout design based on that using AI and real data.); I would also like to include intelligent workout planning based on real limitations. Like, if the user wants to hit a 100 bench, but can only have 70g protein in a day, the app should account for that, push the timeline along, and reccoment restdays or cardio in between, or something. I of course also want tracking of the body fat, the measurements, and more. I also want a calendered photo vault, which can record visual progress. I also wanna make this app kind of addictive and gamified the way strava sort of does. I also want a feature where it can just log my data if I can just give it a quick voice prompt. Like, if I give it a voice prompt which I keep on updating throughout the workout after every set or something, then I want it to recognize what I said, have a preference based confirmation screen to see whether it got all of that correct (and have editable, text elements, and clickable Up or Down UI elements to make minor adjustments in that confirmation screen). I would also like workout anlytics like "Your 2nd best bench ever, your best lat raise ever, your fastest KM ever" and also "based on the data, your average effort is consistent with last week, which is in line with the optimal figure based on data" or even "we are currently a little bit faster than pace to hit a 100 bench. Next big thing is a rest day well spent" or even "you are eating significantly less calories than you should be". I also want some level of it 'learning' the foods that you can and cannot normally have. I also wanna measure calories burned per workout etc.

2. What do you do today to record workouts or judge whether you are making progress? What is frustrating, missing, or unreliable about that process?
I do essentially nothing. I sometimes even forget what I last lifted in the Gym, so some days I dont even make the progress I could be making which is for sure inefficient. Whats frustrating is that everytime I realise I am being inefficient in my workouts, it is too late and I am already mid workout. If i had a thing which could as little friction as possible serve like not only a hub of research based knowledge about working out in general, but also my past workouts and much more, that would be ideal. 

3. Is this strictly for your own use, or might a partner, coach, family member, or other person use it too? Describe each person's role if relevant.
mostly for my use. perhaps for a few other useers like me. build some, not a lot, of scallability into the project.

4. What would make you say, six months after starting, “this app is worth keeping”?
if all the data it has been collecting all this time is offering real predictions, which are close to accurate, is giving me insights about my motivation, dedication, my response to certain types of workout routines, the trends of certain measurements of my body (both physical and abstract) over time, and more. 

5. What should the app deliberately avoid becoming (for example, a social network, a coach, a meal tracker, or a general health dashboard)?
anything that is tedious...

6. Should the app make recommendations, or should it mainly record and summarize what you enter? Where is the boundary?
yes to the reccomendations, but in the way described in 1. the boundary can be that the app should never provide friction to the user. the app may provide feedback about a certain workout after a workout has ended as part of analytics or something, but never during the workout  would it tell the user that doing another chest day thsi week is "suboptimal", the user should feel a minimum of dissonance or tension from the app itself. 

7. Are there products or apps whose interaction style, strengths, or shortcomings you want us to learn from? What specifically?
-
   
8. Is “FitnessOS” an acceptable working name, or should the name stay undecided for now?
Let the name by undecided, with a strongish preference for FitnessOS

## 2. The first useful release

9. Describe the single end-to-end task that V1 must make easy, from opening the app to seeing a useful result.
Logging
10. How often do you expect to use that workflow: every workout, several times a week, occasionally, or another pattern?
every workout, which could be the gym, running, tennis, football, walking, cycling, or other common sports. i understand that it is very hard to integrate sport data, so maybe we can only have sport mode if there is a constant flow of input data like "heart rate, etc" at 30 second intervals from like a smart band. that way we can measure what the sport is doing and what its like. 
11. What is the smallest version that would still be genuinely useful to you?
logging and history i suppose. with some primitive level of insights and trends. 
12. What must be included on the first day, and what can wait until you have used it for a while?
no idea, you suggest. everything I have described seems really important for my vision for the app.
13. Which ideas are explicitly out of scope for the first release?
the sports i suppose. again, no idea.
14. Do you expect to enter past workouts when you start using the app? If yes, roughly how much history and how will you enter it?
entering past workouts can be an option, the app will take as many as the user would like to enter. 
15. Should the first release support strength training only, or is there another activity that must be present from the start?
the first release can be training only.

## 3. How a strength workout is recorded

16. Describe a normal strength workout from beginning to end. Include how you move between exercises and sets.
Few stretches based on which muscle group i am workout out that day. Warmup with dumbbells for joints. 4-5 exercises based on the "day" i am hitting. Each exercise: 3-4 sets of 8-12 reps. Rarely: 3 sets of failure which could get upto 20 reps or more. Normally, the first set is like 80% of max, and then i increment if I feel enough strength in me. 
17. Do you want to start a workout timer/session, or should logging work as quick entries that can be assembled into a workout?
the latter for sure
18. Should a workout have a title, date, start/end time, duration, location, or any other session-level details?
Yes, and these should be editable, but should mostly be user decided with a little icon to signal that "hey, u can change the name or star this one if u want" 
19. What is a “set” in your usage? Do you need warm-up sets, working sets, drop sets, supersets, circuits, or other set types?
warmup sets should be a pre-selected, disable-able option. yes, i want the option for the rest as well. just use common supersets, circuits, and more, and add a menu outside the normal workout to add custom ones. 
20. For each set, which values are required and which are optional: reps, weight, distance, duration, effort/RPE, rest time, notes, or something else?
-

21. How do you record bodyweight exercises, assisted exercises, band resistance, or exercises where load is not a simple weight value?
%age body weight is pretty good. otherwise, if there are multiple ways, use the most popular 2-3 ways as options of recording the same.

22. Do you use dumbbells or other equipment where the entered weight could mean per hand, total load, machine setting, or another convention? Explain the conventions you need.
on the entry screen, just specify things like per hand, total weight, and more, so that the user knows what to enter. minimizing friction is the goal. for the voice prompt workout entering, just have a confirmations screen like if the user says "i did dumbbell presses with 25s" first infer that they likely mean 25kg dumbbells each hand, and then proceed. 

23. Which units do you use for weight (kg, lb, both)? Should the app remember a preferred unit, allow switching, or convert existing entries for display?
the app should remember a preferred unit. in general KG is better.

24. Do you want to record partial reps, timed holds, distance, side (left/right), or unilateral work differently?
no. it kills standardization in the name of detail, even though standardized data does a good enough job. there would also be friction in entering this kind of data.

25. Do you want to record rest between sets? If yes, should it be typed, timed, or both?
timed by default, editable. 

26. Should the app calculate anything while logging, such as total reps, volume, best set, or an estimated one-rep maximum? Which calculations do you trust and want shown?
-

27. What should happen when you edit or delete a workout, exercise, or set? Do you need undo or a deletion recovery period?
yeah lets keep a week-long undo period

28. Do you want notes at the workout level, exercise level, set level, or not at all? What would you write in them?
workout level, where we can perhaps request more notes at a more detailed level.

29. Do you need photos, attachments, voice input, or other media in workout logs?
described before, nothing more than that. 

30. How important is very fast entry during a workout? What actions should take one tap, and what can take more time?
it is very important. at minimum, entering a whole exercise should take one tap. after the app has "learned" the user, the average taps to log an entire workout should not take more than 7 taps assuming theyve saved workouts from the past, etc. and assuming 4-5 exercises of 3-4 sets of 8=12 reps. 

## 4. Exercises, routines, and setup

31. Should the app provide an exercise catalog, let you create your own exercises, or both?
both
32. If there is a catalog, what details are useful: muscle group, equipment, movement pattern, instructions, or something else?
muscle group, movement pattern
33. How should you find an exercise during logging: search, recent exercises, favorites, a custom list, browsing categories, or a combination?
favorites, a custom list, search, recent. in that priority order
34. Do you use alternate names for exercises? How should the app handle spelling differences or renamed exercises in old logs?
a simple prompt asking "would you like me to rename all previous exercises with this name?" spelling difference can just throw an exception or ask for a reentry
35. Should each exercise have a stable identity across sessions so its history and trends remain connected? Are there cases where two similar variations should be tracked separately?
yes. yes.
36. Do you want saved routines or workout templates? If yes, describe how you would create, start, change, and reuse one.
yes, they would be made outside the app in a seperate creation menu that would be accessible froma few other convenient UI spots. 
37. Should the app suggest the previous workout's sets and weights when you repeat an exercise? Should that be optional?
somewhat. not exactly this, but based on the predictions that it is making of the future progress based on current rest, weights, calories, protein, sodium, and more. ask me what to include in this list.
38. Do you need planned workouts or goals, or is recording completed activity enough for V1?
for JUST v1 recording is fine. but i need it the rest very soon.
39. How should the app behave when your exercise list or routine changes: preserve old records exactly, update names everywhere, or ask you?
To ask is the best options.

## 5. History and progress

40. After saving a workout, what should you see to feel confident that it was recorded correctly?
a lovely little animation, perhaps
41. What should the home screen show when you open the app: start logging, resume a workout, recent history, a trend, or something else?
all of these, in a clean, minimal sort of output like Notion has.
42. Describe the history view you would actually use. What should each row or card show, and how would you browse older entries?
a calender UI, where each date that is coloured or highlighted means one or more recorded workouts, and can be clicked to expand.
43. Which trend did you have in mind for each exercise? For example: heaviest weight, reps at a given weight, total volume, best set, exercise frequency, or progress across load and reps together.
whichever is most representative of average progress. make this switchable using a dropdown. perhaps something that measures closeness to failure or hypertrophe achieved (with the most apt scaling like it could be logarithmic or something)
45. How do you define “volume” if you want it: weight × reps per set, summed across sets, or another convention? Should warm-up sets count?
-
46. Should a trend compare all sets, only working sets, the best set, or a specific set scheme? How would that make comparisons fair when workouts differ?
all sets for the zoomed in view, the best set for zoomed out (across a month or a week) view
47. Would a workout-by-workout chart, a table, a personal-record list, or a simple text summary be most helpful? Describe the view you prefer.
a chart/graph when expanding the calender view, with a segment of a text summary at the bottom. kind of like strava. 
48. What time ranges should be easy to select (for example, recent weeks, a year, or all time)?
recent week, month, 3 months, year
49. Do you need filters for exercise, date, routine, location, or other details?
-
50. Which comparisons would be useful: last session, a selected date range, a personal best, or a moving average?
a moving average would be the best. at the zoomed in level perhaps last session, but this will not be the main unit of account
51. What should count as a personal record? Should records be calculated automatically, and should you be able to correct them?
be maximalist. heaviest weight works. highest volume works. in fact, any data that would keep the user motivated would work.
52. How should the app communicate missing or incomparable data, such as a changed unit, exercise variation, or a set with no weight?
with a pop-up UI prompt that needs prompts the user to fix whatever is necessary or allow the app to discard it. 
53. What feedback would feel honest and useful? What wording, scores, streaks, rankings, or claims would feel misleading or pressuring?
whatever can be grounded in science would be most honest and useful, with an optimistic tone. 
54. Do you want goals, reminders, streaks, achievements, or summaries? For each one, say whether it is useful, optional, or unwanted.
useful, useful, optional, useful, useful

## 6. Offline use and saving behavior

54. Confirm what must work with no internet: opening the app, starting a workout, saving sets, editing entries, viewing history, viewing trends, searching exercises, exporting data, or something else.
opening, starting a workout, saving sets, editing entries, viewing history (upto a month), viewing trends (based on data stores locally). basic food and nutrition data as well. notification system too. 
55. How long might you be offline, and where does that typically happen?
no more than 7-8 should a user be offline, and that too completely unrelated to the app, like say theyre travelling or something. I am never really offline other than elevator rides in life, so thats 3 mins max. 
56. Should an unfinished workout survive closing the app, a phone restart, or the browser/app being terminated? Which cases must be supported?
closing the app/tab being closed. 
57. What confirmation should appear after a save so you know the information is safely stored?
an animation
58. If saving fails or storage is full, what should the app show and preserve? Is retrying with the entered data enough, or do you need another recovery path?
perhaps there could be space in thed drive that the app has "claimed but is not necessarily using" so that exception should only come about when the app has to expand the part it has claimed. 
59. If edits happen on more than one device while offline, what should happen when those devices reconnect? If you expect to use one phone only, say so.
the most recent edit should be counted. a warning should be thrown to the user about which one was counted. most warnings can be thrown under a seperate notifications section. 
60. Is it acceptable for trends to be calculated only from data already on the device, or must they remain available during a long outage across devices?
the local data (past month) can contribute to local calculations but ideally trends that live on the cloud or something should be across all devices. and in any case, the local data is mostly just a safeguard (also because data isn't that expensive to store at least for this app.) most data should be online anyway.

## 7. Privacy, accounts, sync, and recovery

61. What information in these records would you consider sensitive? Are there any fields the app must never collect?
-
62. Is it acceptable for workout records to leave your phone for backup or sync? If yes, under what conditions?
yes as long as it is in a protected, encrypted space. user consent will be asked for as onboarding
63. Which storage options are acceptable: a file in your Google Drive, another cloud storage provider, an app-managed service, your own server, or phone-only storage? Rank or explain them.
-
64. Would you accept signing in with a Google account? Would you accept creating a separate account with the app? Why or why not?
yes, would, convenicnce, industry standard, and more.
65. Is the main need to restore the same phone after a failure, move to a replacement phone, or keep multiple devices in sync? Rank these needs.
not sure what ur asking.
66. How automatic should backup be: after every change, daily, when charging/on Wi-Fi, or another schedule? Should the app show last successful backup time and alert you when backups stop?
scheduled time everyday seems fine. either that or in 4-hour checks if any data isnt backed up. 
67. Should backups be encrypted so only you can read their contents? What trade-offs in convenience or recovery would you accept for that?
i am not sure which tradeoffs could be caused, so i cannot tell. let me know. (you can put this, and other similar promos in a file called followups.md and we can do the same exercise for that one.)
68. How many previous backup versions should be kept, and for how long? Should accidental edits/deletions be recoverable from an older copy?
Yes they should, the backup should function like a growing collection of all-time data. 
69. What should restore look like? Should it preview the backup and require confirmation before replacing or combining records?
Yes absolutely. You can of course restore parts of the data, but that would require some fiddling with the app. Otherwise, the main way to restore would be to simply load the older databse. We can add an option of "cacheing" all the logged data after a certain date for a certain exercise, and then we can load the old DB, and then implement the cache on that DB. so that can be a nice custom fitting thing.
70. Do you want to export all data in a readable format (CSV/JSON or similar), and should export include notes, routines, and exercise definitions?
-
71. Should deleting an item remove it immediately, allow an undo window, or keep it in a recoverable archive?
an allow window as defined previously
72. Are analytics, crash reports, advertising, or third-party tracking acceptable? If any are, what limits should apply?
-

## 8. Phone experience and accessibility

73. What Android phone model and Android version do you currently use, if known? What screen size or device changes should we account for?
currently i use a OnePlus 11R with android 16 and oxygenos 16
74. Which browser do you use most? Would you be comfortable installing the app from the browser as a PWA, or do you expect an app-store install?
on my windows laptop, i use Arc, i think if we optimize for Chrome that will be fine. on my phone i use chrome. i'd like a proper app on my phone, since i think that will be a better experience. 
75. What does “runs super well on my phone” mean to you? Describe the interactions that should feel immediate, comfortable, and reliable.
is responsive. is lightweight. uses haptics. has nice sounds and feels intentionally designed. looks beautiful. no UI hitches or ratio errors or whatevers. is easily switchable between apps like the calculator and whatnot. does not use too much battery. can integrate the mic, the camera, even the location services (to geotag workouts and photos maybe). can be integrated with strava (this is a veryyy far into the future feature.)
76. How important are one-handed use, large tap targets, portrait/landscape support, dark mode, and use with sweaty hands?
keep it portrait only.  darkmode should be the normal medium. sweaty hands should be padded for. small icons is basically a big no no. 
77. Do you use larger text, screen readers, voice control, high contrast, or other accessibility settings that the app should support?
not really
78. Should the app work with the screen locked or in the background? Which actions need that capability?
things like the notification service to send it at an optimized time would. suggest more things that might be like this in follwups.md
79. Do you need notifications, vibration, sound, widgets, or home-screen shortcuts? What should they do, and how often may they interrupt you?
yes, widgets for adding meals, starting workouts, recording an exercise, to continue/resume recording a voice prompt. 
80. Does the app need camera, location, health-platform, wearable, Bluetooth, or other Android features? Explain the concrete task each feature would support.
-
81. What response times would feel acceptable for app launch, opening history, saving a set, and switching between exercises?
app launch can take a few seconds, but no more than 3 seconds. saving a set can take 2 seconds. navigating the app should be as instant as possible. 
82. What should we test on your actual phone before calling the first release usable? List any non-negotiable scenarios.
-

## 9. Web-first architecture and maintenance

83. What matters most when choosing between an installable web app, a web app with a small Android wrapper, and a shared web/native codebase?
the app has to be built in python. for android my professor has told me research kivy and beeware.
84. Which Android capabilities are essential enough that a browser-based app might not be sufficient?
not sure. you tell me, i've described the app pretty well so far
85. How would you rank these trade-offs: offline reliability, phone interaction quality, local data durability, automatic backup, simple deployment, low maintenance, and minimal cost?
in the order of "this matters the most to the app" to "the least": minimal cost, phone interaction quality, local data durability, offline reliability, low maintenance, simple deployment     
86. Do you have experience or preferences for languages, frameworks, databases, hosting providers, or tools? Which technologies would you prefer to avoid?
just python, suggest the rest. as much of this project as possible has to be python.
87. Will you maintain this alone with AI assistance? How much time are you comfortable spending on maintenance and troubleshooting?
yes. not too much, but a 3-4 hours a week is fine.
88. What ongoing cost is acceptable per month and per year? Is a small cost acceptable if it substantially improves recovery or reliability?
To be honest, no. If necessary, tell me, or if strongly suggested, else no. 
89. Are you comfortable with a service that requires internet for account access or backup setup, as long as logging remains offline-capable?
Yeah, comfortable
90. How should app updates work: install automatically when online, ask first, or follow another approach? How important is using the app while an update is pending?
ask for consent to automatically install, then implement. usage of the upp while updating is not too important, the update can simply be done between workouts. 
91. Would you want to publish through an app store, install privately, or decide after a phone prototype?
probably a private installation is best. if play store is possible, that's awesome, it will make it possible to launch this as a product.

## 10. Acceptance criteria and priorities

92. Write a concrete example of a successful workout logging session, step by step. Include the information entered and what the app shows at the end.
there is variability in this, all the details I have already described. 
93. Write a concrete example of finding and understanding an exercise trend from old logs.
the graph/bar chart simply shows you. increases can be green and decreases red. or like, standard deviation greater than a certain type can be red, or green, depending on context. other colours can also be used. 
94. Write a concrete example of using the app offline, then reconnecting. What should happen at each step?
the reconnection (and the backup) should simply happen in the background.
95. Write a concrete example of replacing your phone and restoring your records. What would convince you the restore worked?
having a dashboard that has a similar look to before would convince me. the record restoration would simply be downloading the old data point, and implementing it.
96. What failures would make you stop trusting the app immediately?
data stops being what I saved it as. the advice/analysis sounds too geenric. the app (or intelligent element inside the app) is not able to cite the studies it is using for predictions. 
97. Which requirements are absolute **MUST** items for V1? Which are **SHOULD**, **COULD**, and explicitly **NOT NOW**?
-
98. What is the simplest real-phone experiment that would give you confidence in the web-first direction before we build broadly?
if I do 5 workouts with the app, each time taking note of frictions, by the end of the 5th workout, i'll have a good amount of trust in the app. 
99.  What evidence would make you choose a native wrapper or a native app instead of a PWA?
-
100. What should we measure or observe during a prototype to decide whether the experience is fast and low-friction enough?
described in 98. its just straight up a real user test. 

## 11. Anything else

101. What important question have I not asked?
-
102. What assumption in this questionnaire seems wrong or too narrow?
-
103. Is there any relevant constraint, risk, or personal preference I should know before proposing the first release and architecture options?
-


## Quick summary to fill in after the detailed answers

- The app is for:
- The main problem it solves:
- The V1 workflow:
- Activities included in V1:
- Required workout fields:
- The most useful history/trend:
- What must work offline:
- Backup/sync approach and acceptable provider:
- Android device/browser:
- Monthly/yearly cost ceiling:
- Explicitly out of scope:
- The first real-phone experiment:

not solving this man.