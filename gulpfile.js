var gulp = require('gulp');
var _ = require('lodash');
var path = require('path');
var mkdirp = require('mkdirp');
var Rsync = require('rsync');
var Promise = require('bluebird');
var eslint = require('gulp-eslint');
var rimraf = require('rimraf');
var zip = require('gulp-zip');
var fs = require('fs');
var spawn = require('child_process').spawn;
var minimist = require('minimist');
var util = require('gulp-util');

var pkg = require('./package.json');
var packageName = pkg.name;

// in their own sub-directory to not interfere with Gradle
var buildDir = path.resolve(__dirname, 'build/gulp');
var targetDir = path.resolve(__dirname, 'target/gulp');
var buildTarget = path.resolve(buildDir, 'kibana', packageName);
var pathToPkgConfig = './package.json';

var include = [
  '*.json',
  'index.js',
  'server',
  'public',
];

var knownOptions = {
  string: 'kibanahomepath',
  string: 'lib-install',
  string: 'version',
  string: 'plugindir',
  default: {
    kibanahomepath: '../kibana',
    plugindir: 'plugins',
  }
};
var options = minimist(process.argv.slice(2), knownOptions);
var kibanaPluginDir = path.resolve(__dirname, `${options.kibanahomepath}/${options.plugindir}/${packageName}`);

const lib = {
  gun_master: !options['lib-install'] ? null : options['lib-install'],
};

function syncPluginTo(dest, done) {
  mkdirp(dest, function (err) {
    if (err) return done(err);
    Promise.all(include.map(function (name) {
      var source = path.resolve(__dirname, name);
      return new Promise(function (resolve, reject) {
        var rsync = new Rsync();
        rsync
          .source(source)
          .destination(dest)
          .flags('uav')
          .recursive(true)
          .set('delete')
          .output(function (data) {
            process.stdout.write(data.toString('utf8'));
          });
        rsync.execute(function (err) {
          if (err) {
            console.log(err);
            return reject(err);
          }
          resolve();
        });
      });
    })).then(function () {
      return new Promise(function (resolve, reject) {
        mkdirp(path.join(buildTarget, 'node_modules'), function (err) {
          if (err) return reject(err);
          resolve();
        });
      });
    }).then(function () {
      const prod = spawn('npm', ['install', '--production'], {
        cwd: dest,
        stdio: 'inherit'
      });
      prod.on('close', function () {
        if (!lib.gun_master) {
          done();
        } else {
          spawn('npm', ['install', lib.gun_master], {
            cwd: dest,
            stdio: 'inherit'
          }).on('close', done);
        }
      });
    }).catch(done);
  });
}

function applyVersion(path, version) {
  var pkgConfig = JSON.parse(fs.readFileSync(path, 'utf8'));
  pkgConfig.kibana.version = version;
  fs.writeFileSync(path, JSON.stringify(pkgConfig, null, 2), 'utf8');
}

gulp.task('sync', [], function (done) {
  syncPluginTo(kibanaPluginDir, done);
});

gulp.task('lint', function (done) {
  return gulp.src([
    'index.js',
    'gulpfile.js',
    'public/**/*.js',
    'server/**/*.js',
    '!**/webpackShims/**'
  ]).pipe(eslint()).pipe(eslint.formatEach()).pipe(eslint.failAfterError());
});

gulp.task('clean', function (done) {
  Promise.each([buildDir, targetDir], function (dir) {
    return new Promise(function (resolve, reject) {
      rimraf(dir, function (err) {
        if (err) return reject(err);
        resolve();
      });
    });
  }).nodeify(done);
});

gulp.task('build', ['clean'], function (done) {
  if (options.version) {
    applyVersion(pathToPkgConfig, options.version);
  }
  syncPluginTo(buildTarget, done);
});

gulp.task('package', ['build'], function (done) {
  return gulp.src([
    path.join(buildDir, '**', '*'),
    path.join(buildDir, '**/.local-chromium/**/*')
  ])
    .pipe(zip(options.version ? packageName + '-v' + options.version  + '.zip' : packageName + '.zip'))
    .pipe(gulp.dest(targetDir));
});

gulp.task('package_nochrome', ['build'], function (done) {
  return gulp.src([
    path.join(buildDir, '**', '*'),
  ])
    .pipe(zip(options.version ? packageName + '-v' + options.version  + '.zip' : packageName + '.zip'))
    .pipe(gulp.dest(targetDir));
});

gulp.task('dev', ['sync'], function (done) {
  gulp.watch([
    'index.js',
    '*.json',
    'public/**/*',
    'server/**/*'
  ], ['sync', 'lint']);
});

gulp.task('test', ['sync'], function (done) {
  spawn('grunt', ['test:server', 'test:browser', '--grep=' + (util.env.grep ? util.env.grep : 'alert')], {
    cwd: options.kibanahomepath,
    stdio: 'inherit'
  }).on('error', (err) => {
    throw err;
  }).on('close', done);
});

gulp.task('testserver', ['sync'], function (done) {
  spawn('grunt', ['test:server', '--grep=' + (util.env.grep ? util.env.grep : 'alert')], {
    cwd: options.kibanahomepath,
    stdio: 'inherit'
  }).on('error', (err) => {
    throw err;
  }).on('close', done);
});

gulp.task('testbrowser', ['sync'], function (done) {
  spawn('grunt', ['test:browser', '--grep=' + (util.env.grep ? util.env.grep : 'alert')], {
    cwd: options.kibanahomepath,
    stdio: 'inherit'
  }).on('error', (err) => {
    throw err;
  }).on('close', done);
});

gulp.task('testdev', ['sync'], function (done) {
  spawn('grunt', ['test:dev', '--browser=Chrome'], {
    cwd: options.kibanahomepath,
    stdio: 'inherit'
  }).on('error', (err) => {
    throw err;
  }).on('close', done);
});

gulp.task('coverage', ['sync'], function (done) {
  spawn('grunt', ['test:coverage', '--grep=alert'], {
    cwd: options.kibanahomepath,
    stdio: 'inherit'
  }).on('error', (err) => {
    throw err;
  }).on('close', done);
});
