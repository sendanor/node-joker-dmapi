"use strict";

/* 
 * Joker.com DMAPI client library
 * http://github.com/sendanor/node-joker-dmapi
 * Version 1.0.0
 */

/*
 * Copyright (C) 2011-2017 by Jaakko-Heikki Heusala <jheusala@iki.fi>
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

var q = require('q');
var debug = require('nor-debug');
var util = require("util");
var events = require("events");
var util = require("util");
var events = require("events");
var https = require('https');
var querystring = require('querystring');
var snippets = require('snippets');
var foreach = snippets.foreach;
var split = snippets.split;
var pass = snippets.pass;

/* Parse DMAPI response body */
function parse_response_body(data) {
	var response = {'headers':{}, 'body':''};
	pass(split(/\n\n/, ""+data, 2)).on(function(headers, body) {
		foreach(headers.split("\n")).do(function(line) {
			pass(split(/: */, ""+line, 2)).on(function(name, value) {
				response.headers[(""+name).toLowerCase()] = value;
			});
		});
		if (body) {
			response.body = body;
		}
	});
	return response;
}

/** Constructor */
function JokerDMAPI () {
	if (!(this instanceof JokerDMAPI)) {
		return new JokerDMAPI();
	}
	var my = this;
	events.EventEmitter.call(my);
	my._config = {
		'host': 'dmapi.joker.com',
		'port': 443
	};
}
util.inherits(JokerDMAPI, events.EventEmitter);

/* Configure DMAPI from outside */
JokerDMAPI.prototype.config = function JokerDMAPI_prototype_config (data) {
	var my = this;
	foreach(data).each(function JokerDMAPI_prototype_config_foreach (v, k) {
		my._config[k] = v;
	});
	return my;
};

/* Post generic request */
JokerDMAPI.prototype._exec = function JokerDMAPI_prototype__exec (name, args) {
	var my = this;
	return q.fcall(function JokerDMAPI_prototype__exec_ () {

		var deferred = q.defer();
		var msg = querystring.stringify(args);
		var options = {
			'host': my._config.host || 'dmapi.joker.com',
			'port': my._config.port || 443,
			'path': '/request/'+name,
			'method': 'POST',
			'headers':{'Content-length':msg.length}
		};
		var data = '';

		var req = https.request(options, function JokerDMAPI_prototype__exec_request (res) {

			//debug.log('STATUS: ' + res.statusCode);
			//debug.log('HEADERS: ' + JSON.stringify(res.headers));
			//res.setEncoding('utf8');

			res.on('data', function JokerDMAPI_prototype__exec_on_data (chunk) {
				data += chunk;
			});

			res.on('end', function JokerDMAPI_prototype__exec_on_end () {
				var response = parse_response_body(data);
				response.status = res.statusCode;
				deferred.resolve(response);
			});

		});

		req.on('error', function JokerDMAPI_prototype__exec_on_error (e) {
			my.emit('error', e);
			deferred.reject(e);
		});

		req.end(msg);

		return deferred.promise;
	});
};

/* Login */
JokerDMAPI.prototype.login = function JokerDMAPI_prototype_login (args) {
	var my = this;
	args = args || {};
	debug.assert(my).is('object');
	debug.assert(args).is('object');
	var opts = args.hasOwnProperty('api-key') ? {'api-key': args['api-key']} : {'username':args.username, 'password':args.password};
	return my._exec('login', opts).then(function JokerDMAPI_prototype_login_ (response) {
		var auth_id = response.headers['auth-sid'];
		var uid = response.headers.uid;
		var tlds = response.body.split("\n");
		my._config.auth_id = auth_id;
		return {'auth_id':auth_id, 'uid':uid, 'tlds':tlds};
	});
};

/* Logout */
JokerDMAPI.prototype.logout = function JokerDMAPI_prototype_logout (args) {
	var my = this;
	args = args || {};
	return my._exec('logout').then(function JokerDMAPI_prototype_logout_ () {
		if (my._config) {
			my._config.auth_id = undefined;
		}
	});
};

