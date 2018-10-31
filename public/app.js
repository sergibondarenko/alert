import { uiModules } from 'ui/modules';

uiModules.get('apps/alert', []);
require('ui/routes').enable();

function controller() {};

require('ui/routes')
  .when('/?', {
    template: '<div><h1>hello</h1></div>',
    controller
  });
