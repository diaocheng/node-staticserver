/**
 * 启动一个服务器
 * @type {Number}
 */
var server = require('./lib/server.js');
var port = 8080;
var app = server({
    // 定义根目录
    root: '.',
    // 定义默认文件
    index: 'index.html',
    // 允许访问方式
    method: ['GET', 'HEAD'],
    // 文件字符编码
    charset: 'utf-8',
    // 是否启用文件gzip压缩
    zip: true,
    // 缓存时间(s)
    cache: 0,
    // 自定义响应头信息
    header: {
        'Age': '1'
    }
});
app.listen(port);
console.log('Server is running at http://127.0.0.1:' + port + '/');