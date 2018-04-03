---
layout: post
title:  "Introducing a fully extendable eslint plugin for JSON i18n translation files"
date:   2018-04-02 11:16:01 -0800
cover: https://raw.githubusercontent.com/godaddy/eslint-plugin-i18n-json/master/assets/logo-transparent.png
excerpt: Many web apps harness internationalization through frameworks such as React-Intl. This is awesome for the web and helps web apps obtain a global reach.
authors:
  - name: Mayank Jethva
    url: https://github.com/mayank23
    photo: https://avatars0.githubusercontent.com/u/1103708?s=460&v=4
---
 
Many web apps harness internationalization through frameworks such as React-Intl. This is awesome for the web and helps web apps obtain a global reach. 🗺
 
However, as translators or application developers add and remove messages, or create additional translation files to support new locales, the chance of having a malformed translation file increases. 
 
Manually verifying updates is error-prone, because it's tedious to inspect large translation files and there are many sources of issues. For example, it's easy for a developer or translator to inadvertently introduce file formatting syntax errors (e.g. JSON), malformed or missing message keys, or invalid message syntax (e.g. Format.js / ICU Message Format). If you use JSON as your translation file format, then you might want to be able to cross check the keys of each locale's translation file to ensure they all match and check that the message syntax for each translation is valid.
 
Now these issues might seem small, but they have the potential to affect real users of your application. Here's what could happen when the syntax for a message is accidentally malformed:
 
<p align="center"><b>Before</b> 😸</p>
<p align="center">
  <img src="https://i.imgur.com/gBOxGQ2.png" width="100%"/>
</p>
 
<p align="center"><b>After</b> 🙀</p>
<p align="center">
  <img src="https://i.imgur.com/gFQFqKD.png" width="100%"/>
</p>
<p align="center">
  <em>(example using react-intl)</em>
</p>
 
**Having a degree of automated verification can help easily detect these issues before changes are even merged into the translations project.**
 
Here's how the plugin would catch the invalid ICU Message syntax from above:
 
<p align="center">
  <img src="https://i.imgur.com/z71uEe0.png" width="100%"/>
</p>
 
We're excited to announce [**eslint-plugin-i18n-json**](https://github.com/godaddy/eslint-plugin-i18n-json). **A fully extendable eslint plugin for JSON i18n translation files**! It's easy to get started and caters to different translation [project setups](https://github.com/godaddy/eslint-plugin-i18n-json/tree/master/examples). Whether your translation files have either a flat or nested structure, or even if you have a translation file per each component of the UI *(e.g. menu.json, search.json, etc.)* , we've got you covered! 🙌
 
**By leveraging eslint-plugin-i18n-json, your team can relax knowing that any change to a translation file will go through strict checks.** 👌
 
## Features 🚀
 
- lint JSON translation files
  - rule: `i18n-json/valid-json`
  - configure a custom linter in case the default doesn't fit your needs.
 
- validate syntax per message
  - rule: `i18n-json/valid-message-syntax`
  - default syntax check is for ICU Message Format
  - can support any message syntax through custom validators. [Example](https://github.com/godaddy/eslint-plugin-i18n-json/tree/master/examples/custom-message-syntax)
 
- ensure translation files have identical keys
  - `i18n-json/identical-keys`
  - supports different custom mappings and on the fly key structure generation
 
- sort translation keys in ascending order through eslint auto-fix
 
- supports **any level of nesting** in the translation file. (escapes `.` in key names)
 
---
 
Please check out the project on [Github](https://github.com/godaddy/eslint-plugin-i18n-json) and try it out by installing from [NPM](https://www.npmjs.com/package/eslint-plugin-i18n-json).
 
👋 Feel free to contribute! We'd love any type of contribution! 😄
 
## Special Thanks 👏
 
- Jest platform packages
 
- intl-messageformat-parser
 
- Report formatter UI heavily inspired from [eslint-formatter-pretty by Sindre Sorhus](https://github.com/sindresorhus/eslint-formatter-pretty)
 
- ["Translate" icon](https://thenounproject.com/term/translate/1007332) created by Björn Andersson, from [the Noun Project](https://thenounproject.com/). Used with attribution under Creative Commons.
