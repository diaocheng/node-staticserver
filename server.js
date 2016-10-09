/*!
 * 静态文件服务器
 * Copyright 2016 程刁
 * Licensed under MIT
 */
'use strict';
// http模块
var http = require('http');
// url模块
var url = require('url');
// 路径模块
var path = require('path');
// 文件系统模块
var fs = require('fs');
// 导出模块
exports = module.exports = function() {
    // 创建Server类
    var Server = function(req, res, callback) {
        Server.handle(req, res, callback);
    };
    Server.init = function() {
        this.config = {};
        this.defaultConfiguration();
    };
    Server.defaultConfiguration = function() {
        this.set('defaultfilename', 'index.html');
        this.set('statusCode', require('./lib/statuscode.json'));
        this.set('mime', (function(map) {
            var mime = {};
            for (var type in map) {
                var exts = map[type];
                for (var i = 0; i < exts.length; i++) {
                    mime[exts[i]] = type;
                }
            }
            return mime;
        })(require('./lib/mime.json')));
    };
    // 动态设置服务器配置
    Server.set = function(setting, val) {
        if (arguments.length === 1) {
            this.config[setting];
        } else {
            this.config[setting] = val;
        }
        switch (setting) {
            case 'root':
                this.config[setting] = path.join(__dirname, val).replace(/\\/g, '/');
        }
        return this;
    };
    Server.handle = function(req, res, callback) {
        // Server.request(req);
        Server.response(req, res, callback);
    };
    Server.listen = function(port) {
        var server = http.createServer(this);
        return server.listen.call(server, port);
    };
    Server.response = function(req, res, callback) {
        if (typeof this.config.root !== 'string') {
            throw new TypeError('没有定义静态文件根目录');
        }
        var pathname = url.parse(req.url).pathname;
        // 判断请求的是否为目录
        if (pathname.slice(-1) === '/') {
            pathname += Server.config.defaultfilename;
        };
        // 完整路径
        pathname = path.join(this.config.root, pathname);
        // 把路径转化为以"/"分割,并去掉路径前面的"/";
        pathname = pathname.replace(/\\/g, '/');
        console.log(pathname);
        fs.stat(pathname, function(err, stats) {
            var status;
            res.setHeader('Server', 'Node/V6');
            if (err) {
                // 设置状态码为404
                status = 404;
                res.writeHead(status);
                res.end(Server.config.statusCode[status]);
            } else {
                if (stats.isDirectory()) {
                    // 设置状态码为301
                    status = 301;
                    // 设置响应头
                    res.writeHead(status, {
                        'Location': url.parse(req.url).pathname + '/'
                    });
                    res.end(Server.config.statusCode[status]);
                } else {
                    // 文件后缀名
                    let ext = path.extname(pathname).slice(1).toLocaleLowerCase();
                    // 设置状态码为200
                    status = 200;
                    // 设置响应头
                    res.writeHead(status, {
                        'Content-Type': Server.config.mime[ext] + ';charset=' + Server.config.charset,
                        'Content-Length': stats.size,
                        'Last-Modified': stats.mtime.toUTCString()
                    });
                    fs.createReadStream(pathname).pipe(res);
                }
            }
            console.log(status + '  ' + req.url);
        });
    };
    Server.init();
    return Server;
};