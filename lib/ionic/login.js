var fs = require('fs'),
    request = require('request'),
    argv = require('optimist').argv,
    prompt = require('prompt'),
    IonicProject = require('./project'),
    IonicStore = require('./store').IonicStore,
    IonicTask = require('./task').IonicTask;

var IonicLoginTask = function() {};

IonicLoginTask.prototype = new IonicTask();

IonicLoginTask.prototype.get = function(ionic, callback) {
  this.cookieData = new IonicStore('cookies');

  if(ionic.jar) {
    // already in memory
    callback(ionic.jar);
    return;
  }

  this.email = argv.email || argv.e || process.env.IONIC_EMAIL;
  this.password = argv.password || argv.p || process.env.IONIC_PASSWORD;

  if(!this.email && this.password) {
    return ionic.fail('--email or -e command line flag, or IONIC_EMAIL environment variable required');
  }
  if(this.email && !this.password) {
    return ionic.fail('--password or -p command line flag, or IONIC_PASSWORD environment variable required');
  }

  if(!this.email && !this.password) {
    // did not include cmd line flags, check for existing cookies
    var jar = this.cookieData.get(ionic.IONIC_DASH);

    if(jar && jar.cookies && jar.cookies.length) {
      for(var i in jar.cookies) {
        var cookie = jar.cookies[i];
        if(cookie.name == "sessionid" && new Date(cookie.expires) > new Date()) {
          ionic.jar = jar;
          callback(jar);
          return;
        }
      }
    }
  }

  this.run(ionic, callback);
};

IonicLoginTask.prototype.run = function(ionic, callback) {
  var self = this;

  if(!this.email && !this.password) {

    var schema = [{
      name: 'email',
      pattern: /^[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+(?:\.[A-z0-9!#$%&'*+\/=?\^_{|}~\-]+)*@(?:[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?\.)+[A-z0-9](?:[A-z0-9\-]*[A-z0-9])?$/,
      description: 'Email:'.yellow.bold,
      required: true
    }, {
      name: 'password',
      description: 'Password:'.yellow.bold,
      hidden: true,
      required: true
    }];

    // prompt for log
    console.log('\nTo continue, please login to your Ionic account.'.bold.green);
    console.log('Don\'t have one? Create a one at: '.bold + (ionic.IONIC_DASH + '/signup').info.bold + '\n');

    prompt.override = argv;
    prompt.message = '';
    prompt.delimiter = '';
    prompt.start();

    prompt.get(schema, function (err, result) {
      if(err) {
        return ionic.fail('Error logging in: ' + err);
      }

      self.email = result.email;
      self.password = result.password;

      self.requestLogIn(ionic, callback, true);
    });

  } else {
    // cmd line flag were added, use those instead of a prompt
    self.requestLogIn(ionic, callback, false);
  }

};

IonicLoginTask.prototype.requestLogIn = function(ionic, callback, saveCookies) {
  var self = this;

  var jar = request.jar();
  request({
    url: ionic.IONIC_DASH + '/login',
    jar: jar
  },
  function(err, response, body) {
    if(err || jar.cookies.length === 0) {
      return ionic.fail('Error logging in: ' + err);
    }

    request({
      method: 'POST',
      url: ionic.IONIC_DASH + '/login',
      jar: jar,
      form: {
        username: self.email.toString().toLowerCase(),
        password: self.password,
        csrfmiddlewaretoken: jar.cookies[0].value
      },
      proxy: process.env.PROXY || null
    },
    function (err, response, body) {
      if(err) {
        return ionic.fail('Error logging in: ' + err);
      }

      // Should be a 302 redirect status code if correct
      if(response.statusCode != 302) {
        return ionic.fail('Email or Password incorrect. Please visit '+ ionic.IONIC_DASH +' for help.');
      }

      if(saveCookies) {
        // save cookies
        if(!self.cookieData) {
          self.cookieData = new IonicStore('cookies');
        }
        self.cookieData.set(ionic.IONIC_DASH, jar);
        self.cookieData.save();
      }

      // save in memory
      ionic.jar = jar;

      console.log('Logged in! :)'.green);

      if(callback) {
        callback(jar);
      }
    });
  });
};

exports.IonicLoginTask = IonicLoginTask;
