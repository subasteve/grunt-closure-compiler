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
        done = this.async();
        
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

    data.js = grunt.file.expand({cwd: data.cwd}, data.js);

    // Sanitize options passed.
    if (!data.js.length) {
      // This task requires a minima an input file.
      grunt.warn('Missing js property.');
      return false;
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
    
    if (data.jsOutputFile) {
      // because closure compiler does not create dirs.
      grunt.log.writeln("Create File: "+data.jsOutputFile);
      grunt.file.write(data.jsOutputFile, '');
    }
    
    // Output some size info about a file.
    function min_info(min, onComplete) {
      gzip(min, function(err, buffer) {
        if (err) {
          onComplete.call(this, err);
        }

        var gzipSize = buffer.toString().length;
        grunt.log.writeln('Compressed size: ' + String((gzipSize / 1024).toFixed(2)).green + ' kb gzipped (' + String(gzipSize).green + ' bytes).');

        onComplete.call(this, null);
      });
    }
    
    function processOutput(err, stdout, stderr){
      if (err) {
        grunt.warn(err);
        done(false);
      }

      if (stdout) {
        grunt.log.writeln(stdout);
      }

      // If OK, calculate gzipped file size.
      if (reportFile.length) {
        var min = fs.readFileSync(data.jsOutputFile, 'utf8');
        min_info(min, function(err) {
          if (err) {
            grunt.warn(err);
            done(false);
          }

          if (data.noreport) {
            done();
          } else {
            // Write compile report to a file.
            fs.writeFile(reportFile, stderr, function(err) {
              if (err) {
                grunt.warn(err);
                done(false);
              }

              grunt.log.writeln('A report is saved in ' + reportFile + '.');
              done();
            });
          }

        });
      } else {
        if (data.report) {
          grunt.log.error(stderr);
        }
        done();
      }
    }

    if (data.jsOutputFile) {
      exec(command, { maxBuffer: data.maxBuffer * 1024, cwd: data.cwd }, processOutput);
    }

    if (data.jsOutputPath) {
      for(int i = 0; i < data.js.length; i++){
        var fileCommand = " --js \""+data.js[i]+"\"",
        fileName = data.js[i].substring(data.js[i].lastIndexOf("/")+1),
        newFile = data.jsOutputPath+fileName;
        
        fileCommand += " --js_output_file \""+newFile+"\"";
        
        reportFile = data.reportFile || newFile + '.report.txt';
        
        grunt.log.writeln("Create File: "+newFile);
        grunt.file.write(newFile, '');
        
        exec(command+fileCommand, { maxBuffer: data.maxBuffer * 1024, cwd: data.cwd }, processOutput); 
      }
    }
  });

};
