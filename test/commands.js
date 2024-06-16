const WebSocketServer = require('ws').Server;
const tmi = require('../index.js');

const noop = function() {};
const catchConnectError = err => {
	if(err !== 'Connection closed.') {
		console.error(err);
	}
};

// const no_permission = '@msg-id=no_permission :tmi.twitch.tv NOTICE #local7000 :You don\'t have permission.';
// const msg_channel_suspended = '@msg-id=msg_channel_suspended :tmi.twitch.tv NOTICE #local7000 :This channel has been suspended.';

const tests = [ {
	command: 'join',
	inputParams: [ '#local7000' ],
	returnedParams: [ '#local7000' ],
	serverTest: 'JOIN #local7000',
	serverCommand: '@broadcaster-lang=;r9k=0;slow=300;subs-only=0 :tmi.twitch.tv ROOMSTATE #local7000',
	testTimeout: true
}, {
	command: 'leave',
	inputParams: [ '#local7000' ],
	returnedParams: [ '#local7000' ],
	serverTest: 'PART',
	serverCommand(client, ws) {
		const user = client.getUsername();
		ws.send(`:${user}! PART #local7000`);
	},
	testTimeout: true
}, {
	command: 'part',
	inputParams: [ '#local7000' ],
	returnedParams: [ '#local7000' ],
	serverTest: 'PART',
	serverCommand(client, ws) {
		const user = client.getUsername();
		ws.send(`:${user}! PART #local7000`);
	},
	testTimeout: true
}, {
	command: 'raw',
	inputParams: [ '/slowoff' ],
	returnedParams: [ '/slowoff' ],
	serverTest: '/slowoff',
	serverCommand: '@slow=0 :tmi.twitch.tv ROOMSTATE'
} ];

describe('commands (justinfan)', () => {
	beforeEach(function() {
		// Initialize websocket server
		this.server = new WebSocketServer({ port: 7000 });
		this.client = new tmi.Client({
			connection: {
				server: 'localhost',
				port: 7000,
				timeout: 100,
				reconnect: false
			}
		});
	});

	afterEach(function() {
		// Shut down websocket server
		this.server.close();
		this.client = null;
	});

	it('handles commands when disconnected', function(cb) {
		this.client.join('local7000').then(noop, err => {
			err.should.eql('Not connected to server.');
			cb();
		});
	});

	it('handles ping', function(cb) {
		const { client, server } = this;

		server.on('connection', ws => {
			ws.on('message', message => {
				if(~message.indexOf('PING')) {
					ws.send('PONG');
				}
			});
		});

		client.on('logon', () => {
			client.ping().then(latency => {
				latency.should.be.ok();
				client.disconnect();
				cb();
			}, err => {
				err.should.not.be.ok();
				client.disconnect();
				cb();
			});
		});

		client.connect().catch(catchConnectError);
	});

	it('handles ping timeout', function(cb) {
		const { client, server } = this;

		server.on('connection', ws => {
			ws.on('message', _message => {
				ws.send('dummy');
			});
		});

		client.on('logon', () => {
			client.ping().then(noop, err => {
				err.should.be.ok();
				cb();
			});
		});

		client.connect().catch(catchConnectError);
	});

	tests.forEach(test => {
		it(`should handle ${test.command}`, function(cb) {
			const { client, server } = this;

			server.on('connection', ws => {
				ws.on('message', message => {
					// Ensure that the message starts with NICK
					if(message.indexOf('NICK') === 0) {
						const user = client.getUsername();
						ws.send(`:${user}! JOIN #local7000`);
						return;
					}
					// Otherwise, send the command
					if(~message.indexOf(test.serverTest)) {
						if(typeof test.serverCommand === 'function') {
							test.serverCommand(client, ws);
						}
						else {
							ws.send(test.serverCommand);
						}
					}
				});
			});

			client.on('join', function() {
				client[test.command].apply(this, test.inputParams).then(data => {
					test.returnedParams.forEach((param, index) => {
						data[index].should.eql(param);
					});
					client.disconnect();
					cb();
				});
			});

			client.connect().catch(catchConnectError);
		});

		if(test.errorCommands) {
			test.errorCommands.forEach(error => {
				it(`should handle ${test.command} errors`, function(cb) {
					const { client, server } = this;

					server.on('connection', ws => {
						ws.on('message', message => {
							// Ensure that the message starts with NICK
							if(message.indexOf('NICK') === 0) {
								const user = client.getUsername();
								ws.send(`:${user}! JOIN #local7000`);
								return;
							}
							// Otherwise, send the command
							if(~message.indexOf(test.serverTest)) {
								ws.send(error);
							}
						});
					});

					client.on('join', function() {
						client[test.command].apply(this, test.inputParams).then(noop, err => {
							err.should.be.ok();
							client.disconnect();
							cb();
						});
					});

					client.connect().catch(catchConnectError);
				});
			});
		}

		if(test.testTimeout) {
			it(`should handle ${test.command} timeout`, function(cb) {
				const { client, server } = this;

				server.on('connection', ws => {
					ws.on('message', message => {
						// Ensure that the message starts with NICK
						if(message.indexOf('NICK') === 0) {
							ws.send('dummy');
							return;
						}
					});
				});

				client.on('logon', function() {
					client[test.command].apply(this, test.inputParams).then(noop, err => {
						err.should.be.ok();
						client.disconnect();
						cb();
					});
				});

				client.connect().catch(catchConnectError);
			});
		}
	});
});

