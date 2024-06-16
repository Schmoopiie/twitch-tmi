const _ = require('./utils');

module.exports = {
	// Send an action message (/me <message>) to a channel..
	action(channel, message) {
		return this.say(channel, `/me ${message}`);
	},

	// Join a channel by name..
	async join(channel) {
		channel = _.channel(channel);
		_.validateChannel(channel);
		// Send the command to the server ..
		return this._sendCommand(undefined, null, `JOIN ${channel}`, (resolve, reject) => {
			const eventName = '_promiseJoin';
			let hasFulfilled = false;
			const listener = (err, joinedChannel) => {
				if(channel === _.channel(joinedChannel)) {
					// Received _promiseJoin event for the target channel, resolve or reject..
					this.removeListener(eventName, listener);
					hasFulfilled = true;
					if(!err) { resolve([ channel ]); }
					else { reject(err); }
				}
			};
			this.on(eventName, listener);
			// Race the Promise against a delay..
			const delay = this._getPromiseDelay();
			_.promiseDelay(delay).then(() => {
				if(!hasFulfilled) {
					this.emit(eventName, 'No response from Twitch.', channel);
				}
			});
		});
	},

	// Leave a channel..
	async part(channel) {
		channel = _.channel(channel);
		_.validateChannel(channel);
		return this._sendCommand(null, null, `PART ${channel}`, (resolve, reject) => {
			// Received _promisePart event, resolve or reject..
			this.once('_promisePart', err => {
				if(!err) { resolve([ channel ]); }
				else { reject(err); }
			});
		});
	},

	// Alias for part()..
	leave(channel) {
		return this.part(channel);
	},

	// Send a ping to the server..
	ping() {
		return this._sendCommand(null, null, 'PING', (resolve, _reject) => {
			this.latency = new Date();
			this._setPingLoop();

			// Received _promisePing event, resolve or reject..
			this.once('_promisePing', latency => resolve([ parseFloat(latency) ]));
		});
	},

	// Send a raw message to the server..
	raw(message) {
		return this._sendCommand(null, null, message, (resolve, _reject) => resolve([ message ]));
	},

	// Send a message on a channel..
	async say(channel, message, tags = {}) {
		channel = _.channel(channel);
		_.validateChannel(channel);

		const text = message.startsWith('/me ') ? message.slice(4) : message;
		return this._sendMessage(this._getPromiseDelay(), channel, message, tags, (resolve, reject, clientNonce) => {
			const eventName = 'userstate';
			let hasFulfilled = false;
			const listener = (eventChannel, eventTags) => {
				if(channel === eventChannel && eventTags['client-nonce'] === clientNonce) {
					this.removeListener(eventName, listener);
					hasFulfilled = true;
					resolve([ channel, text, eventTags, true ]);
				}
			};
			this.on(eventName, listener);
			// Race the Promise against a delay..
			const delay = this._getPromiseDelay();
			_.promiseDelay(delay).then(() => {
				if(!hasFulfilled) {
					this.removeListener(eventName, listener);
					reject('No response from Twitch.');
				}
			});
		});
	}
};
