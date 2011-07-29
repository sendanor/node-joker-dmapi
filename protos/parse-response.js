
var sys = require('sys'),
    snippets = require('snippets'),
    foreach = snippets.foreach,
    split = snippets.split,
	pass = snippets.pass;

function parse_response_body(data) {
	var response = {'headers':{}, 'body':''};
	pass(split(/\n\n/, ""+data, 2)).on(function(headers, body) {
		foreach(headers.split("\n")).do(function(line) {
			pass(split(/: */, ""+line, 2)).on(function(name, value) {
				response.headers[name] = value;
			});
		});
		if(body) response.body = body;
	});
	return response;
}

var fs = require('fs');
var response = parse_response_body(fs.readFileSync('response.txt'));

console.log(sys.inspect(response));