/* query-domain-list */
JokerDMAPI.prototype['query-domain-list'] = function JokerDMAPI_prototype_query_domain_list (args) {
	var my = this;
	args = args || {};
	var opts = {};
	if (!my._config.auth_id) {
		throw new Error("No auth_id. Try login first.");
	}
	opts['auth-sid'] = ''+my._config.auth_id;
	foreach(['pattern', 'from', 'to', 'showstatus', 'showgrants']).each(function JokerDMAPI_prototype_query_domain_list_ (key) {
		if (args.hasOwnProperty(key)) {
			opts[key] = ''+args[key];
		}
	});
	if (opts.showstatus !== '1') { opts.showstatus = '0'; }
	if (opts.showgrants !== '1') { opts.showgrants = '0'; }
	return my._exec('query-domain-list', opts).then(function JokerDMAPI_prototype_query_domain_list_2 (response) {
		var domains = response.body;

		// FIXME: Prepare domains into array
		debug.log("domains = ", domains);

		return domains;
	});
};

/* Alias for query-domain-list */
JokerDMAPI.prototype.queryDomainList = JokerDMAPI.prototype['query-domain-list'];

/* query-whois */
JokerDMAPI.prototype['query-whois'] = function JokerDMAPI_prototype_query_whois (args) {
	var my = this;
	args = args || {};
	var opts = {};
	if (!my._config.auth_id) {
		throw new Error("No auth_id. Try login first.");
	}
	opts['auth-sid'] = ''+my._config.auth_id;
	var opts_len = 0;
	foreach(['domain', 'contact', 'host']).each(function JokerDMAPI_prototype_query_whois_ (key) {
		if (args.hasOwnProperty(key)) {
			opts[key] = ''+args[key];
			opts_len += 1;
		}
	});
	if (opts_len !== 1) {
		throw new TypeError('Exactly one of accepted options must be specified.');
	}
	return my._exec('query-whois', opts).then(function JokerDMAPI_prototype_query_whois_2 (response) {
		var data = {};
		var lines = response.body.split('\n');
		foreach(lines).each(function JokerDMAPI_prototype_query_whois_3 (line) {
			var parts = split(/: +/, line, 2);
			var key = parts.shift();
			var value = parts.shift();
			data[key] = value;
		});
		return data;
	});
};

/* Alias for query-whois */
JokerDMAPI.prototype.queryWhois = JokerDMAPI.prototype['query-whois'];

/* query-profile */
JokerDMAPI.prototype['query-profile'] = function JokerDMAPI_prototype_query_profile (args) {
	var my = this;
	args = args || {};
	var opts = {};
	if (!my._config.auth_id) {
		throw new Error("No auth_id. Try login first.");
	}
	opts['auth-sid'] = ''+my._config.auth_id;
	return my._exec('query-profile', opts).then(function JokerDMAPI_prototype_query_profile_1 (response) {
		var data = {};
		var lines = response.body.split('\n');
		foreach(lines).each(function JokerDMAPI_prototype_query_profile_2 (line) {
			var parts = split(/: +/, line, 2);
			var key = parts.shift();
			var value = parts.shift();
			data[key] = value;
		});
		return data;
	});
};

/* Alias for query-profile */
JokerDMAPI.prototype.queryProfile = JokerDMAPI.prototype['query-profile'];

/* domain-renew */
JokerDMAPI.prototype['domain-renew'] = function JokerDMAPI_prototype_domain_renew (args) {
	var my = this;
	args = args || {};
	var opts = {};
	if (!my._config.auth_id) {
		throw new Error("No auth_id. Try login first.");
	}
	opts['auth-sid'] = ''+my._config.auth_id;
	foreach(['domain', 'period', 'expyear']).each(function JokerDMAPI_prototype_domain_renew_1 (key) {
		if (args.hasOwnProperty(key)) {
			opts[key] = ''+args[key];
		}
	});
	if (!opts.hasOwnProperty('domain')) {
		throw new TypeError('Option "domain" is required.');
	}
	var has_period = opts.hasOwnProperty('period') ? true : false;
	var has_expyear = opts.hasOwnProperty('expyear') ? true : false;
	if ( (!has_period) && (!has_expyear) ) {
		throw new TypeError('One of "period" or "expyear" is required.');
	}
	if (has_period && has_expyear) {
		throw new TypeError('Only one of "period" or "expyear" may be used, but not both.');
	}
	return my._exec('domain-renew', opts);
};

