# server
这是一个nodejs服务器
## 创建一个服务器
	// 引入服务器模块
	var server = require('./lib/server.js');
	// 默认服务器根目录为当前脚本所在目录
	var app = server();
	// 启动监听
	app.listen(8080);
## 参数options
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
	    zip: false,
	    // 缓存时间(s)
	    cache: 0,
	    // 自定义响应头信息
	    header: {
	        'Age': '1'
	    }
	});
## 方法method
	var app = server();
	// 设置参数(可设置所有options中的参数)
	app.set('root',__dirname);