describe('commands (identity)', () => {
	beforeEach(function() {
		// Initialize websocket server
		this.server = new WebSocketServer({ port: 7000 });
		this.client = new tmi.Client({
			connection: {
				server: 'localhost',
				port: 7000
			},
			identity: {
				password: 'oauth:notschmoopiie'
			}
		});
	});

	afterEach(function() {
		// Shut down websocket server
		this.server.close();
		this.client = null;
	});

	/**
	 * @param {WebSocket} ws
	 * @param {Buffer} message
	 */
	function respondWithClientNonce(ws, message) {
		if(!message.includes('PRIVMSG')) {
			return;
		}
		const nonceBase = 'client-nonce=tmi.js_';
		const nonceStart = message.indexOf(nonceBase);
		if(nonceStart === -1) {
			throw new Error('Nonce not found in PRIVMSG');
		}
		const nextSemicolon = message.indexOf(';', nonceStart);
		const nextSpace = message.indexOf(' ', nonceStart);
		const nonceEnd = ~nextSemicolon ? nextSemicolon : ~nextSpace ? nextSpace : message.length;
		const nonce = message.subarray(nonceStart, nonceEnd - nonceStart + 1);
		ws.send(`@badge-info=;${nonce};color=#177DE3;display-name=;emote-sets=;id=123456;mod=0;subscriber=1;user-type= :tmi.twitch.tv USERSTATE #local7000`);
	}

	it('should handle action', function(cb) {
		const { client, server } = this;

		server.on('connection', ws => ws.on('message', message => respondWithClientNonce(ws, message)));

		client.on('logon', () => {
			client.action('#local7000', 'Hello').then(data => {
				try {
					data[0].should.eql('#local7000');
					data[1].should.eql('Hello');
					client.disconnect();
					cb();
				} catch(err) {
					cb(err);
				}
			}, cb);
		});

		client.connect().catch(catchConnectError);
	});

	it('should handle say', function(cb) {
		const { client, server } = this;

		server.on('connection', ws => ws.on('message', message => respondWithClientNonce(ws, message)));

		client.on('logon', () => {
			client.say('#local7000', 'Hello').then(data => {
				try {
					data[0].should.eql('#local7000');
					data[1].should.eql('Hello');
					client.disconnect();
					cb();
				} catch(err) {
					cb(err);
				}
			}, cb);
		});

		client.connect().catch(catchConnectError);
	});

	it('should handle say when disconnected', function(cb) {
		this.client.say('#local7000', 'Hello!').then(noop, err => {
			err.should.eql('Not connected to server.');
			cb();
		});
	});

	it('should break up long messages (> 500 characters)', function(cb) {
		const { client, server } = this;
		const lorem = 'lorem '.repeat(89) + 'ipsum';
		let calls = 0;

		server.on('connection', ws => ws.on('message', message => respondWithClientNonce(ws, message)));

		client.on('chat', (channel, user, message) => {
			calls++;
			if(calls > 1) {
				message.should.containEql('ipsum');
				client.disconnect();
				cb();
			}
		});

		client.on('logon', () => client.say('#local7000', lorem).catch(cb));

		client.connect().catch(catchConnectError);
	});

	it('should break up long messages without spaces (> 500 characters)', function(cb) {
		const { client, server } = this;
		const lorem = 'lorem'.repeat(100) + 'ipsum';
		let calls = 0;

		server.on('connection', ws => ws.on('message', message => respondWithClientNonce(ws, message)));

		client.on('chat', (channel, user, message) => {
			calls++;
			if(calls > 1) {
				message.should.containEql('ipsum');
				client.disconnect();
				cb();
			}
		});

		client.on('logon', () => client.say('#local7000', lorem).catch(cb));

		client.connect().catch(catchConnectError);
	});
});
