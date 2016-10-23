/**
 * 导出util模块
 * @type {[type]}
 */
'use strict';
exports = module.exports = {
    /**
     * 对象转置
     * @param  {[type]} map [description]
     * @return {[type]}     [description]
     */
    transpose: function(map) {
        var _map = {};
        for (var key in map) {
            var items = map[key];
            for (var i = 0; i < items.length; i++) {
                _map[items[i]] = key;
            }
        }
        return _map;
    },
    /**
     * 合并多个对象
     * @return {[type]} [description]
     */
    merge: function() {
        var i = 0,
            obj = {};
        while (i < arguments.length) {
            if (typeof arguments[i] === 'object') {
                for (var key in arguments[i]) {
                    obj[key] = arguments[i][key];
                }
            }
            i++;
        }
        return obj;
    }
};