const { build } = require('./app');
const config = require('./config')();
build().then(app => app.listen({ port: config.port, host: '0.0.0.0' })).catch(err => { console.error(err); process.exit(1); });
