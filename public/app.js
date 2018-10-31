import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';

import rootTemplate from './templates/root_template.html';

uiRoutes.enable();
uiRoutes
.when('/', {
  template: rootTemplate,
  controller: 'RootController',
});

const app = uiModules.get('apps/alert', []);
app.controller('RootController', function ($scope) {
  $scope.description = 'alert';
});
