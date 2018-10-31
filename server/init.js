import { once } from 'lodash';

const init = once(function (server) {
  server.log(['info', 'alert'], 'starting...');
});

export default function (server, options) {
  if (server.plugins.elasticsearch.status.state === 'green') {
    init(server);
  } else {
    server.plugins.elasticsearch.status.on('change', () => {
      if (server.plugins.elasticsearch.status.state === 'green') {
        init(server);
      }
    });
  }
};
