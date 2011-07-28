
var config = require('./config.js'),
    dmapi = require('joker-dmapi'),

dmapi.on('error', function(err) {
	console.log("Error: " + err);
});

dmapi.login({'username':config.username, 'password':config.password}, function(session) {
	session.queryDomainList(function(domains) {
		
	});
});
