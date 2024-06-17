const _global = typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : {};
const _WebSocket = _global.WebSocket || require('ws');
const EventEmitter = require('./events');
const logger = require('./logger');
const parse = require('./parser');
const Queue = require('./timer');
const _ = require('./utils');

// Client instance..
class client extends EventEmitter {
	constructor(opts) {
		super();
		this.opts = opts ?? {};
		this.opts.channels = this.opts.channels ?? [];
		this.opts.connection = this.opts.connection ?? {};
		this.opts.identity = this.opts.identity ?? {};
		this.opts.options = this.opts.options ?? {};

		this.clientId = this.opts.options.clientId ?? null;
		this._globalDefaultChannel = _.channel(this.opts.options.globalDefaultChannel ?? '#tmijs');
		this._skipMembership = this.opts.options.skipMembership ?? false;

		const { connection } = this.opts;
		this.maxReconnectAttempts = connection.maxReconnectAttempts ?? Infinity;
		this.maxReconnectInterval = connection.maxReconnectInterval ?? 30000;
		this.reconnect = connection.reconnect ?? true;
		this.reconnectDecay = connection.reconnectDecay ?? 1.5;
		this.reconnectInterval = connection.reconnectInterval ?? 1000;

		this.reconnecting = false;
		this.reconnections = 0;
		this.reconnectTimer = this.reconnectInterval;

		this.secure = connection.secure ?? (!connection.server && !connection.port);

		// Raw data and object for emote-sets..
		this.emotes = '';
		this.emotesets = {};

		this.channels = [];
		this.currentLatency = 0;
		this.globaluserstate = {};
		this.lastJoined = '';
		this.latency = new Date();
		this.moderators = {};
		this.pingLoop = null;
		this.pingTimeout = null;
		this.reason = '';
		this.username = '';
		this.userstate = {};
		this.wasCloseCalled = false;
		this.ws = null;

		// Create the logger..
		let level = 'error';
		if(this.opts.options.debug) { level = 'info'; }
		this.log = this.opts.logger ?? logger;

		try { logger.setLevel(level); } catch(err) {}

		// Format the channel names..
		this.opts.channels.forEach((n, i, a) => a[i] = _.channel(n));
	}
	// Handle parsed chat server message..
	handleMessage(message) {
		if(!message) {
			return;
		}

		if(this.listenerCount('raw_message')) {
			this.emit('raw_message', JSON.parse(JSON.stringify(message)), message);
		}

		const channel = _.channel(message.params[0] ?? null);
		let msg = message.params[1] ?? null;
		const msgid = message.tags['msg-id'] ?? null;

		// Parse badges, badge-info and emotes..
		const tags = message.tags = parse.badges(parse.badgeInfo(parse.emotes(message.tags)));

		// Transform IRCv3 tags..
		for(const key in tags) {
			if(key === 'emote-sets' || key === 'ban-duration' || key === 'bits') {
				continue;
			}
			let value = tags[key];
			if(typeof value === 'boolean') { value = null; }
			else if(value === '1') { value = true; }
			else if(value === '0') { value = false; }
			else if(typeof value === 'string') { value = _.unescapeIRC(value); }
			tags[key] = value;
		}

		// Messages with no prefix..
		if(message.prefix === null) {
			switch(message.command) {
				// Received PING from server..
				case 'PING':
					this.emit('ping');
					if(this._isConnected()) {
						this.ws.send('PONG');
					}
					break;

				// Received PONG from server, return current latency..
				case 'PONG': {
					const currDate = new Date();
					this.currentLatency = (currDate.getTime() - this.latency.getTime()) / 1000;
					this.emits([ 'pong', '_promisePing' ], [ [ this.currentLatency ] ]);

					clearTimeout(this.pingTimeout);
					break;
				}

				default:
					this.log.warn(`Could not parse message with no prefix:\n${JSON.stringify(message, null, 4)}`);
					break;
			}
		}

		// Messages with "tmi.twitch.tv" as a prefix..
		else if(message.prefix === 'tmi.twitch.tv') {
			switch(message.command) {
				case '002':
				case '003':
				case '004':
				case '372':
				case '375':
				case 'CAP':
					break;

				// Retrieve username from server..
				case '001':
					this.username = message.params[0];
					break;

				// Connected to server..
				case '376': {
					this.log.info('Connected to server.');
					this.userstate[this._globalDefaultChannel] = {};
					this.emits([ 'connected', '_promiseConnect' ], [ [ this.server, this.port ], [ null ] ]);
					this.reconnections = 0;
					this.reconnectTimer = this.reconnectInterval;

					this._setPingLoop();

					// Join all the channels from the config with an interval..
					let joinInterval = this.opts.options.joinInterval ?? 2000;
					if(joinInterval < 300) {
						joinInterval = 300;
					}
					const joinQueue = new Queue(joinInterval);
					const joinChannels = [ ...new Set([ ...this.opts.channels, ...this.channels ]) ];
					this.channels = [];

					for(let i = 0; i < joinChannels.length; i++) {
						const channel = joinChannels[i];
						joinQueue.add(() => {
							if(this._isConnected()) {
								this.join(channel).catch(err => this.log.error(err));
							}
						});
					}

					joinQueue.next();
					break;
				}

				case 'NOTICE': {
					const nullArr = [ null ];
					const noticeArr = [ channel, msgid, msg ];
					const channelTrueArr = [ channel, true ];
					const channelFalseArr = [ channel, false ];
					const basicLog = `[${channel}] ${msg}`;
					switch(msgid) {
						// This room is now in subscribers-only mode.
						case 'subs_on':
							this.log.info(`[${channel}] This room is now in subscribers-only mode.`);
							this.emits([ 'subscriber', 'subscribers', '_promiseSubscribers' ], [ channelTrueArr, channelTrueArr, nullArr ]);
							break;

						// This room is no longer in subscribers-only mode.
						case 'subs_off':
							this.log.info(`[${channel}] This room is no longer in subscribers-only mode.`);
							this.emits([ 'subscriber', 'subscribers', '_promiseSubscribersoff' ], [ channelFalseArr, channelFalseArr, nullArr ]);
							break;

						// This room is now in emote-only mode.
						case 'emote_only_on':
							this.log.info(`[${channel}] This room is now in emote-only mode.`);
							this.emits([ 'emoteonly', '_promiseEmoteonly' ], [ channelTrueArr, nullArr ]);
							break;

						// This room is no longer in emote-only mode.
						case 'emote_only_off':
							this.log.info(`[${channel}] This room is no longer in emote-only mode.`);
							this.emits([ 'emoteonly', '_promiseEmoteonlyoff' ], [ channelFalseArr, nullArr ]);
							break;

						// Do not handle slow_on/off here, listen to the ROOMSTATE notice instead as it returns the delay.
						case 'slow_on':
						case 'slow_off':
							break;

						// Do not handle followers_on/off here, listen to the ROOMSTATE notice instead as it returns the delay.
						case 'followers_on_zero':
						case 'followers_on':
						case 'followers_off':
							break;

						// This room is now in r9k mode.
						case 'r9k_on':
							this.log.info(`[${channel}] This room is now in r9k mode.`);
							this.emits([ 'r9kmode', 'r9kbeta', '_promiseR9kbeta' ], [ channelTrueArr, channelTrueArr, nullArr ]);
							break;

						// This room is no longer in r9k mode.
						case 'r9k_off':
							this.log.info(`[${channel}] This room is no longer in r9k mode.`);
							this.emits([ 'r9kmode', 'r9kbeta', '_promiseR9kbetaoff' ], [ channelFalseArr, channelFalseArr, nullArr ]);
							break;

						// Permission error..
						case 'no_permission':
						case 'msg_banned':
						case 'msg_room_not_found':
						case 'msg_channel_suspended':
						case 'tos_ban':
						case 'invalid_user':
							this.log.info(basicLog);
							this.emits([
								'notice',
								'_promiseJoin',
								'_promisePart'
							], [ noticeArr, [ msgid, channel ] ]);
							break;

						// Automod-related..
						case 'msg_rejected':
						case 'msg_rejected_mandatory':
							this.log.info(basicLog);
							this.emit('automod', channel, msgid, msg);
							break;

						// Unrecognized command..
						case 'unrecognized_cmd':
							this.log.info(basicLog);
							this.emit('notice', channel, msgid, msg);
							break;

						// Send the following msg-ids to the notice event listener..
						case 'cmds_available':
						case 'msg_censored_broadcaster':
						case 'msg_duplicate':
						case 'msg_emoteonly':
						case 'msg_verified_email':
						case 'msg_ratelimit':
						case 'msg_subsonly':
						case 'msg_timedout':
						case 'msg_bad_characters':
						case 'msg_channel_blocked':
						case 'msg_facebook':
						case 'msg_followersonly':
						case 'msg_followersonly_followed':
						case 'msg_followersonly_zero':
						case 'msg_slowmode':
						case 'msg_suspended':
						case 'no_help':
						case 'usage_disconnect':
						case 'usage_help':
						case 'usage_me':
						case 'unavailable_command':
							this.log.info(basicLog);
							this.emit('notice', channel, msgid, msg);
							break;

						default:
							if(msg.includes('Login unsuccessful') || msg.includes('Login authentication failed')) {
								this.wasCloseCalled = false;
								this.reconnect = false;
								this.reason = msg;
								this.log.error(this.reason);
								this.ws.close();
							}
							else if(msg.includes('Error logging in') || msg.includes('Improperly formatted auth')) {
								this.wasCloseCalled = false;
								this.reconnect = false;
								this.reason = msg;
								this.log.error(this.reason);
								this.ws.close();
							}
							else if(msg.includes('Invalid NICK')) {
								this.wasCloseCalled = false;
								this.reconnect = false;
								this.reason = 'Invalid NICK.';
								this.log.error(this.reason);
								this.ws.close();
							}
							else {
								this.log.warn(`Could not parse NOTICE from tmi.twitch.tv:\n${JSON.stringify(message, null, 4)}`);
								this.emit('notice', channel, msgid, msg);
							}
							break;
					}
					break;
				}

				// Handle subanniversary / resub..
				case 'USERNOTICE': {
					const username = tags['display-name'] || tags['login'];
					const plan = tags['msg-param-sub-plan'] || '';
					const planName = _.unescapeIRC(tags['msg-param-sub-plan-name'] ?? '') || null;
					const prime = plan.includes('Prime');
					const methods = { prime, plan, planName };
					const streakMonths = ~~(tags['msg-param-streak-months'] || 0);
					const recipient = tags['msg-param-recipient-display-name'] || tags['msg-param-recipient-user-name'];
					const giftSubCount = ~~tags['msg-param-mass-gift-count'];
					tags['message-type'] = msgid;

					switch(msgid) {
						// Handle resub
						case 'resub':
							this.emits([ 'resub', 'subanniversary' ], [
								[ channel, username, streakMonths, msg, tags, methods ]
							]);
							break;

						// Handle sub
						case 'sub':
							this.emits([ 'subscription', 'sub' ], [
								[ channel, username, methods, msg, tags ]
							]);
							break;

						// Handle gift sub
						case 'subgift':
							this.emit('subgift', channel, username, streakMonths, recipient, methods, tags);
							break;

						// Handle anonymous gift sub
						// Need proof that this event occur
						case 'anonsubgift':
							this.emit('anonsubgift', channel, streakMonths, recipient, methods, tags);
							break;

						// Handle random gift subs
						case 'submysterygift':
							this.emit('submysterygift', channel, username, giftSubCount, methods, tags);
							break;

						// Handle anonymous random gift subs
						// Need proof that this event occur
						case 'anonsubmysterygift':
							this.emit('anonsubmysterygift', channel, giftSubCount, methods, tags);
							break;

						// Handle user upgrading from Prime to a normal tier sub
						case 'primepaidupgrade':
							this.emit('primepaidupgrade', channel, username, methods, tags);
							break;

						// Handle user upgrading from a gifted sub
						case 'giftpaidupgrade': {
							const sender = tags['msg-param-sender-name'] || tags['msg-param-sender-login'];
							this.emit('giftpaidupgrade', channel, username, sender, tags);
							break;
						}

						// Handle user upgrading from an anonymous gifted sub
						case 'anongiftpaidupgrade':
							this.emit('anongiftpaidupgrade', channel, username, tags);
							break;

						// Handle raid
						case 'raid': {
							const username = tags['msg-param-displayName'] || tags['msg-param-login'];
							const viewers = +tags['msg-param-viewerCount'];
							this.emit('raided', channel, username, viewers, tags);
							break;
						}
						// All other msgid events should be emitted under a usernotice event
						// until it comes up and needs to be added..
						default:
							this.emit('usernotice', msgid, channel, tags, msg);
							break;
					}
					break;
				}

				// Someone has been timed out or chat has been cleared by a moderator..
				case 'CLEARCHAT':
					// User has been banned / timed out by a moderator..
					if(message.params.length > 1) {
						// Duration returns null if it's a ban, otherwise it's a timeout..
						const duration = message.tags['ban-duration'] ?? null;

						if(duration === null) {
							this.log.info(`[${channel}] ${msg} has been banned.`);
							this.emit('ban', channel, msg, null, message.tags);
						}
						else {
							this.log.info(`[${channel}] ${msg} has been timed out for ${duration} seconds.`);
							this.emit('timeout', channel, msg, null, ~~duration, message.tags);
						}
					}

					// Chat was cleared by a moderator..
					else {
						this.log.info(`[${channel}] Chat was cleared by a moderator.`);
						this.emits([ 'clearchat', '_promiseClear' ], [ [ channel ], [ null ] ]);
					}
					break;

				// Someone's message has been deleted
				case 'CLEARMSG':
					if(message.params.length > 1) {
						const deletedMessage = msg;
						const username = tags['login'];
						tags['message-type'] = 'messagedeleted';

						this.log.info(`[${channel}] ${username}'s message has been deleted.`);
						this.emit('messagedeleted', channel, username, deletedMessage, tags);
					}
					break;

				// Received a reconnection request from the server..
				case 'RECONNECT':
					this.log.info('Received RECONNECT request from Twitch..');
					this.log.info(`Disconnecting and reconnecting in ${Math.round(this.reconnectTimer / 1000)} seconds..`);
					this.disconnect().catch(err => this.log.error(err));
					setTimeout(() => this.connect().catch(err => this.log.error(err)), this.reconnectTimer);
					break;

				// Received when joining a channel and every time you send a PRIVMSG to a channel.
				case 'USERSTATE':
					message.tags.username = this.username;

					// Add the client to the moderators of this room..
					if(message.tags['user-type'] === 'mod') {
						if(!this.moderators[channel]) {
							this.moderators[channel] = [];
						}
						if(!this.moderators[channel].includes(this.username)) {
							this.moderators[channel].push(this.username);
						}
					}

					// Logged in and username doesn't start with justinfan..
					if(!_.isJustinfan(this.getUsername()) && !this.userstate[channel]) {
						this.userstate[channel] = tags;
						this.lastJoined = channel;
						this.channels.push(channel);
						this.log.info(`Joined ${channel}`);
						this.emit('join', channel, _.username(this.getUsername()), true);
					}

					// Emote-sets has changed, update it..
					if(message.tags['emote-sets'] !== this.emotes) {
						this.emit('emotesets', message.tags['emote-sets'], {});
					}

					this.userstate[channel] = tags;
					this.emit('userstate', channel, tags);
					break;

				// Describe non-channel-specific state informations..
				case 'GLOBALUSERSTATE':
					this.globaluserstate = tags;
					this.emit('globaluserstate', tags);

					// Received emote-sets..
					if(typeof message.tags['emote-sets'] !== 'undefined') {
						this.emit('emotesets', message.tags['emote-sets'], {});
					}
					break;

				// Received when joining a channel and every time one of the chat room settings, like slow mode, change.
				// The message on join contains all room settings.
				case 'ROOMSTATE':
					// We use this notice to know if we successfully joined a channel..
					if(_.channel(this.lastJoined) === channel) { this.emit('_promiseJoin', null, channel); }

					// Provide the channel name in the tags before emitting it..
					message.tags.channel = channel;
					this.emit('roomstate', channel, message.tags);

					if(!_.hasOwn(message.tags, 'subs-only')) {
						// Handle slow mode here instead of the slow_on/off notice..
						// This room is now in slow mode. You may send messages every slow_duration seconds.
						if(_.hasOwn(message.tags, 'slow')) {
							if(typeof message.tags.slow === 'boolean' && !message.tags.slow) {
								const disabled = [ channel, false, 0 ];
								this.log.info(`[${channel}] This room is no longer in slow mode.`);
								this.emits([ 'slow', 'slowmode', '_promiseSlowoff' ], [ disabled, disabled, [ null ] ]);
							}
							else {
								const seconds = ~~message.tags.slow;
								const enabled = [ channel, true, seconds ];
								this.log.info(`[${channel}] This room is now in slow mode.`);
								this.emits([ 'slow', 'slowmode', '_promiseSlow' ], [ enabled, enabled, [ null ] ]);
							}
						}

						// Handle followers only mode here instead of the followers_on/off notice..
						// This room is now in follower-only mode.
						// This room is now in <duration> followers-only mode.
						// This room is no longer in followers-only mode.
						// duration is in minutes (string)
						// -1 when /followersoff (string)
						// false when /followers with no duration (boolean)
						if(_.hasOwn(message.tags, 'followers-only')) {
							if(message.tags['followers-only'] === '-1') {
								const disabled = [ channel, false, 0 ];
								this.log.info(`[${channel}] This room is no longer in followers-only mode.`);
								this.emits([ 'followersonly', 'followersmode', '_promiseFollowersoff' ], [ disabled, disabled, [ null ] ]);
							}
							else {
								const minutes = ~~message.tags['followers-only'];
								const enabled = [ channel, true, minutes ];
								this.log.info(`[${channel}] This room is now in follower-only mode.`);
								this.emits([ 'followersonly', 'followersmode', '_promiseFollowers' ], [ enabled, enabled, [ null ] ]);
							}
						}
					}
					break;

				default:
					this.log.warn(`Could not parse message from tmi.twitch.tv:\n${JSON.stringify(message, null, 4)}`);
					break;
			}
		}

		// Messages from jtv..
		else if(message.prefix === 'jtv') {
			switch(message.command) {
				case 'MODE':
					if(msg === '+o') {
						// Add username to the moderators..
						if(!this.moderators[channel]) {
							this.moderators[channel] = [];
						}
						if(!this.moderators[channel].includes(message.params[2])) {
							this.moderators[channel].push(message.params[2]);
						}

						this.emit('mod', channel, message.params[2]);
					}
					else if(msg === '-o') {
						// Remove username from the moderators..
						if(!this.moderators[channel]) {
							this.moderators[channel] = [];
						}
						this.moderators[channel].filter(value => value !== message.params[2]);

						this.emit('unmod', channel, message.params[2]);
					}
					break;

				default:
					this.log.warn(`Could not parse message from jtv:\n${JSON.stringify(message, null, 4)}`);
					break;
			}
		}

		// Anything else..
		else {
			switch(message.command) {
				case '353':
					this.emit('names', message.params[2], message.params[3].split(' '));
					break;

				case '366':
					break;

				// Someone has joined the channel..
				case 'JOIN': {
					const nick = message.prefix.split('!')[0];
					// Joined a channel as a justinfan (anonymous) user..
					if(_.isJustinfan(this.getUsername()) && this.username === nick) {
						this.lastJoined = channel;
						this.channels.push(channel);
						this.log.info(`Joined ${channel}`);
						this.emit('join', channel, nick, true);
					}

					// Someone else joined the channel, just emit the join event..
					if(this.username !== nick) {
						this.emit('join', channel, nick, false);
					}
					break;
				}

				// Someone has left the channel..
				case 'PART': {
					let isSelf = false;
					const nick = message.prefix.split('!')[0];
					// Client left a channel..
					if(this.username === nick) {
						isSelf = true;
						if(this.userstate[channel]) { delete this.userstate[channel]; }

						let index = this.channels.indexOf(channel);
						if(index !== -1) { this.channels.splice(index, 1); }

						index = this.opts.channels.indexOf(channel);
						if(index !== -1) { this.opts.channels.splice(index, 1); }

						this.log.info(`Left ${channel}`);
						this.emit('_promisePart', null);
					}

					// Client or someone else left the channel, emit the part event..
					this.emit('part', channel, nick, isSelf);
					break;
				}

				// Received a whisper..
				case 'WHISPER': {
					const nick = message.prefix.split('!')[0];
					this.log.info(`[WHISPER] <${nick}>: ${msg}`);

					// Update the tags to provide the username..
					if(!_.hasOwn(message.tags, 'username')) {
						message.tags.username = nick;
					}
					message.tags['message-type'] = 'whisper';

					const from = _.channel(message.tags.username);
					// Emit for both, whisper and message..
					this.emits([ 'whisper', 'message' ], [
						[ from, message.tags, msg, false ]
					]);
					break;
				}

				case 'PRIVMSG': {
					// Add username (lowercase) to the tags..
					message.tags.username = message.prefix.split('!')[0];
					const messagesLogLevel = this.opts.options.messagesLogLevel ?? 'info';
					// Message is an action (/me <message>)..
					const actionMessage = _.actionMessage(msg);
					message.tags['message-type'] = actionMessage ? 'action' : 'chat';
					msg = actionMessage ? actionMessage[1] : msg;
					// Check for Bits prior to actions message
					if(_.hasOwn(message.tags, 'bits')) {
						this.emit('cheer', channel, message.tags, msg);
					}
					else {
						//Handle Channel Point Redemptions (Require's Text Input)
						if(_.hasOwn(message.tags, 'msg-id')) {
							/** @type {'highlighted-message' | 'skip-subs-mode-message' | 'gigantified-emote-message' | 'animated-message'} */
							const rewardtype = msgid;
							this.emit('redeem', channel, message.tags.username, rewardtype, message.tags, msg);
						}
						else if(_.hasOwn(message.tags, 'custom-reward-id')) {
							const rewardtype = message.tags['custom-reward-id'];
							this.emit('redeem', channel, message.tags.username, rewardtype, message.tags, msg);
						}
						if(actionMessage) {
							this.log[messagesLogLevel](`[${channel}] *<${message.tags.username}>: ${msg}`);
							this.emits([ 'action', 'message' ], [
								[ channel, message.tags, msg, false ]
							]);
						}

						// Message is a regular chat message..
						else {
							this.log[messagesLogLevel](`[${channel}] <${message.tags.username}>: ${msg}`);
							this.emits([ 'chat', 'message' ], [
								[ channel, message.tags, msg, false ]
							]);
						}
					}
					break;
				}

				default:
					this.log.warn(`Could not parse message:\n${JSON.stringify(message, null, 4)}`);
					break;
			}
		}
	}
	// Connect to server..
	connect() {
		return new Promise((resolve, reject) => {
			this.server = this.opts.connection.server ?? 'irc-ws.chat.twitch.tv';
			this.port = this.opts.connection.port ?? 80;

			// Override port if using a secure connection..
			if(this.secure) { this.port = 443; }
			if(this.port === 443) { this.secure = true; }

			this.reconnectTimer = this.reconnectTimer * this.reconnectDecay;
			if(this.reconnectTimer >= this.maxReconnectInterval) {
				this.reconnectTimer = this.maxReconnectInterval;
			}

			// Connect to server from configuration..
			this._openConnection();
			this.once('_promiseConnect', err => {
				if(!err) { resolve([ this.server, ~~this.port ]); }
				else { reject(err); }
			});
		});
	}
	// Open a connection..
	_openConnection() {
		const url = `${this.secure ? 'wss' : 'ws'}://${this.server}:${this.port}/`;
		/** @type {import('ws').ClientOptions} */
		const connectionOptions = {};
		if('agent' in this.opts.connection) {
			connectionOptions.agent = this.opts.connection.agent;
		}
		this.ws = new _WebSocket(url, 'irc', connectionOptions);

		this.ws.onmessage = this._onMessage.bind(this);
		this.ws.onerror = this._onError.bind(this);
		this.ws.onclose = this._onClose.bind(this);
		this.ws.onopen = this._onOpen.bind(this);
	}
	// Called when the WebSocket connection's readyState changes to OPEN.
	// Indicates that the connection is ready to send and receive data..
	_onOpen() {
		if(!this._isConnected()) {
			return;
		}

		// Emitting "connecting" event..
		this.log.info(`Connecting to ${this.server} on port ${this.port}..`);
		this.emit('connecting', this.server, ~~this.port);

		this._getToken()
		.then(token => {
			const password = _.password(token);

			const isAnonymous = (password ?? '') === '';
			this.username = isAnonymous ? 'justinfan123456' : 'justinfan';

			// Emitting "logon" event..
			this.log.info('Sending authentication to server..');
			this.emit('logon');

			let caps = 'twitch.tv/tags twitch.tv/commands';
			if(!this._skipMembership) {
				caps += ' twitch.tv/membership';
			}
			this.ws.send('CAP REQ :' + caps);

			// Authentication..
			this.ws.send(`PASS ${isAnonymous ? 'SCHMOOPIIE' : password}`);
			this.ws.send(`NICK ${this.username}`);
		})
		.catch(err => {
			this.emits([ '_promiseConnect', 'disconnected' ], [ [ err ], [ 'Could not get a token.' ] ]);
		});
	}
	// Fetches a token from the option.
	_getToken() {
		const passwordOption = this.opts.identity.password;
		let password;
		if(typeof passwordOption === 'function') {
			password = passwordOption();
			if(password instanceof Promise) {
				return password;
			}
			return Promise.resolve(password);
		}
		return Promise.resolve(passwordOption);
	}
	// Called when a message is received from the server..
	_onMessage(event) {
		const parts = event.data.trim().split('\r\n');

		parts.forEach(str => {
			const msg = parse.msg(str);
			if(msg) {
				this.handleMessage(msg);
			}
		});
	}
	// Called when an error occurs..
	_onError() {
		this.moderators = {};
		this.userstate = {};
		this.globaluserstate = {};

		// Stop the internal ping timeout check interval..
		clearInterval(this.pingLoop);
		clearTimeout(this.pingTimeout);

		this.reason = this.ws === null ? 'Connection closed.' : 'Unable to connect.';

		this.emits([ '_promiseConnect', 'disconnected' ], [ [ this.reason ] ]);

		// Reconnect to server..
		if(this.reconnect && this.reconnections === this.maxReconnectAttempts) {
			this.emit('maxreconnect');
			this.log.error('Maximum reconnection attempts reached.');
		}
		if(this.reconnect && !this.reconnecting && this.reconnections <= this.maxReconnectAttempts - 1) {
			this.reconnecting = true;
			this.reconnections = this.reconnections + 1;
			this.log.error(`Reconnecting in ${Math.round(this.reconnectTimer / 1000)} seconds..`);
			this.emit('reconnect');
			setTimeout(() => {
				this.reconnecting = false;
				this.connect().catch(err => this.log.error(err));
			}, this.reconnectTimer);
		}

		this.ws = null;
	}
	// Called when the WebSocket connection's readyState changes to CLOSED..
	_onClose() {
		this.moderators = {};
		this.userstate = {};
		this.globaluserstate = {};

		// Stop the internal ping timeout check interval..
		clearInterval(this.pingLoop);
		clearTimeout(this.pingTimeout);

		// User called .disconnect(), don't try to reconnect.
		if(this.wasCloseCalled) {
			this.wasCloseCalled = false;
			this.reason = 'Connection closed.';
			this.log.info(this.reason);
			this.emits([ '_promiseConnect', '_promiseDisconnect', 'disconnected' ], [ [ this.reason ], [ null ], [ this.reason ] ]);
		}

		// Got disconnected from server..
		else {
			this.emits([ '_promiseConnect', 'disconnected' ], [ [ this.reason ] ]);

			// Reconnect to server..
			if(this.reconnect && this.reconnections === this.maxReconnectAttempts) {
				this.emit('maxreconnect');
				this.log.error('Maximum reconnection attempts reached.');
			}
			if(this.reconnect && !this.reconnecting && this.reconnections <= this.maxReconnectAttempts - 1) {
				this.reconnecting = true;
				this.reconnections = this.reconnections + 1;
				this.log.error(`Could not connect to server. Reconnecting in ${Math.round(this.reconnectTimer / 1000)} seconds..`);
				this.emit('reconnect');
				setTimeout(() => {
					this.reconnecting = false;
					this.connect().catch(err => this.log.error(err));
				}, this.reconnectTimer);
			}
		}

		this.ws = null;
	}
	_setPingLoop() {
		clearInterval(this.pingLoop);
		// Set an internal ping timeout check interval..
		this.pingLoop = setInterval(() => {
			// Make sure the connection is opened before sending the message..
			if(this._isConnected()) {
				this.ws.send('PING');
			}
			this.latency = new Date();
			clearTimeout(this.pingTimeout);
			this.pingTimeout = setTimeout(() => {
				if(this.ws !== null) {
					this.wasCloseCalled = false;
					this.log.error('Ping timeout.');
					this.ws.close();

					clearInterval(this.pingLoop);
					clearTimeout(this.pingTimeout);
				}
			}, this.opts.connection.timeout ?? 9999);
		}, 60000);
	}
	// Minimum of 600ms for command promises, if current latency exceeds, add 100ms to it to make sure it doesn't get timed out..
	_getPromiseDelay() {
		if(this.currentLatency <= 600) { return 600; }
		else { return this.currentLatency + 100; }
	}
	// Send command to server or channel..
	_sendCommand(delay, channel, command, fn) {
		// Race promise against delay..
		return new Promise((resolve, reject) => {
			// Make sure the socket is opened..
			if(!this._isConnected()) {
				// Disconnected from server..
				return reject('Not connected to server.');
			}
			else if(delay === null || typeof delay === 'number') {
				if(delay === null) {
					delay = this._getPromiseDelay();
				}
				_.promiseDelay(delay).then(() => reject('No response from Twitch.'));
			}

			// Executing a command on a channel..
			if(channel !== null) {
				const chan = _.channel(channel);
				this.log.info(`[${chan}] Executing command: ${command}`);
				this.ws.send(`PRIVMSG ${chan} :${command}`);
			}

			// Executing a raw command..
			else {
				this.log.info(`Executing command: ${command}`);
				this.ws.send(command);
			}
			if(typeof fn === 'function') {
				fn(resolve, reject);
			}
			else {
				resolve();
			}
		});
	}
	// Send a message to channel..
	_sendMessage(delay, channel, message, tags, fn) {
		if(typeof tags === 'function') {
			[ fn, tags ] = [ tags, {} ];
		}
		// Promise a result..
		return new Promise((resolve, reject) => {
			// Make sure the socket is opened and not logged in as a justinfan user..
			if(!this._isConnected()) {
				return reject('Not connected to server.');
			}
			else if(_.isJustinfan(this.getUsername())) {
				return reject('Cannot send anonymous messages.');
			}
			const chan = _.channel(channel);
			if(!this.userstate[chan]) { this.userstate[chan] = {}; }

			// Split long lines otherwise they will be eaten by the server..
			if(message.length >= 500) {
				const msg = _.splitLine(message, 500);
				message = msg[0];

				setTimeout(() => {
					this._sendMessage(delay, channel, msg[1], () => {});
				}, 350);
			}

			const clientNonce = `tmi.js_${_.nonce()}`;
			const tagsStr = _.formatTags({ 'client-nonce': clientNonce, ...(tags ?? {}) });
			this.ws.send(`@${tagsStr} PRIVMSG ${chan} :${message}`);

			const emotes = {};

			// Parse regex and string emotes..
			Object.keys(this.emotesets).forEach(id => this.emotesets[id].forEach(emote => {
				const emoteFunc = _.isRegex(emote.code) ? parse.emoteRegex : parse.emoteString;
				return emoteFunc(message, emote.code, emote.id, emotes);
			}));

			// Merge userstate with parsed emotes..
			const userstate = Object.assign(
				this.userstate[chan],
				parse.emotes({ emotes: parse.transformEmotes(emotes) || null })
			);

			const messagesLogLevel = this.opts.options.messagesLogLevel ?? 'info';

			// Message is an action (/me <message>)..
			if(message.startsWith('/me ')) {
				userstate['message-type'] = 'action';
				const text = message.slice(4);
				this.log[messagesLogLevel](`[${chan}] *<${this.getUsername()}>: ${text}`);
				this.emits([ 'action', 'message' ], [
					[ chan, userstate, text, true ]
				]);
			}

			// Message is a regular chat message..
			else {
				userstate['message-type'] = 'chat';
				this.log[messagesLogLevel](`[${chan}] <${this.getUsername()}>: ${message}`);
				this.emits([ 'chat', 'message' ], [
					[ chan, userstate, message, true ]
				]);
			}
			if(typeof fn === 'function') {
				fn(resolve, reject, clientNonce);
			}
			else {
				resolve();
			}
		});
	}
	// Get current username..
	getUsername() {
		return this.username;
	}
	// Get current options..
	getOptions() {
		return this.opts;
	}
	// Get current channels..
	getChannels() {
		return this.channels;
	}
	// Check if username is a moderator on a channel..
	isMod(channel, username) {
		const chan = _.channel(channel);
		if(!this.moderators[chan]) { this.moderators[chan] = []; }
		return this.moderators[chan].includes(_.username(username));
	}
	// Get readyState..
	readyState() {
		if(this.ws === null) { return 'CLOSED'; }
		return [ 'CONNECTING', 'OPEN', 'CLOSING', 'CLOSED' ][this.ws.readyState];
	}
	// Determine if the client has a WebSocket and it's open..
	_isConnected() {
		return this.ws !== null && this.ws.readyState === 1;
	}
	// Disconnect from server..
	disconnect() {
		return new Promise((resolve, reject) => {
			if(this.ws !== null && this.ws.readyState !== 3) {
				this.wasCloseCalled = true;
				this.log.info('Disconnecting from server..');
				this.ws.close();
				this.once('_promiseDisconnect', () => resolve([ this.server, ~~this.port ]));
			}
			else {
				this.log.error('Cannot disconnect from server. Socket is not opened or connection is already closing.');
				reject('Cannot disconnect from server. Socket is not opened or connection is already closing.');
			}
		});
	}

	// Send a ping to the server..
	ping() {
		return this._sendCommand(null, null, 'PING', (resolve, _reject) => {
			this.latency = new Date();
			this._setPingLoop();

			// Received _promisePing event, resolve or reject..
			this.once('_promisePing', latency => resolve([ parseFloat(latency) ]));
		});
	}

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
	}

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
	}

	// Alias for part()..
	leave(channel) {
		return this.part(channel);
	}

	// Send a raw message to the server..
	raw(message) {
		return this._sendCommand(null, null, message, (resolve, _reject) => resolve([ message ]));
	}

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

	// Send an action message (/me <message>) to a channel..
	action(channel, message) {
		return this.say(channel, `/me ${message}`);
	}

	reply(channel, message, parentId) {
		return this.say(channel, message, { 'reply-parent-msg-id': parentId });
	}
}

// Expose everything, for browser and Node..
if(typeof module !== 'undefined' && module.exports) {
	module.exports = client;
}
if(typeof window !== 'undefined') {
	window.tmi = {
		client,
		Client: client
	};
}
