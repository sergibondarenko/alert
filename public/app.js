require('ui/routes').enable();
require('ui/routes').when('/', {
  template: require('plugins/alert/templates/root_template.html'),
  controller: 'RootController',
});

const app = require('ui/modules').get('apps/alert', []);
app.controller('RootController', function ($scope) {
  $scope.description = 'alert';
});
