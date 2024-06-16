const _ = require('./utils');

module.exports = {
	// Send an action message (/me <message>) to a channel..
	action(channel, message) {
		channel = _.channel(channel);
		message = `\u0001ACTION ${message}\u0001`;
		// Send the command to the server and race the Promise against a delay..
		return this._sendMessage(this._getPromiseDelay(), channel, message, (resolve, _reject) => {
			// At this time, there is no possible way to detect if a message has been sent has been eaten
			// by the server, so we can only resolve the Promise.
			resolve([ channel, message ]);
		});
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
		// Send the command to the server and race the Promise against a delay..
		return this._sendCommand(null, null, message, (resolve, _reject) => {
			resolve([ message ]);
		});
	},

	// Send a message on a channel..
	async say(channel, message) {
		channel = _.channel(channel);
		_.validateChannel(channel);

		if((message.startsWith('.') && !message.startsWith('..')) || message.startsWith('/') || message.startsWith('\\')) {
			// Check if the message is an action message..
			if(message.substr(1, 3) === 'me ') {
				return this.action(channel, message.substr(4));
			}
			else {
				// Send the command to the server and race the Promise against a delay..
				return this._sendCommand(null, channel, message, (resolve, _reject) => {
					// At this time, there is no possible way to detect if a message has been sent has been eaten
					// by the server, so we can only resolve the Promise.
					resolve([ channel, message ]);
				});
			}
		}
		// Send the command to the server and race the Promise against a delay..
		return this._sendMessage(this._getPromiseDelay(), channel, message, (resolve, _reject) => {
			// At this time, there is no possible way to detect if a message has been sent has been eaten
			// by the server, so we can only resolve the Promise.
			resolve([ channel, message ]);
		});
	}
};