/* Alias for query-profile */
JokerDMAPI.prototype.domainRenew = JokerDMAPI.prototype['domain-renew'];

/* grants-list */
JokerDMAPI.prototype['grants-list'] = function JokerDMAPI_prototype_grants_list (args) {
	var my = this;
	args = args || {};
	var opts = {};
	if (!my._config.auth_id) {
		throw new Error("No auth_id. Try login first.");
	}
	opts['auth-sid'] = ''+my._config.auth_id;
	foreach(['domain', 'showkey']).each(function JokerDMAPI_prototype_grants_list_1 (key) {
		if (args.hasOwnProperty(key)) {
			opts[key] = ''+args[key];
		}
	});
	if (!opts.hasOwnProperty('domain')) {
		throw new TypeError('Option "domain" is required.');
	}
	return my._exec('grants-list', opts).then(function JokerDMAPI_prototype_grants_list_2 (response) {
		var grants = response.body;

		// FIXME: Prepare into array
		debug.log("grants = ", grants);

		return grants;
	});
};

/* Alias for grants-list */
JokerDMAPI.prototype.grantsList = JokerDMAPI.prototype['grants-list'];

/* grants-invite */
JokerDMAPI.prototype['grants-invite'] = function JokerDMAPI_prototype_grants_invite (args) {
	var my = this;
	args = args || {};
	var opts = {};
	if (!my._config.auth_id) {
		throw new Error("No auth_id. Try login first.");
	}
	opts['auth-sid'] = ''+my._config.auth_id;
	foreach(['domain', 'email', 'client-uid', 'role', 'nickname']).each(function JokerDMAPI_prototype_grants_invite_1 (key) {
		if (args.hasOwnProperty(key)) {
			opts[key] = ''+args[key];
		}
	});
	if (!opts.hasOwnProperty('domain')) {
		throw new TypeError('Option "domain" is required.');
	}
	if (!opts.hasOwnProperty('email')) {
		throw new TypeError('Option "email" is required.');
	}
	if (!opts.hasOwnProperty('role')) {
		throw new TypeError('Option "role" is required.');
	}
	return my._exec('grants-invite', opts).then(function JokerDMAPI_prototype_grants_invite_2 (response) {
		return ''+response.body;
	});
};

/* Alias for query-profile */
JokerDMAPI.prototype.grantsInvite = JokerDMAPI.prototype['grants-invite'];

/* domain-modify */
JokerDMAPI.prototype['domain-modify'] = function JokerDMAPI_prototype_domain_modify (args) {
	var my = this;
	args = args || {};
	var opts = {};
	if (!my._config.auth_id) {
		throw new TypeError(new Error("No auth_id. Try login first."));
	}
	opts['auth-sid'] = ''+my._config.auth_id;
	foreach(['domain', 'billing-c', 'admin-c', 'tech-c', 'ns-list', 'registrar-tag', 'dnssec', 'ds-1', 'ds-2', 'ds-3', 'ds-4', 'ds-5', 'ds-6']).each(function JokerDMAPI_prototype_domain_modify_1 (key) {
		if (args.hasOwnProperty(key)) {
			opts[key] = ''+args[key];
		}
	});
	if (!opts.hasOwnProperty('domain')) {
		throw new TypeError('Option "domain" is required.');
	}
	return my._exec('domain-modify', opts);
};

/* Alias for query-profile */
JokerDMAPI.prototype.domainModify = JokerDMAPI.prototype['domain-modify'];

// Exports
module.exports = JokerDMAPI;

/* EOF */
