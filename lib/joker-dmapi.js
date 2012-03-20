/* 
 * Joker.com DMAPI client library
 * http://github.com/jheusala/node-joker-dmapi
 * Version 0.0.1
 */

/*
 * Copyright (C) 2011 by Jaakko-Heikki Heusala <jheusala@iki.fi>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of 
 * this software and associated documentation files (the "Software"), to deal in 
 * the Software without restriction, including without limitation the rights to 
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
 * of the Software, and to permit persons to whom the Software is furnished to do 
 * so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all 
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
 * SOFTWARE.
 */

var util = require("util"),
    events = require("events");

/* Constructor */
function JokerDMAPI () {
	if(!(this instanceof arguments.callee)) return new (arguments.callee)(args);
	var my = this;
	events.EventEmitter.call(my);
	my.config = {
		'host': 'dmapi.joker.com',
		'port': 443
	};
}
util.inherits(JokerDMAPI, events.EventEmitter);

var mod = module.exports = new JokerDMAPI(),
    util = require("util"),
    events = require("events"),
    https = require('https'),
    querystring = require('querystring'),
    snippets = require('snippets'),
    foreach = snippets.foreach,
    split = snippets.split,
	pass = snippets.pass;

/* Parse DMAPI response body */
function parse_response_body(data) {
	var response = {'headers':{}, 'body':''};
	pass(split(/\n\n/, ""+data, 2)).on(function(headers, body) {
		foreach(headers.split("\n")).do(function(line) {
			pass(split(/: */, ""+line, 2)).on(function(name, value) {
				response.headers[(""+name).toLowerCase()] = value;
			});
		});
		if(body) response.body = body;
	});
	return response;
}

/* Post generic request */
JokerDMAPI.prototype.exec = function(name, args, callback) {
	var my = this,
	    msg = querystring.stringify(args),
	    options = {
			'host': my.config.host || 'dmapi.joker.com',
			'port': my.config.port || 443,
			'path': '/request/'+name,
			'method': 'POST',
			'headers':{'Content-length':msg.length}
		},
	    data = '',
	    req = https.request(options, function(res) {
			//console.log('STATUS: ' + res.statusCode);
			//console.log('HEADERS: ' + JSON.stringify(res.headers));
			//res.setEncoding('utf8');
			res.on('data', function (chunk) {
				data += chunk;
			});
			res.on('end', function() {
				var response = parse_response_body(data);
				response.status = res.statusCode;
				//response.http = res;
				callback(undefined, response);
			});
		});
	
	req.on('error', function(e) {
		mod.emit('error', e);
	});
	
	req.end(msg);
};

/* Login */
JokerDMAPI.prototype.login = function(args, fn) {
	var my = this, args = args || {};
	my.exec('login', {'username':args.username, 'password':args.password}, function(err, response) {
		if(err) return fn(err);
		var auth_id = response.headers['auth-sid'],
		    uid     = response.headers['uid'],
		    tlds    = response.body.split("\n");
		my.auth_id = auth_id;
		fn(undefined, {'auth_id':auth_id, 'uid':uid, 'tlds':tlds});
	});
};

/* query-domain-list */
JokerDMAPI.prototype['query-domain-list'] = function(args, fn) {
	var my = this, args = args || {};
	if(!my.auth_id) return fn(new Error("No auth_id. Try login first."));
	// FIXME: Add options: pattern, from, to, showstatus, showgrants
	my.exec('query-domain-list', {'auth-sid':my.auth_id}, function(err, response) {
		if(err) return fn(err);
		var domains = response.body;
		console.log("domains = \n" + domains);
		// FIXME: Prepare domains into array
		fn(undefined, domains);
	});
};

/* Alias for query-domain-list */
JokerDMAPI.prototype.queryDomainList = mod['query-domain-list'];

/* EOF */
