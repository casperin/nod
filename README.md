Nod v.1.0.5
===========

Frontend validation jQuery plugin

[Documentation and examples](http://casperin.github.com/nod "nod") -- or you can
just clone this and open index.html :)


Dependencies
------------

* jQuery, version 1.8 or above

Although not strictly a dependency, nod.js was built with Bootstrap in mind.

Develop and Testing
-------------------

This project comes with a develop enviroment managed with
[Gruntjs](http://gruntjs.com)

### Setup dev environment

Download your dependencies for develop and testing.

    npm install && bower install

### Develop

You can develop and test and compile coffee and jade in real time and watch the
changes with live reload

    grunt server

### Building

Once you have complete your changes you can build it and move the files to the
root with.

    grunt build


Contributors
------------

* Luis Hdez - [aggressivex](https://github.com/aggressivex)
* Matthias Buchetics - [mbuchetics](https://github.com/mbuchetics)
* Chris Hall - [chall8908](https://github.com/chall8908)
* Eduardo Robles Elvira - [edulix](https://github.com/edulix)
* Nav Garcha - [navgarcha](https://github.com/navgarcha)


License
-------

May be freely distributed under the MIT license.


Updates
-------

* **v 1.0.5**
  * [bugfix](https://github.com/casperin/nod/issues/39)
* **v 1.0.4**
  * [bugfix](https://github.com/casperin/nod/pull/37)
* **v 1.0.3**
  * one-of
  * different handling of ajax calls
* **v 1.0.2**
  * silentSubmit
  * Better selectors
* **v 1.0.1**
  * Support for ajax checking added
  * Radio button support
  * Restructuring code
  * Moved to yeoman and gruntjs
  * Removed redundant stuff from options
