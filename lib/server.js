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
var util = require('./util.js');
// 状态码
var status = require('./json/status');
// 文件mime类型
var mime = require('./json/mime');
/**
 * 创建Server类
 * @param {[type]} req [description]
 * @param {[type]} res [description]
 */
var Server = function(req, res) {
    Server.handle(req, res);
};
// 服务器名字
Server.server = 'Node/V8';
// 服务器版本
Server.version = '1.0.0';
/**
 * 初始化服务器对象
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
Server.init = function init(options) {
    // 防止参数不正确
    if (typeof options !== 'object') {
        options = {};
    }
    // 设置状态码信息
    this.__proto__.status = status;
    // 设置文件mime类型
    this.__proto__.mime = util.transpose(mime);
    this.config = {
        // 定义默认根目录,并标准化路径
        root: path.normalize(path.resolve(options.root || '.')),
        // 定义默认文件
        index: options.index || 'index.html',
        // 允许访问方式
        method: options.method || ['GET', 'HEAD'],
        // 字符编码
        charset: options.charset || 'utf-8',
        // 压缩
        zip: options.zip || false,
        // 缓存时间
        cache: options.cache || 0,
        // 自定义响应头信息
        header: options.header || {}
    };
    return this;
};
/**
 * 动态设置服务器配置
 * @param {[type]} attribute [description]
 * @param {[type]} value     [description]
 */
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
/**
 * 服务器请求处理分发
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
Server.handle = function handle(req, res) {
    var me = this,
        request = me.request(req);
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
                // 默认响应头信息
                var header = {
                    // 设置Content-Type
                    'Content-Type': me.getContentType(request.filename)
                };
                // 设置缓存
                var cache = me.getCache(request, stats);
                header = util.merge(header, {
                    'ETag': cache.ETag,
                    'Date': cache.Date,
                    'Expires': cache.Expires,
                    'Cache-Control': cache.CacheControl,
                    'Last-Modified': cache.LastModified
                });
                if (!cache.modified) {
                    me.response(res, 304, header);
                }
                // 请求头是否包含range
                if (request.range) {
                    var range = me.getRange(request.range, stats.size);
                    if (range !== -1 && range !== -2) {
                        header = util.merge(header, {
                            'Accept-Ranges': range.AcceptRanges,
                            'Content-Range': range[0].ContentRange,
                            'Content-Length': range[0].ContentLength
                        });
                        me.stream(res, {
                            file: request.filename,
                            range: range[0]
                        });
                        me.response(res, 206, header);
                    } else {
                        me.response(res, 416, {
                            'Content-Range': request.header['Content-Range']
                        });
                    }
                } else {
                    // 设置gzip压缩
                    var gzip = me.getGzip(request.acceptEncoding);
                    if (gzip !== -1 && gzip !== -2) {
                        header = util.merge(header, {
                            'Content-Encoding': gzip,
                            'Transfer-Encoding': 'chunked',
                            'Content-Length': stats.size
                        });
                    }
                    me.response(res, 200, header);
                    me.stream(res, {
                        file: request.filename,
                        gzip: gzip
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
/**
 * 文件流
 * @param  {[type]} res     [description]
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
Server.stream = function stream(res, options) {
    var file = options.file,
        range = options.range,
        gzip = options.gzip;
    if (range && !isNaN(range.start) && !isNaN(range.end)) {
        fs.createReadStream(file, {
            start: range.start,
            end: range.end
        }).pipe(res);
    } else {
        var stream = fs.createReadStream(file);
        if (gzip === 'gzip') {
            stream.pipe(zlib.createGzip()).pipe(res);
        } else if (gzip === 'deflate') {
            stream.pipe(zlib.createDeflate()).pipe(res);
        } else {
            stream.pipe(res);
        }
    }
};
/**
 * 获取range信息
 * @param  {[type]} str  [description]
 * @param  {[type]} size [description]
 * @return {[type]}      [description]
 */
