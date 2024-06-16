const WebSocketServer = require('ws').Server;
const tmi = require('../index.js');

const noop = function() {};
const catchConnectError = err => {
	if(![ 'Connection closed.', 'Login unsuccessful.', 'Error logging in.', 'Invalid NICK.' ].includes(err)) {
		console.error(err);
	}
};

const tests = [
	':tmi.twitch.tv NOTICE #schmoopiie :Login unsuccessful.',
	':tmi.twitch.tv NOTICE #schmoopiie :Error logging in.',
	':tmi.twitch.tv NOTICE #schmoopiie :Invalid NICK.'
];

describe('handling authentication', () => {
	beforeEach(function() {
		// Initialize websocket server
		this.server = new WebSocketServer({ port: 7000 });
		this.client = new tmi.Client({
			logger: {
				error: noop,
				info: noop
			},
			connection: {
				server: 'localhost',
				port: 7000,
				timeout: 1
			}
		});
	});

	afterEach(function() {
		// Shut down websocket server
		this.server.close();
		this.client = null;
	});

	tests.forEach(test => {
		it(`handle ${test}`, function(cb) {
			const { client, server } = this;

			const parts = test.split(':');
			const message = parts[parts.length - 1].trim();

			server.on('connection', ws => {
				ws.on('message', message => {
					if(message.indexOf('NICK') === 0) {
						ws.send(test);
					}
				});
			});

			client.on('disconnected', reason => {
				reason.should.eql(message);
				cb();
			});

			client.connect().catch(catchConnectError);
		});
	});
});
