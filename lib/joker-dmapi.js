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

function is_func(f) {
	if(f && (typeof f === 'function')) return true;
	return false;
}

/* Initialize callback function with error argument */
function init_err_fn(f) {
	if(is_func(f)) return f;
	return function(err) { if(err) console.log('Error: ' + err); };
}

function create_basic_func(user_fun) {
	if(!is_func(user_fun)) throw new Exception('create_basic_func() must have one function as an argument!');
	var new_fun = function(args, fn) {
		var my = this;
		
		// Single callback, no arguments
		if(is_func(args)) {
			fn = args;
			args = {};
		}
		
		// Initialize arguments
		args = args || {};
		fn = init_err_fn(fn);
		user_fun.call(my, args, fn);
	};
	return new_fun;
}

/* Constructor */
function JokerDMAPI () {
	if(!(this instanceof arguments.callee)) return new (arguments.callee)(args);
	var my = this;
	events.EventEmitter.call(my);
	my._config = {
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

/* Configure DMAPI from outside */
JokerDMAPI.prototype.config = function(data) {
	var my = this;
	foreach(data).each(function(v, k) {
		my._config[k] = v;
	});
	return my;
}

/* Post generic request */
JokerDMAPI.prototype.exec = function(name, args, callback) {
	var my = this,
	    msg = querystring.stringify(args),
	    options = {
			'host': my._config.host || 'dmapi.joker.com',
			'port': my._config.port || 443,
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
JokerDMAPI.prototype.login = create_basic_func(function(args, fn) {
	var my = this, args = args || {}, 
	    fn = init_err_fn(fn);
	my.exec('login', {'username':args.username, 'password':args.password}, function(err, response) {
		if(err) return fn(err);
		var auth_id = response.headers['auth-sid'],
		    uid     = response.headers['uid'],
		    tlds    = response.body.split("\n");
		my._config.auth_id = auth_id;
		fn(undefined, {'auth_id':auth_id, 'uid':uid, 'tlds':tlds});
	});
});

/* Logout */
JokerDMAPI.prototype.logout = create_basic_func(function(args, fn) {
	var my = this,
	    args = args || {},
	    fn = init_err_fn(fn);
	my.exec('logout', {}, function(err, response) {
		if(err) return fn(err);
		if(my._config) my._config.auth_id = undefined;
		fn();
	});
});

/* query-domain-list */
JokerDMAPI.prototype['query-domain-list'] = create_basic_func(function(args, fn) {
	var my = this, args = args || {},
	    fn = init_err_fn(fn),
	    opts = {};
	if(!my._config.auth_id) return fn(new Error("No auth_id. Try login first."));
	opts['auth-sid'] = ''+my._config.auth_id;
	foreach(['pattern', 'from', 'to', 'showstatus', 'showgrants']).each(function(key) {
		if(args.hasOwnProperty(key)) opts[key] = ''+args[key];
	});
	if(opts.showstatus !== '1') { opts.showstatus = '0'; }
	if(opts.showgrants !== '1') { opts.showgrants = '0'; }
	my.exec('query-domain-list', opts, function(err, response) {
		if(err) return fn(err);
		var domains = response.body;
		//console.log("domains = \n" + domains);
		// FIXME: Prepare domains into array
		fn(undefined, domains);
	});
});

/* Alias for query-domain-list */
JokerDMAPI.prototype.queryDomainList = mod['query-domain-list'];

/* query-whois */
JokerDMAPI.prototype['query-whois'] = create_basic_func(function(args, fn) {
	var my = this, args = args || {},
	    fn = init_err_fn(fn),
	    opts = {};
	if(!my._config.auth_id) return fn(new Error("No auth_id. Try login first."));
	opts['auth-sid'] = ''+my._config.auth_id;
	var opts_len = 0;
	foreach(['domain', 'contact', 'host']).each(function(key) {
		if(args.hasOwnProperty(key)) {
			opts[key] = ''+args[key];
			opts_len += 1;
		}
	});
	if(opts_len !== 1) {
		return fn('Exactly one of accepted options must be specified.');
	}
	my.exec('query-whois', opts, function(err, response) {
		if(err) return fn(err);
		var data = {};
		var lines = response.body.split('\n');
		foreach(lines).each(function(line) {
			var parts = split(/: +/, line, 2);
			var key = parts.shift();
			var value = parts.shift();
			data[key] = value;
		});
		fn(undefined, data);
	});
});

/* Alias for query-whois */
JokerDMAPI.prototype.queryWhois = mod['query-whois'];

/* query-profile */
JokerDMAPI.prototype['query-profile'] = create_basic_func(function(args, fn) {
	var my = this, args = args || {},
	    fn = init_err_fn(fn),
	    opts = {};
	if(!my._config.auth_id) return fn(new Error("No auth_id. Try login first."));
	opts['auth-sid'] = ''+my._config.auth_id;
	my.exec('query-profile', opts, function(err, response) {
		if(err) return fn(err);
		var data = {};
		var lines = response.body.split('\n');
		foreach(lines).each(function(line) {
			var parts = split(/: +/, line, 2);
			var key = parts.shift();
			var value = parts.shift();
			data[key] = value;
		});
		fn(undefined, data);
	});
});

/* Alias for query-profile */
JokerDMAPI.prototype.queryProfile = mod['query-profile'];

/* domain-renew */
JokerDMAPI.prototype['domain-renew'] = create_basic_func(function(args, fn) {
	var my = this, args = args || {},
	    fn = init_err_fn(fn),
	    opts = {};
	if(!my._config.auth_id) return fn(new Error("No auth_id. Try login first."));
	opts['auth-sid'] = ''+my._config.auth_id;
	foreach(['domain', 'period', 'expyear']).each(function(key) {
		if(args.hasOwnProperty(key)) {
			opts[key] = ''+args[key];
		}
	});
	if(!opts.hasOwnProperty('domain')) return fn('Option "domain" is required.');
	var has_period = opts.hasOwnProperty('period') ? true : false;
	var has_expyear = opts.hasOwnProperty('expyear') ? true : false;
	if( (!has_period) && (!has_expyear) ) return fn('One of "period" or "expyear" is required.');
	if(has_period && has_expyear) return fn('Only one of "period" or "expyear" may be used, but not both.');
	my.exec('domain-renew', opts, function(err, response) {
		if(err) return fn(err);
		fn(undefined);
	});
});

/* Alias for query-profile */
JokerDMAPI.prototype.domainRenew = mod['domain-renew'];

/* grants-list */
JokerDMAPI.prototype['grants-list'] = create_basic_func(function(args, fn) {
	var my = this, args = args || {},
	    fn = init_err_fn(fn),
	    opts = {};
	if(!my._config.auth_id) return fn(new Error("No auth_id. Try login first."));
	opts['auth-sid'] = ''+my._config.auth_id;
	foreach(['domain', 'showkey']).each(function(key) {
		if(args.hasOwnProperty(key)) opts[key] = ''+args[key];
	});
	if(!opts.hasOwnProperty('domain')) return fn('Option "domain" is required.');
	my.exec('grants-list', opts, function(err, response) {
		if(err) return fn(err);
		var grants = response.body;
		// FIXME: Prepare into array
		fn(undefined, grants);
	});
});

/* Alias for grants-list */
JokerDMAPI.prototype.grantsList = mod['grants-list'];

/* grants-invite */
JokerDMAPI.prototype['grants-invite'] = create_basic_func(function(args, fn) {
	var my = this, args = args || {},
	    fn = init_err_fn(fn),
	    opts = {};
	if(!my._config.auth_id) return fn(new Error("No auth_id. Try login first."));
	opts['auth-sid'] = ''+my._config.auth_id;
	foreach(['domain', 'email', 'client-uid', 'role', 'nickname']).each(function(key) {
		if(args.hasOwnProperty(key)) {
			opts[key] = ''+args[key];
		}
	});
	if(!opts.hasOwnProperty('domain')) return fn('Option "domain" is required.');
	if(!opts.hasOwnProperty('email')) return fn('Option "email" is required.');
	if(!opts.hasOwnProperty('role')) return fn('Option "role" is required.');
	my.exec('grants-invite', opts, function(err, response) {
		if(err) return fn(err);
		fn(undefined, ''+response.body);
	});
});

/* Alias for query-profile */
JokerDMAPI.prototype.grantsInvite = mod['grants-invite'];

/* domain-modify */
JokerDMAPI.prototype['domain-modify'] = create_basic_func(function(args, fn) {
	var my = this, args = args || {},
	    fn = init_err_fn(fn),
	    opts = {};
	if(!my._config.auth_id) return fn(new Error("No auth_id. Try login first."));
	opts['auth-sid'] = ''+my._config.auth_id;
	foreach(['domain', 'billing-c', 'admin-c', 'tech-c', 'ns-list', 'registrar-tag', 'dnssec', 'ds-1', 'ds-2', 'ds-3', 'ds-4', 'ds-5', 'ds-6']).each(function(key) {
		if(args.hasOwnProperty(key)) {
			opts[key] = ''+args[key];
		}
	});
	if(!opts.hasOwnProperty('domain')) return fn('Option "domain" is required.');
	my.exec('domain-modify', opts, function(err, response) {
		if(err) return fn(err);
		fn(undefined);
	});
});

/* Alias for query-profile */
JokerDMAPI.prototype.domainModify = mod['domain-modify'];

/* EOF */
