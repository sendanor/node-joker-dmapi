"use strict";

var debug = require('nor-debug');
var config = require('./config.json');
var dmapi = require('joker-dmapi');

dmapi.login({'api-key':config['api-key']}).then(function() {
	return dmapi.queryDomainList({'showstatus':true, 'showgrants': false, 'showjokerns': false});
}).then(function(domains) {
	debug.log('domains = ', domains);
}).fail(function(err) {
	debug.error('Error: ', err);
}).done();
