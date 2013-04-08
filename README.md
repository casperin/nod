Nod v.1.0.0
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


License
-------

May be freely distributed under the MIT license.


Updates
-------

* April 5: No check (other than `presence`) forces the input field to be filled
out. Even `min-length` will accept an empty field. This breaks with backwards
compatibility.
