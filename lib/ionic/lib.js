var fs = require('fs'),
    os = require('os'),
    request = require('request'),
    path = require('path'),
    unzip = require('unzip'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    colors = require('colors'),
    spawn = require('child_process').spawn,
    Q = require('q'),
    IonicTask = require('./task').IonicTask,
    IonicStats = require('./stats').IonicStats;

var IonicLibTask = function() {};

IonicLibTask.prototype = new IonicTask();

IonicLibTask.prototype.run = function(ionic) {
  var self = this;
  self.codeHost = 'http://code.ionicframework.com';
  self.local = {};
  self.latest = {};
  self.usesBower = false;

  if (!fs.existsSync( path.resolve('www') )) {
    return ionic.fail('"www" directory cannot be found. Make sure the working directory is at the top level of an Ionic project.', 'lib');
  }

  this.loadVersionData();

  if(argv._.length > 1 && (argv._[1].toLowerCase() == 'update' || argv._[1].toLowerCase() == 'up')) {
    this.updateLibVersion();
  } else {
    // just version info
    this.printLibVersions();
  }

};


IonicLibTask.prototype.loadVersionData = function() {
  this.versionFilePath = path.resolve('www/lib/ionic/version.json');
  if( !fs.existsSync(this.versionFilePath) ) {
    this.versionFilePath = path.resolve('www/lib/ionic/bower.json');
    this.usesBower = fs.existsSync(this.versionFilePath);
  }

  try {
    this.local = require(this.versionFilePath);
  } catch(e) {
    console.log('Unable to load ionic lib version information'.bold.error);
  }
};


IonicLibTask.prototype.printLibVersions = function() {
  var self = this;

  console.log('Local Ionic version: '.bold.green + this.local.version + '  (' + this.versionFilePath + ')');

  this.getLatestVersions().then(function(){
    console.log('Latest Ionic version: '.bold.green + self.latest.version_number + '  (released ' + self.latest.release_date + ')');

    if(self.local.version != self.latest.version_number) {
      console.log(' * Local version is out of date'.yellow );
    } else {
      console.log(' * Local version up to date'.green );
    }
  });
};


IonicLibTask.prototype.getLatestVersions = function() {
  var q = Q.defer();
  var self = this;

  var proxy = process.env.PROXY || null;
  request({ url: self.codeHost + '/latest.json', proxy: proxy }, function(err, res, body) {
    try {
      self.latest = JSON.parse(body);
      q.resolve();
    } catch(e) {
      console.log('Error loading latest version information'.bold.error );
      q.reject();
    }
  });

  return q.promise;
};


IonicLibTask.prototype.updateLibVersion = function() {
  var self = this;

  if(self.usesBower) {
    var bowerCmd = spawn('bower', ['update', 'ionic']);

    bowerCmd.stdout.on('data', function (data) {
      process.stdout.write(data);
    });

    bowerCmd.stderr.on('data', function (data) {
      if(data) {
        process.stderr.write(data.toString().error.bold);
      }
    });

    return;
  }

  prompt.message = '';
  prompt.delimiter = '';
  prompt.start();

  var libPath = path.resolve('www/lib/ionic/');

  console.log('Are you sure you want to replace '.green.bold + libPath.info.bold + ' with an updated version of Ionic?'.green.bold);

  var promptProperties = {
    areYouSure: {
      name: 'areYouSure',
      description: '(yes/no):'.yellow.bold,
      required: true
    }
  };

  prompt.get({properties: promptProperties}, function (err, promptResult) {
    if(err) {
      return console.log(err);
    }

    var areYouSure = promptResult.areYouSure.toLowerCase().trim();
    if(areYouSure == 'yes' || areYouSure == 'y') {
      self.getLatest();
    }
  });
};


IonicLibTask.prototype.getLatest = function() {
  var self = this;

  var dirPath = path.resolve('www/lib/');
  if(!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  dirPath = path.resolve('www/lib/ionic/');
  deleteFolderRecursive(dirPath);
  if(!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  var version = argv.version || argv.v;
  if(version && version !== true && version !== false) {
    // get specific version
    var archivePath = '/' + version + '/ionic-v' + version + '.zip';
    self.downloadZip(archivePath, version);

  } else {
    // get the latest version
    this.getLatestVersions().then(function(){
      console.log('Latest version: '.bold.green + self.latest.version_number + '  (released ' + self.latest.release_date + ')');

      self.downloadZip(self.latest.archive, self.latest.version_number);

    });
  }

};


IonicLibTask.prototype.downloadZip = function(archivePath, versionNumber) {
  var self = this;

  var versionZip = self.codeHost + archivePath;
  self.tmpZipPath = path.resolve('www/lib/ionic/ionic.zip');

  console.log('Downloading: '.green.bold + versionZip);

  var file = fs.createWriteStream(self.tmpZipPath);
  var proxy = process.env.PROXY || null;
  request({ url: versionZip, encoding: null, proxy: proxy }, function(err, res, body) {
    if(err) {
      console.log(err);
      return;
    }
    if(res.statusCode == 404) {
      console.log( ('Invalid version: ' + versionNumber).bold.red );
      try {
        file.close();
        fs.unlink(self.tmpZipPath);
      } catch(e) {
        console.error( (e).red );
      }
      return;
    }
    if(res.statusCode >= 400) {
      console.log('Unable to download zip (' + res.statusCode + ')');
      return;
    }
    try {
      file.write(body);
      file.close(function(){
        self.updateFiles();
      });
    } catch(e) {
      console.error( (e).red );
    }
  }).on('response', function(res){

    var ProgressBar = require('progress');
    var bar = new ProgressBar('[:bar]  :percent  :etas', {
      complete: '=',
      incomplete: ' ',
      width: 30,
      total: parseInt(res.headers['content-length'], 10)
    });

    res.on('data', function (chunk) {
      try {
        bar.tick(chunk.length);
      } catch(e){}
    });

  }).on('error', function(err) {
    try {
      fs.unlink(self.tmpZipPath);
    } catch(e) {
      console.error( (e).red );
    }
    console.error( (err).red );
  });

};


IonicLibTask.prototype.updateFiles = function() {
  var self = this;
  var ionicLibDir = path.resolve('www/lib/ionic/');
  var readStream = fs.createReadStream(self.tmpZipPath);

  try {
    var writeStream = unzip.Extract({ path: ionicLibDir });
    writeStream.on('close', function() {
      try{
        self.loadVersionData();

        console.log('Ionic version updated to: '.bold.green + self.local.version.bold );
        IonicStats.t();

        var ionicBower = require('./bower').IonicBower;
        ionicBower.setIonicVersion(self.local.version);

      } catch(e) {
        console.log( ('Error loading version info: ' + e).error.bold );
      }
      try {
        fs.unlink(self.tmpZipPath);
      } catch(e) {}
    });
    writeStream.on('error', function(err) {
      console.log('Error: ' + err);
    });
    readStream.pipe(writeStream);

    readStream.on('error', function(err){
      console.log('Error: ' + err);
    });

  } catch(err) {
    console.log('Error: ' + err);
  }
};


function deleteFolderRecursive(path) {
  if( fs.existsSync(path) ) {
    fs.readdirSync(path).forEach(function(file,index){
      var curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
}


exports.IonicLibTask = IonicLibTask;
