
'use strict';

var lrSnippet = require('grunt-contrib-livereload/lib/utils').livereloadSnippet;
var mountFolder = function (connect, dir) {
    return connect.static(require('path').resolve(dir));
};

module.exports = function (grunt) {

    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.loadNpmTasks('grunt-coffeelint');

    var nodConfig = {
        name: 'jquery-nod',
        app: '.',
        dist: 'dist',
        version: '1.0.4',
        banner: '/* jquery-nod - v<%= nod.version %> - ' +
          '<%= grunt.template.today("yyyy-mm-dd") %> \n' +
          ' * https://github.com/casperin/nod \n' +
          ' * Gorm Casper: Licensed MIT\n */\n'
    };

    grunt.initConfig({
        nod: nodConfig,
        watch: {
            jade: {
                files: ['<%= nod.app %>/dev/{,*/}*.jade'],
                tasks: ['jade']
            },
            coffee: {
                files: [
                  '<%= nod.app %>/nod/{,*/}*.coffee',
                  'dev/*.coffee'
                ],
                tasks: ['coffee:dist']
            },
            coffeeTest: {
                files: ['test/spec/{,*/}*.coffee'],
                tasks: ['coffee:test']
            },
            livereload: {
                files: [
                    'dev/*.html',
                    '.tmp/*.html',
                    '.tmp/*.js',
                    'nod.js',
                    '{.tmp,<%= nod.app %>/lib/{,*/}*.css',
                    '{.tmp,<%= nod.app %>/lib/{,*/}*.js',
                    '<%= nod.app %>/lib/{,*/}*.{png,jpg,jpeg,webp}'
                ],
                tasks: ['livereload']
            }
        },
        connect: {
            options: {
                port: 9000,
                // change this to '0.0.0.0' to access the server from outside
                hostname: 'localhost'
            },
            livereload: {
                options: {
                    middleware: function (connect) {
                        return [
                            lrSnippet,
                            mountFolder(connect, '.tmp'),
                            mountFolder(connect, '')
                        ];
                    }
                }
            },
            test: {
                options: {
                    middleware: function (connect) {
                        return [
                            mountFolder(connect, '.tmp'),
                            mountFolder(connect, 'test')
                        ];
                    }
                }
            },
            dist: {
                options: {
                    middleware: function (connect) {
                        return [
                            mountFolder(connect, 'dist')
                        ];
                    }
                }
            }
        },
        open: {
            server: {
                path: 'http://localhost:<%= connect.options.port %>'
            }
        },
        clean: {
            dist: ['.tmp', '<%= nod.dist %>/*'],
            server: '.tmp'
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [
                'Gruntfile.js',
                '<%= nod.app %>/scripts/{,*/}*.js',
                '!<%= nod.app %>/scripts/vendor/*',
                'test/spec/{,*/}*.js'
            ]
        },
        mocha: {
            all: {
                options: {
                    run: true,
                    urls: ['http://localhost:<%= connect.options.port %>/index.html']
                }
            }
        },
        jade: {
            compile: {
                options: {
                    pretty: true
                },
                files: {
                    "./index.html": ["dev/index.jade"],
                    ".tmp/test.html": ['dev/test.jade']
                }
            }

        },
        coffee: {
            dist: {
                options: {
                    bare: true
                },
                files: [
                  {
                    src: 'nod/checker.coffee',
                    dest: '.tmp/checker.js'
                  },{
                    src: 'nod/listener.coffee',
                    dest: '.tmp/listener.js'
                  },{
                    src: 'nod/msg.coffee',
                    dest: '.tmp/msg.js'
                  },{
                    src: 'nod/nod.coffee',
                    dest: '.tmp/nod.js'
                  },{
                    src: 'nod/init.coffee',
                    dest: '.tmp/init.js'
                  },{
                    src: 'dev/test_nod.coffee',
                    dest: 'dev/test_nod.js'
                  }
                ]
            },
            test: {
                files: [{
                    expand: true,
                    cwd: '.tmp/spec',
                    src: '*.coffee',
                    dest: 'test/spec'
                }]
            }
        },
        concat: {
          dist: {
            src: [
              'dev/head.js',
              '.tmp/checker.js',
              '.tmp/listener.js',
              '.tmp/msg.js',
              '.tmp/nod.js',
              '.tmp/init.js',
              'dev/tail.js'
            ],
            dest: 'nod.js'
          }
        },
        uglify: {
          options: {
            banner: '<%= nod.banner %>'
          },
          dist: {
            src: ['nod.js'],
            dest: 'nod.min.js'
          }
        },
        useminPrepare: {
            html: '.tmp/index.html',
            options: {
                dest: '<%= yeoman.dist %>'
            }
        },
        usemin: {
            html: ['<%= yeoman.dist %>/{,*/}*.html'],
            css: ['<%= yeoman.dist %>/styles/{,*/}*.css'],
            options: {
                dirs: ['<%= yeoman.dist %>']
            }
        },
        copy: {
            dist: {
                files: [{
                    expand: true,
                    dot: true,
                    cwd: '.tmp',
                    dest: '.',
                    src: [
                        '*.{html}'
                    ]
                }]
            }
        },
        bower: {
            all: {
                rjsConfig: '<%= nod.app %>/scripts/main.js'
            }
        },
        coffeelint: {
          runtest : ['nod/*.coffee']
        }
    });

    grunt.renameTask('regarde', 'watch');

    grunt.registerTask('server', function (target) {
        if (target === 'dist') {
            return grunt.task.run(['build', 'open', 'connect:dist:keepalive']);
        }

        grunt.task.run([
            'clean:server',
            'coffee:dist',
            'jade',
            'livereload-start',
            'connect:livereload',
            'open',
            'watch'
        ]);
    });

    grunt.registerTask('test', [
        'clean:server',
        'coffeelint',
        'coffee',
        // 'coffee:test',
        'jade',
        'connect:test'
        // 'mocha'  // times out
    ]);

    grunt.registerTask('build', [
        'clean:dist',
        'coffee',
        'concat',
        'uglify',
        'jade',
        'copy',
    ]);

    grunt.registerTask('lint', [
      'coffeelint'
    ]);

    grunt.registerTask('min', [
      'uglify'
    ]);

    grunt.registerTask('default', [
        'jshint',
        'test',
        'build'
    ]);
};
