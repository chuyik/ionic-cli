Ionic-Cli
=========

The Ionic Framework command line utility makes it easy to start, build, run, and emulate [Ionic](http://ionicframework.com/) apps. In the future, it will also have support for our mobile development services and tools that make Ionic even more powerful.

Use the `ionic --help` command for more detailed task information.

## Installing

```bash
$ sudo npm install -g ionic
```

## Starting an Ionic App

```bash
$ ionic start myApp [template]
```

There are three choices of templates:

* Side-Menu (sidemenu)
* Tabs (tabs)
* Blank (blank)

Command-line flags/options:

    --app-name, -a  ......  Human readable name for the app (Use quotes around the name)
    --id, -i  ............  Package name set in the <widget id> config, ie: com.mycompany.myapp
    --no-cordova, -w  ....  Do not create an app targeted for Cordova


## Testing in a Browser

Use `ionic serve` to start a local development server for app dev and testing. This is useful for both desktop browser testing, and to test within a device browser which is connected to the same network. Additionally, this command starts LiveReload which is used to monitor changes in the file system. As soon as you save a file the browser is refreshed automatically.

```bash
$ ionic serve [http-port] [livereload-port] [options]
```

Command-line flags/options:

    [--nobrowser|-b]  ......  Disable launching a browser
    [--nolivereload|-r]  ...  Do not start live reload


## Adding a platform target

```bash
$ ionic platform ios android
```

## Building your app

```bash
$ ionic build ios
```

## Emulating your app

```bash
$ ionic emulate ios
```

## Running your app

```bash
$ ionic run ios
```

## Update Ionic lib

Update Ionic library files, which are found in the `www/lib/ionic` directory. If bower is being used
by the project, this command will automatically run `bower update ionic`, otherwise this command updates 
the local static files from Ionic's CDN.

```bash
$ ionic lib update
```


## Packaging an app (beta)

Using Ionic's service, you can compile and package your project into an app-store ready app without
requiring native SDKs on your machine.

```bash
$ ionic package debug android
```

The third argument can be either `debug` or `release`, and the last argument can be either `android` or `ios`.


## Cordova Commands

Ionic uses Cordova underneath, so you can also substitute Cordova commands to prepare/build/emulate/run, or to add additional plugins.

Note: we occasionally send anonymous usage statistics to the Ionic team to make the tool better.
