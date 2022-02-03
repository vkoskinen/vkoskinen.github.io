// Run with
// $ node server.js
var connect = require('connect');
var serveStatic = require('serve-static');
port=8009;
connect().use(serveStatic(__dirname)).listen(port, function(){
    console.log('Server running on %n...'%port);
});
