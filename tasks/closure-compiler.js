module.exports = function(grunt) {

  'use strict';

  var exec = require('child_process').exec,
      fs = require('fs'),
      path = require('path'),
      gzip = require('zlib').gzip;

  // ==========================================================================
  // TASKS
  // ==========================================================================

  grunt.registerMultiTask('closure-compiler', 'Minify JS files using Closure Compiler.', function() {
    
    var closurePath = '',
        reportFile = '',
        data = this.data,
        done = this.async(),
	processed = 0;
        
    if(data.jsOutputFile && data.jsOutputPath){
      grunt.log.error("Cannot have jsOutputFile & jsOutputPath set at same time.");
      return false;
    }

    // Check for closure path.
    if (data.closurePath) {
      closurePath = data.closurePath;
    } else if (process.env.CLOSURE_PATH) {
      closurePath = process.env.CLOSURE_PATH;
    } else {
      grunt.log.error('' +
          '/!\\'.red +
          ' Set an environment variable called ' +
          'CLOSURE_PATH'.red + ' or the build parameter' + 'closurePath'.red +
          ' and\nmake it point to your root install of Closure Compiler.' +
          '\n');
      return false;
    }

    var command = 'java -jar "' + closurePath + '/build/compiler.jar"';

    data.cwd = data.cwd || './';

    data.originalJs = data.js;
    data.js = grunt.file.expand({cwd: data.cwd}, data.js);

    // Sanitize options passed.
    if (!data.js.length) {
      if(data.originalJs){
      	grunt.log.writeln("Nothing to process in "+data.originalJs);
      	done();
      }else{
      	// This task requires a minima an input file.
      	grunt.warn('Missing js property.');
      	return false;
      }
    }

    if (data.jsOutputFile) {
      // Build command line.
      command += ' --js "' + data.js.join('" --js "') + '"';
      
      if (!grunt.file.isPathAbsolute(data.jsOutputFile)) {
        data.jsOutputFile = path.resolve('./') + '/' + data.jsOutputFile;
      }
      command += ' --js_output_file "' + data.jsOutputFile + '"';
      reportFile = data.reportFile || data.jsOutputFile + '.report.txt';
    }

    if (data.externs) {
      data.externs = grunt.file.expand(data.externs);
      command += ' --externs ' + data.externs.join(' --externs ');

      if (!data.externs.length) {
        delete data.externs;
      }
    }

    if (data.options.externs) {
      data.options.externs = grunt.file.expand(data.options.externs);

      if (!data.options.externs.length) {
        delete data.options.externs;
      }
    }

    for (var directive in data.options) {
      if (Array.isArray(data.options[directive])) {
        command += ' --' + directive + ' ' + data.options[directive].join(' --' + directive + ' ');
      } else if (data.options[directive] === undefined || data.options[directive] === null) {
        command += ' --' + directive;
      } else {
        command += ' --' + directive + ' "' + String(data.options[directive]) + '"';
      }
    }
    
    function processOutput(err, stdout, stderr, fileName, newFile){
    	if(err != null){
		grunt.warn(err);
	}
	if(stdout){
		grunt.log.writeln(stdout);
	}
	if(stderr){
		grunt.log.writeln(stderr);
	}

	if(fileName && newFile){
		grunt.log.ok("Compiled "+fileName+" -> "+newFile);
	}

	if (data.jsOutputFile) {
		done();
	}else{
		if(++processed === data.js.length){
			done();
		}
	}
    }

    function createFile(file){
	// because closure compiler does not create dirs.
        grunt.log.writeln("Create File: "+file);
        grunt.file.write(file, '');
    }

    for(var i = 0; i < data.js.length; i++){
        var fileCommand = " --js \""+data.js[i]+"\"",
        fileName = data.js[i].substring(data.js[i].lastIndexOf("/")+1),
        newFile = (data.jsOutputPath) ? data.jsOutputPath+fileName : data.jsOutputFile;

        fileCommand += " --js_output_file \""+newFile+"\"";

        //Fatal error: path must be a string
        //reportFile = data.reportFile || newFile + '.report.txt';

        createFile(newFile);

        exec(command+fileCommand, { maxBuffer: data.maxBuffer * 1024, cwd: data.cwd }, function getOutput(err, stdout, stderr){
                processOutput(err, stdout, stderr, this.fileName, this.newFile);
        }.bind({
                fileName: fileName,
                newFile: newFile
        }));
      }
  });

};
