module.exports = function (kibana) {
  return new kibana.Plugin({
    name: 'alert',
    require: [
      'kibana',
      'elasticsearch',
    ],
    uiExports: {
      navbarExtensions: ['plugins/alert/navbar_extensions/dashboard_button/dashboard_button'],
      apps: [{
        title: 'alert',
        id: 'alert',
        description: 'It is a test hidden app',
        hidden: true,
        main: 'plugins/alert/app.js',
      }]
    },
    init: require('./server/init')
  });
};

