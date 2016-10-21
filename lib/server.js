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
// 压缩模块
var zlib = require('zlib');
// 事件模块
var events = require('events');
// 事件类
var EventEmitter = events.EventEmitter;
// 状态码
var status = require('./json/status.json');
var mime = require('./json/mime.json');
// 创建Server类
var Server = function(req, res) {
    Server.handle(req, res);
};
// 服务器名字
Server.server = 'Node/V8';
// 服务器版本
Server.version = '1.0.0';
// 初始化
Server.init = function init(options) {
    // 防止参数不正确
    if (typeof options !== 'object') {
        options = {};
    }
    // 设置状态码信息
    this.__proto__.status = status;
    // 设置文件mime类型
    this.__proto__.mime = util._map(mime);
    this.config = {
        // 定义默认根目录,并标准化路径
        root: path.normalize(path.resolve(options.root || '.')),
        // 定义默认文件
        index: options.index || 'index.html',
        // 允许访问方式
        method: options.method || ['GET', 'HEAD'],
        // // 允许编码
        // acceptEncoding: ['gzip', 'deflate', 'sdch'],
        // 压缩
        zip: options.zip || ['gzip', 'deflate', 'sdch'],
        // 缓存时间
        cache: options.cache || 0,
        // 超时时长
        timeout: options.timeout || 1200,
        // 响应头信息
        header: options.header || {}
    };
    return this;
};
// 动态设置服务器配置
Server.set = function set(attribute, value) {
    if (arguments.length === 1) {
        this.config[attribute];
    } else {
        this.config[attribute] = value;
    }
    switch (attribute) {
        case 'root':
            this.config[attribute] = path.normalize(path.resolve(value || this.config[attribute]));
            break;
        default:
    }
    return this;
};
// 服务器请求处理分发
Server.handle = function handle(req, res) {
    var me = this,
        request = me.request(req);
    me.req = req;
    me.res = res;
    // 是否通过指定的方法访问的
    if (me.config.method.indexOf(request.method) === -1) {
        return me.response(res, 405);
    }
    // 获取文件信息
    fs.stat(request.filename, function(err, stats) {
        if (err) {
            me.response(res, 404);
        } else {
            if (stats.isFile()) {
                // 获取文件扩展名
                var ext = path.extname(request.filename).slice(1).toLowerCase();
                var charset = me.config.charset ? me.config.charset : 'utf-8';
                var expires = new Date();
                expires.setTime(expires.getTime() + me.config.cache * 1000);
                // 默认响应头信息
                var header = {
                    'Content-Type': me.mime[ext] + ';charset=' + charset,
                    'Expires': expires.toUTCString(),
                    'Cache-Control': 'max-age=' + me.config.cache,
                    'Last-Modified': stats.mtime.toUTCString()
                };
                if (request.IfModifiedSince && request.IfModifiedSince == stats.mtime.toUTCString()) {
                    me.response(res, 304);
                }
                // 请求头是否包含range
                if (request.range) {
                    var range = me.getRange(request.range, stats.size);
                    if (range !== -1 && range !== -2) {
                        header['Content-Range'] = range.type + ' ' + (range[0] ? range[0].start + '-' + range[0].end : '*') + '/' + stats.size;
                        header['Content-Length'] = (range[0].end - range[0].start + 1);
                        me.stream(res, {
                            file: request.filename,
                            range: range[0],
                            acceptEncoding: request.acceptEncoding
                        });
                        me.response(res, 206, header);
                    } else {
                        me.response(res, 416, {
                            'Content-Range': request.header['Content-Range']
                        });
                    }
                } else {
                    header['Content-Length'] = stats.size;
                    me.response(res, 200, header);
                    me.stream(res, {
                        file: request.filename,
                        acceptEncoding: request.acceptEncoding
                    });
                }
            } else if (stats.isDirectory()) {
                me.response(res, 301, {
                    'Location': url.parse(req.url).pathname + '/'
                });
            } else {
                me.response(res, 400);
            }
        }
    });
    return me;
};
// 文件流
Server.stream = function stream(res, options) {
    var me = this,
        file = options.file,
        range = options.range,
        acceptEncoding = options.acceptEncoding;
    if (range && !isNaN(range.start) && !isNaN(range.end)) {
        fs.createReadStream(file, {
            "start": range.start,
            "end": range.end
        }).pipe(res);
    } else {
        if (acceptEncoding.indexOf(me.config.zip) !== -1) {
            fs.createReadStream(file).pipe(res);
        } else {
            fs.createReadStream(file).pipe(res);
        }
    }
};
// 获取range信息
Server.getRange = function(str, size) {
    var index = str ? str.indexOf('=') : -1
    if (index === -1) {
        return -2;
    }
    // 把range转换为数组
    var arr = str.slice(index + 1).split(',');
    var ranges = [];
    // 记录range的类型
    ranges.type = str.slice(0, index);
    // 获取文件长度
    for (var i = 0; i < arr.length; i++) {
        var range = arr[i].split('-');
        var start = parseInt(range[0], 10);
        var end = parseInt(range[1], 10);
        // start为数字时
        if (isNaN(start)) {
            start = size - end;
            end = size - 1;
            // end为数字时
        } else if (isNaN(end)) {
            end = size - 1;
        }
        // 结束不得大于文件大小
        if (end > size - 1) {
            end = size - 1;
        }
        // start与end都为数字,且0<=start<=end
        if (!isNaN(start) && !isNaN(end) && start >= 0 && start <= end) {
            ranges.push({
                start: start,
                end: end
            });
        }
    }
    // 没有获取到有效的range值
    if (ranges.length < 1) {
        return -1
    }
    return ranges;
};
// 服务器请求处理
Server.request = function request(req, callback) {
    // 请求信息
    var request = {};
    this.request.__proto__ = req;
    // Referer
    request.referer = this.request.getHeader('Referer');
    // acceptEncoding信息
    request.acceptEncoding = this.request.getHeader('Accept-Encoding');
    request.acceptEncoding = request.acceptEncoding ? request.acceptEncoding.split(',') : [];
    // Range信息
    request.range = this.request.getHeader('Range');
    // 请求方法
    request.method = req.method;
    // If-Modified-Since
    request.IfModifiedSince = this.request.getHeader('If-Modified-Since');
    // 请求路径
    var pathname = url.parse(req.url).pathname;
    // 把编码后的URL解码(在URL中文字符和空格等特殊字符时起作用)
    pathname = decodeURI(pathname);
    if (pathname.slice(-1) === '/') {
        pathname = path.join(pathname, this.config.index);
    }
    // 获取完整路径
    request.filename = path.join(this.config.root, pathname);
    callback && callback(request);
    return request;
};
// 获取请求头信息
Server.request.getHeader = function(name) {
    if (!name) {
        throw new TypeError('name argument is required to req.get');
    }
    if (typeof name !== 'string') {
        throw new TypeError('name must be a string to req.get');
    }
    var name = name.toLowerCase();
    switch (name) {
        case 'referer':
            return this.headers.referer;
            break;
        case 'referrer':
            return this.headers.referrer;
            break;
        default:
            return this.headers[name];
            break;
    }
};
Server.response = function response(res, status, header, callback) {
    this.response.__proto__ = res;
    this.response.status = status;
    header = typeof header === 'object' ? header : {};
    this.response.header = header;
    header['Server'] = this.server;
    switch (status) {
        case 200:
            res.writeHead(status, header);
            break;
        case 206:
            res.writeHead(status, header);
            break;
        case 301:
            res.writeHead(status, header);
            res.end(this.status[status]);
            break;
        case 304:
            res.writeHead(status, header);
            res.end(this.status[status]);
            break;
        case 404:
            res.writeHead(status, header);
            res.end(this.status[status]);
            break;
        default:
            res.writeHead(status, header);
            res.end(this.status[status]);
    }
    console.log(status + ' ' + this.status[status]);
    callback && callback(this.response);
    return this.response;
};
// 监听端口
Server.listen = function listen(port) {
    var server = http.createServer(this);
    return server.listen.call(server, port);
};
var util = {
    _map: function(map) {
        var _map = {};
        for (var index in map) {
            var items = map[index];
            for (var i = 0; i < items.length; i++) {
                _map[items[i]] = index;
            }
        }
        return _map;
    }
};
// 导出模块
exports = module.exports = function(options) {
    Server.init(options);
    return Server;
};