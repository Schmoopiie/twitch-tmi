const tmi = require('../index.js');

describe('client()', () => {
	it('uses the \'info\' log when debug is set', () => {
		const client = new tmi.Client({ options: { debug: true } });
		client.should.be.ok();
	});

	it('normalize channel names', () => {
		const client = new tmi.Client({ channels: [ 'avalonstar', '#dayvemsee' ] });
		client.opts.channels.should.eql([ '#avalonstar', '#dayvemsee' ]);
	});

	it('should default secure to true when opts.connection.server and opts.connection.port not set', () => {
		let client = new tmi.Client();
		client.secure.should.eql(true);
		client = new tmi.Client({ connection: {} });
		client.secure.should.eql(true);
	});
	it('should default secure to false when opts.connection.server or opts.connection.port set', () => {
		let client = new tmi.Client({ connection: { server: 'localhost' } });
		client.secure.should.eql(false);
		client = new tmi.Client({ connection: { port: 1 } });
		client.secure.should.eql(false);
		client = new tmi.Client({ connection: { server: 'localhost', port: 1 } });
		client.secure.should.eql(false);
	});
});

describe('client getters', () => {
	it('gets options', () => {
		const opts = { options: { debug: true } };
		const client = new tmi.Client(opts);
		client.getOptions().should.eql(opts);
	});

	it('gets channels', () => {
		const client = new tmi.Client();
		client.getChannels().should.eql([]);
	});
});
