Package.describe({
  name: 'meteor-imagemaker',
  version: '1.0.0',
  summary: 'Combines 4 uploaded images into 1 image using Meteor.',
  git: 'https://github.com/briankueck/imagemaker',
  documentation: 'README.md'
});

Npm.depends({
  'combine-tiles': '0.2.1',
  'gm': "1.23.1",
  'jimp': "0.2.28"
});

Package.onUse(function(api) {
  api.versionsFrom('1.6.1');

  api.use([
    'ecmascript',
    'dbarrett:dropzonejs',
    'iron:router',
    'templating'
  ]);

  api.addAssets([
    'public/ajax-loader.gif'
  ], 'client');

  api.addFiles([
    'client/meteor-imagemaker.css',
    'client/dropzone.html',
    'client/main.js',
    'client/meteor-imagemaker.html',
    'imports/lib/dropzone.js'
  ], 'client');

  api.mainModule('client/meteor-imagemaker-client.js', 'client');
  api.mainModule('server/meteor-imagemaker-server.js', 'server');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('meteor-imagemaker');
  api.mainModule('meteor-imagemaker-tests.js');
});
