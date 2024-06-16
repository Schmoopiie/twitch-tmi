// eslint-disable-next-line no-control-regex
const actionMessageRegex = /^\u0001ACTION ([^\u0001]+)\u0001$/;
const justinFanRegex = /^justinfan(\d+$)/;
const unescapeIRCRegex = /\\([sn:r\\])/g;
const escapeIRCRegex = /([ \n;\r\\])/g;
const ircEscapedChars = { s: ' ', n: '', ':': ';', r: '' };
const ircUnescapedChars = { ' ': 's', '\n': 'n', ';': ':', '\r': 'r' };
const regexEmoteRegex = /[|\\^$*+?:#]/;
const _ = module.exports = {
	// Indirectly use hasOwnProperty
	hasOwn: (obj, key) => ({}).hasOwnProperty.call(obj, key),

	// Race a promise against a delay..
	promiseDelay: time => new Promise(resolve => setTimeout(resolve, time)),

	// Value is a regex..
	isRegex: str => regexEmoteRegex.test(str),

	// Username is a justinfan username..
	isJustinfan: username => justinFanRegex.test(username),

	// Return a valid channel name..
	channel(str) {
		const channel = (str ? str : '').toLowerCase();
		return channel[0] === '#' ? channel : '#' + channel;
	},

	validateChannel(channel) {
		_.assert(channel, 'No channel provided.');
	},

	// Return a valid username..
	username(str) {
		const username = (str ? str : '').toLowerCase();
		return username[0] === '#' ? username.slice(1) : username;
	},

	// Return a valid token..
	token: str => str ? str.toLowerCase().replace('oauth:', '') : '',

	// Return a valid password..
	password(str) {
		const token = _.token(str);
		return token ? `oauth:${token}` : '';
	},

	actionMessage: msg => msg.match(actionMessageRegex),

	unescapeHtml: safe =>
		safe.replace(/\\&amp\\;/g, '&')
		.replace(/\\&lt\\;/g, '<')
		.replace(/\\&gt\\;/g, '>')
		.replace(/\\&quot\\;/g, '"')
		.replace(/\\&#039\\;/g, '\''),

	// Escaping values:
	// http://ircv3.net/specs/core/message-tags-3.2.html#escaping-values
	unescapeIRC(msg) {
		if(!msg || typeof msg !== 'string' || !msg.includes('\\')) {
			return msg;
		}
		return msg.replace(
			unescapeIRCRegex,
			(m, p) => p in ircEscapedChars ? ircEscapedChars[p] : p
		);
	},

	escapeIRC(msg) {
		if(!msg || typeof msg !== 'string') {
			return msg;
		}
		return msg.replace(
			escapeIRCRegex,
			(m, p) => p in ircUnescapedChars ? `\\${ircUnescapedChars[p]}` : p
		);
	},

	/**
	 * @param {Record<string, string>} tags
	 * @returns {string}
	 */
	formatTags: tags => Object.keys(tags).map(tag => `${tag}=${_.escapeIRC(_.unescapeIRC(tags[tag]))}`).join(';'),

	nonce: () => Math.random().toString(32).slice(2),

	// Split a line but try not to cut a word in half..
	splitLine(input, length) {
		let lastSpace = input.substring(0, length).lastIndexOf(' ');
		// No spaces found, split at the very end to avoid a loop..
		if(lastSpace === -1) {
			lastSpace = length - 1;
		}
		return [ input.substring(0, lastSpace), input.substring(lastSpace + 1) ];
	},

	// Format the date..
	formatDate(date) {
		let hours = date.getHours();
		let mins  = date.getMinutes();

		hours = (hours < 10 ? '0' : '') + hours;
		mins = (mins < 10 ? '0' : '') + mins;
		return `${hours}:${mins}`;
	},

	// Inherit the prototype methods from one constructor into another..
	inherits(ctor, superCtor) {
		ctor.super_ = superCtor;
		const TempCtor = function () {};
		TempCtor.prototype = superCtor.prototype;
		ctor.prototype = new TempCtor();
		ctor.prototype.constructor = ctor;
	},

	assert(condition, message) {
		if(!condition) {
			throw new Error(message);
		}
	},
};
