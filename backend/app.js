// Entry point alias for cPanel configurations looking for app.js
const { app, startServer } = require('./server.js');

if (require.main === module) {
	startServer();
}

module.exports = app;
