# server
This is a nodejs static file server
## Installation
	$ npm install node-staticserver
## Examples
	// load node-staticserver
	var server = require('node-staticserver');
	// create a server
	var app = server();
	// listen a port
	app.listen(8080);
## Options
	var server = require('node-staticserver');
	var app = server({
	    // define server's root path
	    root: '.',
	    // define default file
	    index: 'index.html',
	    // define allowed method
	    method: ['GET', 'HEAD'],
	    // define character encoding
	    charset: 'utf-8',
	    // open gzip compression
	    zip: false,
	    // define cache(s)
	    cache: 0,
	    // custom response header
	    header: {
	        'X-Age': '1'
	    }
	});
## Methods
	var server = require('node-staticserver');
	var app = server();
	// set config parameter,you can set all option's parameter
	app.set('root',__dirname);
	app.listen(8080);