Server.getRange = function(str, size) {
    var index = str ? str.indexOf('=') : -1
    if (index === -1) {
        return -2;
    }
    // 把range转换为数组
    var arr = str.slice(index + 1).split(',');
    var ranges = [];
    // 记录range的类型
    ranges.AcceptRanges = str.slice(0, index);
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
                ContentRange: ranges.AcceptRanges + ' ' + start + '-' + end + '/' + size,
                ContentLength: end - start + 1,
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
/**
 * 获取gzip信息
 * @param  {[type]} gzips [description]
 * @return {[type]}       [description]
 */
Server.getGzip = function(gzips) {
    if (!gzips) {
        throw new TypeError('name argument is required');
    }
    if (!this.config.zip) {
        return -2;
    }
    if (gzips.indexOf('gzip') !== -1) {
        return 'gzip';
    } else if (gzips.indexOf('deflate') !== -1) {
        return 'deflate';
    } else {
        return -1;
    }
};
/**
 * 获取缓存信息
 * @param  {[type]} IfModifiedSince [description]
 * @param  {[type]} mtime           [description]
 * @return {[type]}                 [description]
 */
Server.getCache = function(request, stats) {
    if (!this.config.cache) {
        this.config.cache = 0;
    }
    // console.log(request)
    var date = new Date(),
        expires = new Date(),
        cache = {},
        // 文件大小
        size = stats.size.toString(16),
        // 文件修改时间
        mtime = stats.mtime.getTime().toString(16),
        IfModifiedSince = request.IfModifiedSince,
        IfNoneMatch = request.IfNoneMatch;
    // 设置缓存过期时间;
    expires.setTime(expires.getTime() + this.config.cache * 1000);
    var cache = {
        ETag: size + '-' + mtime,
        Date: date.toUTCString(),
        Expires: expires.toUTCString(),
        // 在指定时间内不再向服务器重新请求
        CacheControl: 'no-cache',
        LastModified: stats.mtime.toUTCString(),
        modified: false
    }
    if (this.config.cache > 0) {
        cache.CacheControl = 'max-age=' + this.config.cache * 1000
    }
    if (IfModifiedSince !== cache.LastModified || IfNoneMatch !== cache.ETag) {
        cache.modified = true;
    }
    return cache;
};
/**
 * 获取文件Content-Type
 * @param  {[type]} filename [description]
 * @return {[type]}          [description]
 */
Server.getContentType = function(filename) {
    // 获取文件扩展名
    var ext = path.extname(filename).slice(1).toLowerCase();
    var mime = this.mime[ext] ? this.mime[ext] : 'text/plain';
    // 获取文本文件字符编码
    var charset = '';
    if (mime.indexOf('text') === 0) {
        charset = ';charset=' + this.config.charset;
    }
    return mime + charset;
};
/**
 * 服务器请求数据处理
 * @param  {[type]}   req      [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Server.request = function request(req, callback) {
    // 请求信息
    var request = {};
    this.request.__proto__ = req;
    // Referer
    request.referer = this.request.getHeader('Referer');
    // acceptEncoding信息
    request.acceptEncoding = this.request.getHeader('Accept-Encoding');
    if (request.acceptEncoding) {
        request.acceptEncoding = request.acceptEncoding.split(',');
    } else {
        request.acceptEncoding = [];
    }
    // Range信息
    request.range = this.request.getHeader('Range');
    // 请求方法
    request.method = req.method;
    // If-Modified-Since
    request.IfModifiedSince = this.request.getHeader('If-Modified-Since');
    // If-None-Match
    request.IfNoneMatch = this.request.getHeader('If-None-Match');
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
/**
 * 获取请求头信息
 * @param  {[type]} name [description]
 * @return {[type]}      [description]
 */
Server.request.getHeader = function(name) {
    if (!name) {
        throw new TypeError('name argument is required');
    }
    if (typeof name !== 'string') {
        throw new TypeError('name must be a string');
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
/**
 * 请求响应
 * @param  {[type]}   res      [description]
 * @param  {[type]}   status   [description]
 * @param  {[type]}   header   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
Server.response = function response(res, status, header, callback) {
    this.response.__proto__ = res;
    header = typeof header === 'object' ? header : {};
    header['Server'] = this.server;
    header = util.merge(this.config.header, header);
    if (status === 200 || status === 206) {
        res.writeHead(status, header);
    } else {
        res.writeHead(status, header);
        res.end(this.status[status]);
    }
    callback && callback(this.response);
    return this.response;
};
/**
 * 监听端口
 * @return {[type]} [description]
 */
Server.listen = function listen() {
    var server = http.createServer(this);
    return server.listen.apply(server, arguments);
};
/**
 * 导出服务器模块
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
exports = module.exports = function(options) {
    Server.init(options);
    return Server;
};