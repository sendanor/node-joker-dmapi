
/* Standalone example of listing Joker.com domains with DMAPI */

var config = require('./config.js'),
    https = require('https'),
    querystring = require('querystring'),
    snippets = require('snippets'),
    foreach = snippets.foreach,
    split = snippets.split,
	pass = snippets.pass,
	sys = require('sys');

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
function joker_exec(name, args, callback) {
	var msg = querystring.stringify(args),
	    options = {
			'host': 'dmapi.joker.com',
			'port': 443, 
			'path': '/request/'+name,
			'method': 'POST',
			'headers':{'Content-length':msg.length}
		};
	
	var data = '',
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
				callback(response);
			});
		});
	
	req.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});
	
	req.end(msg);
}

joker_exec('login', {'username':config.username, 'password':config.password}, function(response) {
	var auth_id = response.headers['auth-sid'];
	    tlds    = response.body.split("\n");
	console.log("auth_id = " + auth_id + "\n" + 
	            "tlds    = " + tlds.join(', ') + "\n");
	joker_exec('query-domain-list', {'auth-sid':auth_id}, function(response) {
		var domains = response.body;
		console.log("domains = \n" + domains);
	});
});

/* EOF */
