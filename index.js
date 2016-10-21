/**
 * 启动一个服务器
 * @type {Number}
 */
var server = require('./lib/server.js');
var port = 8080;
var app = server({
    root: 'F:/Web/layoutit/',
    index: 'index.html',
    method: ['GET', 'HEAD'],
    zip: 'gzip',
    cache: 1,
    header: {
        "Ds": 'sd'
    }
});
app.listen(port);
console.log('Server is running at http://127.0.0.1:' + port + '/');