var Server = require('./lib/server.js');
var port = 8080;
var app = Server();
app.set('root', 'lib');
app.listen(port);
console.log('Server is running at http://127.0.0.1:' + port + '/');