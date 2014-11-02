/*global module:false*/
module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: true
      },
      all: {
        src: ['Gruntfile.js', 'tests.js', 'cozy-light', 'fixtures/**/*.js']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');


  grunt.registerTask('default', ['jshint']);
};
