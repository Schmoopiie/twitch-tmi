var tmi = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // lib/events.js
  var require_events = __commonJS({
    "lib/events.js"(exports, module) {
      var EventEmitter = class {
        constructor() {
          this._events = /* @__PURE__ */ new Map();
        }
        emit(type, ...args) {
          const listeners = this._events.get(type);
          if (!listeners) {
            return false;
          }
          for (const listener of listeners) {
            listener.apply(this, args);
          }
          return true;
        }
        emits(types, values) {
          for (let i = 0; i < types.length; i++) {
            const val = i < values.length ? values[i] : values[values.length - 1];
            this.emit.apply(this, [types[i]].concat(val));
          }
        }
        addListener(type, listener) {
          if (!this._events.has(type)) {
            this._events.set(type, /* @__PURE__ */ new Set());
          }
          this._events.get(type).add(listener);
        }
        on(type, listener) {
          this.addListener(type, listener);
        }
        once(type, listener) {
          const wrapped = (...args) => {
            this.removeListener(type, wrapped);
            listener.apply(this, args);
          };
          this.addListener(type, wrapped);
        }
        removeListener(type, listener) {
          if (!this._events.has(type)) {
            return;
          }
          this._events.get(type).delete(listener);
        }
        off(type, listener) {
          this.removeListener(type, listener);
        }
        removeAllListeners(type) {
          this._events.delete(type);
        }
        listeners(type) {
          return this._events.get(type);
        }
        listenerCount(type) {
          const listeners = this._events.get(type);
          if (!listeners) {
            return 0;
          }
          return listeners.size;
        }
      };
      module.exports = EventEmitter;
    }
  });

  // lib/utils.js
  var require_utils = __commonJS({
    "lib/utils.js"(exports, module) {
      var actionMessageRegex = /^\u0001ACTION ([^\u0001]+)\u0001$/;
      var justinFanRegex = /^justinfan(\d+$)/;
      var unescapeIRCRegex = /\\([sn:r\\])/g;
      var escapeIRCRegex = /([ \n;\r\\])/g;
      var ircEscapedChars = { s: " ", n: "", ":": ";", r: "" };
      var ircUnescapedChars = { " ": "s", "\n": "n", ";": ":", "\r": "r" };
      var regexEmoteRegex = /[|\\^$*+?:#]/;
      var _ = module.exports = {
        // Indirectly use hasOwnProperty
        hasOwn: (obj, key) => ({}).hasOwnProperty.call(obj, key),
        // Race a promise against a delay..
        promiseDelay: (time) => new Promise((resolve) => setTimeout(resolve, time)),
        // Value is a regex..
        isRegex: (str) => regexEmoteRegex.test(str),
        // Username is a justinfan username..
        isJustinfan: (username) => justinFanRegex.test(username),
        // Return a valid channel name..
        channel(str) {
          const channel = (str ? str : "").toLowerCase();
          return channel[0] === "#" ? channel : "#" + channel;
        },
        validateChannel(channel) {
          _.assert(channel, "No channel provided.");
        },
        // Return a valid username..
        username(str) {
          const username = (str ? str : "").toLowerCase();
          return username[0] === "#" ? username.slice(1) : username;
        },
        // Return a valid token..
        token: (str) => str ? str.toLowerCase().replace("oauth:", "") : "",
        // Return a valid password..
        password(str) {
          const token = _.token(str);
          return token ? `oauth:${token}` : "";
        },
        actionMessage: (msg) => msg.match(actionMessageRegex),
        unescapeHtml: (safe) => safe.replace(/\\&amp\\;/g, "&").replace(/\\&lt\\;/g, "<").replace(/\\&gt\\;/g, ">").replace(/\\&quot\\;/g, '"').replace(/\\&#039\\;/g, "'"),
        // Escaping values:
        // http://ircv3.net/specs/core/message-tags-3.2.html#escaping-values
        unescapeIRC(msg) {
          if (!msg || typeof msg !== "string" || !msg.includes("\\")) {
            return msg;
          }
          return msg.replace(
            unescapeIRCRegex,
            (m, p) => p in ircEscapedChars ? ircEscapedChars[p] : p
          );
        },
        escapeIRC(msg) {
          if (!msg || typeof msg !== "string") {
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
        formatTags: (tags) => Object.keys(tags).map((tag) => `${tag}=${_.escapeIRC(_.unescapeIRC(tags[tag]))}`).join(";"),
        nonce: () => Math.random().toString(32).slice(2),
        // Split a line but try not to cut a word in half..
        splitLine(input, length) {
          let lastSpace = input.substring(0, length).lastIndexOf(" ");
          if (lastSpace === -1) {
            lastSpace = length - 1;
          }
          return [input.substring(0, lastSpace), input.substring(lastSpace + 1)];
        },
        // Format the date..
        formatDate(date) {
          let hours = date.getHours();
          let mins = date.getMinutes();
          hours = (hours < 10 ? "0" : "") + hours;
          mins = (mins < 10 ? "0" : "") + mins;
          return `${hours}:${mins}`;
        },
        // Inherit the prototype methods from one constructor into another..
        inherits(ctor, superCtor) {
          ctor.super_ = superCtor;
          const TempCtor = function() {
          };
          TempCtor.prototype = superCtor.prototype;
          ctor.prototype = new TempCtor();
          ctor.prototype.constructor = ctor;
        },
        assert(condition, message) {
          if (!condition) {
            throw new Error(message);
          }
        }
      };
    }
  });

  // lib/logger.js
  var require_logger = __commonJS({
    "lib/logger.js"(exports, module) {
      var _ = require_utils();
      var currentLevel = "info";
      var levels = { "trace": 0, "debug": 1, "info": 2, "warn": 3, "error": 4, "fatal": 5 };
      function log(level) {
        return function(message) {
          if (levels[level] >= levels[currentLevel]) {
            console.log(`[${_.formatDate(/* @__PURE__ */ new Date())}] ${level}: ${message}`);
          }
        };
      }
      module.exports = {
        // Change the current logging level..
        setLevel(level) {
          currentLevel = level;
        },
        trace: log("trace"),
        debug: log("debug"),
        info: log("info"),
        warn: log("warn"),
        error: log("error"),
        fatal: log("fatal")
      };
    }
  });

  // lib/parser.js
  var require_parser = __commonJS({
    "lib/parser.js"(exports, module) {
      var _ = require_utils();
      var nonspaceRegex = /\S+/g;
      function parseComplexTag(tags, tagKey, splA = ",", splB = "/", splC) {
        const raw = tags[tagKey];
        if (raw === void 0) {
          return tags;
        }
        const tagIsString = typeof raw === "string";
        tags[tagKey + "-raw"] = tagIsString ? raw : null;
        if (raw === true) {
          tags[tagKey] = null;
          return tags;
        }
        tags[tagKey] = {};
        if (tagIsString) {
          const spl = raw.split(splA);
          for (let i = 0; i < spl.length; i++) {
            const parts = spl[i].split(splB);
            let val = parts[1];
            if (splC !== void 0 && val) {
              val = val.split(splC);
            }
            tags[tagKey][parts[0]] = val || null;
          }
        }
        return tags;
      }
      module.exports = {
        // Parse Twitch badges..
        badges: (tags) => parseComplexTag(tags, "badges"),
        // Parse Twitch badge-info..
        badgeInfo: (tags) => parseComplexTag(tags, "badge-info"),
        // Parse Twitch emotes..
        emotes: (tags) => parseComplexTag(tags, "emotes", "/", ":", ","),
        // Parse regex emotes..
        emoteRegex(msg, code, id, obj) {
          nonspaceRegex.lastIndex = 0;
          const regex = new RegExp("(\\b|^|\\s)" + _.unescapeHtml(code) + "(\\b|$|\\s)");
          let match;
          while ((match = nonspaceRegex.exec(msg)) !== null) {
            if (regex.test(match[0])) {
              obj[id] = obj[id] || [];
              obj[id].push([match.index, nonspaceRegex.lastIndex - 1]);
            }
          }
        },
        // Parse string emotes..
        emoteString(msg, code, id, obj) {
          nonspaceRegex.lastIndex = 0;
          let match;
          while ((match = nonspaceRegex.exec(msg)) !== null) {
            if (match[0] === _.unescapeHtml(code)) {
              obj[id] = obj[id] || [];
              obj[id].push([match.index, nonspaceRegex.lastIndex - 1]);
            }
          }
        },
        // Transform the emotes object to a string with the following format..
        // emote_id:first_index-last_index,another_first-another_last/another_emote_id:first_index-last_index
        transformEmotes(emotes) {
          let transformed = "";
          Object.keys(emotes).forEach((id) => {
            transformed = `${transformed + id}:`;
            emotes[id].forEach(
              (index) => transformed = `${transformed + index.join("-")},`
            );
            transformed = `${transformed.slice(0, -1)}/`;
          });
          return transformed.slice(0, -1);
        },
        formTags(tags) {
          const result = [];
          for (const key in tags) {
            const value = _.escapeIRC(tags[key]);
            result.push(`${key}=${value}`);
          }
          return `@${result.join(";")}`;
        },
        // Parse Twitch messages..
        msg(data) {
          const message = {
            raw: data,
            tags: {},
            prefix: null,
            command: null,
            params: []
          };
          let position = 0;
          let nextspace = 0;
          if (data.charCodeAt(0) === 64) {
            nextspace = data.indexOf(" ");
            if (nextspace === -1) {
              return null;
            }
            const rawTags = data.slice(1, nextspace).split(";");
            for (let i = 0; i < rawTags.length; i++) {
              const tag = rawTags[i];
              const pair = tag.split("=");
              message.tags[pair[0]] = tag.substring(tag.indexOf("=") + 1) || true;
            }
            position = nextspace + 1;
          }
          while (data.charCodeAt(position) === 32) {
            position++;
          }
          if (data.charCodeAt(position) === 58) {
            nextspace = data.indexOf(" ", position);
            if (nextspace === -1) {
              return null;
            }
            message.prefix = data.slice(position + 1, nextspace);
            position = nextspace + 1;
            while (data.charCodeAt(position) === 32) {
              position++;
            }
          }
          nextspace = data.indexOf(" ", position);
          if (nextspace === -1) {
            if (data.length > position) {
              message.command = data.slice(position);
              return message;
            }
            return null;
          }
          message.command = data.slice(position, nextspace);
          position = nextspace + 1;
          while (data.charCodeAt(position) === 32) {
            position++;
          }
          while (position < data.length) {
            nextspace = data.indexOf(" ", position);
            if (data.charCodeAt(position) === 58) {
              message.params.push(data.slice(position + 1));
              break;
            }
            if (nextspace !== -1) {
              message.params.push(data.slice(position, nextspace));
              position = nextspace + 1;
              while (data.charCodeAt(position) === 32) {
                position++;
              }
              continue;
            }
            if (nextspace === -1) {
              message.params.push(data.slice(position));
              break;
            }
          }
          return message;
        }
      };
    }
  });

  // lib/timer.js
  var require_timer = __commonJS({
    "lib/timer.js"(exports, module) {
      var Queue = class {
        constructor(defaultDelay) {
          this.queue = [];
          this.index = 0;
          this.defaultDelay = defaultDelay === void 0 ? 3e3 : defaultDelay;
        }
        // Add a new function to the queue..
        add(fn, delay) {
          this.queue.push({ fn, delay });
        }
        // Go to the next in queue..
        next() {
          const i = this.index++;
          const at = this.queue[i];
          if (!at) {
            return;
          }
          const next = this.queue[this.index];
          at.fn();
          if (next) {
            const delay = next.delay === void 0 ? this.defaultDelay : next.delay;
            setTimeout(() => this.next(), delay);
          }
        }
      };
      module.exports = Queue;
    }
  });

  // lib/client.js
  var require_client = __commonJS({
    "lib/client.js"(exports, module) {
      var _global = typeof global !== "undefined" ? global : typeof window !== "undefined" ? window : {};
      var _WebSocket = _global.WebSocket || __require("ws");
      var EventEmitter = require_events();
      var logger = require_logger();
      var parse = require_parser();
      var Queue = require_timer();
      var _ = require_utils();
      var Client = class extends EventEmitter {
        constructor(opts) {
          super();
          this.opts = opts ?? {};
          this.opts.channels = this.opts.channels ?? [];
          this.opts.connection = this.opts.connection ?? {};
          this.opts.identity = this.opts.identity ?? {};
          this.opts.options = this.opts.options ?? {};
          this.clientId = this.opts.options.clientId ?? null;
          this._globalDefaultChannel = _.channel(this.opts.options.globalDefaultChannel ?? "#tmijs");
          this._skipMembership = this.opts.options.skipMembership ?? false;
          const { connection } = this.opts;
          this.maxReconnectAttempts = connection.maxReconnectAttempts ?? Infinity;
          this.maxReconnectInterval = connection.maxReconnectInterval ?? 3e4;
          this.reconnect = connection.reconnect ?? true;
          this.reconnectDecay = connection.reconnectDecay ?? 1.5;
          this.reconnectInterval = connection.reconnectInterval ?? 1e3;
          this.reconnecting = false;
          this.reconnections = 0;
          this.reconnectTimer = this.reconnectInterval;
          this.secure = connection.secure ?? (!connection.server && !connection.port);
          this.emotes = "";
          this.emotesets = {};
          this.channels = [];
          this.currentLatency = 0;
          this.globaluserstate = {};
          this.lastJoined = "";
          this.latency = /* @__PURE__ */ new Date();
          this.moderators = {};
          this.pingLoop = null;
          this.pingTimeout = null;
          this.reason = "";
          this.username = "";
          this.userstate = {};
          this.wasCloseCalled = false;
          this.ws = null;
          let level = "error";
          if (this.opts.options.debug) {
            level = "info";
          }
          this.log = this.opts.logger ?? logger;
          try {
            logger.setLevel(level);
          } catch (err) {
          }
          this.opts.channels.forEach((n, i, a) => a[i] = _.channel(n));
        }
        // Handle parsed chat server message..
        handleMessage(message) {
          if (!message) {
            return;
          }
          if (this.listenerCount("raw_message")) {
            this.emit("raw_message", JSON.parse(JSON.stringify(message)), message);
          }
          const channel = _.channel(message.params[0] ?? null);
          let msg = message.params[1] ?? null;
          const msgid = message.tags["msg-id"] ?? null;
          const tags = message.tags = parse.badges(parse.badgeInfo(parse.emotes(message.tags)));
          for (const key in tags) {
            if (key === "emote-sets" || key === "ban-duration" || key === "bits") {
              continue;
            }
            let value = tags[key];
            if (typeof value === "boolean") {
              value = null;
            } else if (value === "1") {
              value = true;
            } else if (value === "0") {
              value = false;
            } else if (typeof value === "string") {
              value = _.unescapeIRC(value);
            }
            tags[key] = value;
          }
          if (message.prefix === null) {
            switch (message.command) {
              case "PING":
                this.emit("ping");
                if (this._isConnected()) {
                  this.ws.send("PONG");
                }
                break;
              case "PONG": {
                const currDate = /* @__PURE__ */ new Date();
                this.currentLatency = (currDate.getTime() - this.latency.getTime()) / 1e3;
                this.emits(["pong", "_promisePing"], [[this.currentLatency]]);
                clearTimeout(this.pingTimeout);
                break;
              }
              default:
                this.log.warn(`Could not parse message with no prefix:
${JSON.stringify(message, null, 4)}`);
                break;
            }
          } else if (message.prefix === "tmi.twitch.tv") {
            switch (message.command) {
              case "002":
              case "003":
              case "004":
              case "372":
              case "375":
              case "CAP":
                break;
              case "001":
                this.username = message.params[0];
                break;
              case "376": {
                this.log.info("Connected to server.");
                this.userstate[this._globalDefaultChannel] = {};
                this.emits(["connected", "_promiseConnect"], [[this.server, this.port], [null]]);
                this.reconnections = 0;
                this.reconnectTimer = this.reconnectInterval;
                this._setPingLoop();
                let joinInterval = this.opts.options.joinInterval ?? 2e3;
                if (joinInterval < 300) {
                  joinInterval = 300;
                }
                const joinQueue = new Queue(joinInterval);
                const joinChannels = [.../* @__PURE__ */ new Set([...this.opts.channels, ...this.channels])];
                this.channels = [];
                for (let i = 0; i < joinChannels.length; i++) {
                  const channel2 = joinChannels[i];
                  joinQueue.add(() => {
                    if (this._isConnected()) {
                      this.join(channel2).catch((err) => this.log.error(err));
                    }
                  });
                }
                joinQueue.next();
                break;
              }
              case "NOTICE": {
                const nullArr = [null];
                const noticeArr = [channel, msgid, msg];
                const channelTrueArr = [channel, true];
                const channelFalseArr = [channel, false];
                const basicLog = `[${channel}] ${msg}`;
                switch (msgid) {
                  case "subs_on":
                    this.log.info(`[${channel}] This room is now in subscribers-only mode.`);
                    this.emits(["subscriber", "subscribers", "_promiseSubscribers"], [channelTrueArr, channelTrueArr, nullArr]);
                    break;
                  case "subs_off":
                    this.log.info(`[${channel}] This room is no longer in subscribers-only mode.`);
                    this.emits(["subscriber", "subscribers", "_promiseSubscribersoff"], [channelFalseArr, channelFalseArr, nullArr]);
                    break;
                  case "emote_only_on":
                    this.log.info(`[${channel}] This room is now in emote-only mode.`);
                    this.emits(["emoteonly", "_promiseEmoteonly"], [channelTrueArr, nullArr]);
                    break;
                  case "emote_only_off":
                    this.log.info(`[${channel}] This room is no longer in emote-only mode.`);
                    this.emits(["emoteonly", "_promiseEmoteonlyoff"], [channelFalseArr, nullArr]);
                    break;
                  case "slow_on":
                  case "slow_off":
                    break;
                  case "followers_on_zero":
                  case "followers_on":
                  case "followers_off":
                    break;
                  case "r9k_on":
                    this.log.info(`[${channel}] This room is now in r9k mode.`);
                    this.emits(["r9kmode", "r9kbeta", "_promiseR9kbeta"], [channelTrueArr, channelTrueArr, nullArr]);
                    break;
                  case "r9k_off":
                    this.log.info(`[${channel}] This room is no longer in r9k mode.`);
                    this.emits(["r9kmode", "r9kbeta", "_promiseR9kbetaoff"], [channelFalseArr, channelFalseArr, nullArr]);
                    break;
                  case "no_permission":
                  case "msg_banned":
                  case "msg_room_not_found":
                  case "msg_channel_suspended":
                  case "tos_ban":
                  case "invalid_user":
                    this.log.info(basicLog);
                    this.emits([
                      "notice",
                      "_promiseJoin",
                      "_promisePart"
                    ], [noticeArr, [msgid, channel]]);
                    break;
                  case "msg_rejected":
                  case "msg_rejected_mandatory":
                    this.log.info(basicLog);
                    this.emit("automod", channel, msgid, msg);
                    break;
                  case "unrecognized_cmd":
                    this.log.info(basicLog);
                    this.emit("notice", channel, msgid, msg);
                    break;
                  case "cmds_available":
                  case "msg_censored_broadcaster":
                  case "msg_duplicate":
                  case "msg_emoteonly":
                  case "msg_verified_email":
                  case "msg_ratelimit":
                  case "msg_subsonly":
                  case "msg_timedout":
                  case "msg_bad_characters":
                  case "msg_channel_blocked":
                  case "msg_facebook":
                  case "msg_followersonly":
                  case "msg_followersonly_followed":
                  case "msg_followersonly_zero":
                  case "msg_slowmode":
                  case "msg_suspended":
                  case "no_help":
                  case "usage_disconnect":
                  case "usage_help":
                  case "usage_me":
                  case "unavailable_command":
                    this.log.info(basicLog);
                    this.emit("notice", channel, msgid, msg);
                    break;
                  default:
                    if (msg.includes("Login unsuccessful") || msg.includes("Login authentication failed")) {
                      this.wasCloseCalled = false;
                      this.reconnect = false;
                      this.reason = msg;
                      this.log.error(this.reason);
                      this.ws.close();
                    } else if (msg.includes("Error logging in") || msg.includes("Improperly formatted auth")) {
                      this.wasCloseCalled = false;
                      this.reconnect = false;
                      this.reason = msg;
                      this.log.error(this.reason);
                      this.ws.close();
                    } else if (msg.includes("Invalid NICK")) {
                      this.wasCloseCalled = false;
                      this.reconnect = false;
                      this.reason = "Invalid NICK.";
                      this.log.error(this.reason);
                      this.ws.close();
                    } else {
                      this.log.warn(`Could not parse NOTICE from tmi.twitch.tv:
${JSON.stringify(message, null, 4)}`);
                      this.emit("notice", channel, msgid, msg);
                    }
                    break;
                }
                break;
              }
              case "USERNOTICE": {
                const username = tags["display-name"] || tags["login"];
                const plan = tags["msg-param-sub-plan"] || "";
                const planName = _.unescapeIRC(tags["msg-param-sub-plan-name"] ?? "") || null;
                const prime = plan.includes("Prime");
                const methods = { prime, plan, planName };
                const streakMonths = ~~(tags["msg-param-streak-months"] || 0);
                const recipient = tags["msg-param-recipient-display-name"] || tags["msg-param-recipient-user-name"];
                const giftSubCount = ~~tags["msg-param-mass-gift-count"];
                tags["message-type"] = msgid;
                switch (msgid) {
                  case "resub":
                    this.emits(["resub", "subanniversary"], [
                      [channel, username, streakMonths, msg, tags, methods]
                    ]);
                    break;
                  case "sub":
                    this.emits(["subscription", "sub"], [
                      [channel, username, methods, msg, tags]
                    ]);
                    break;
                  case "subgift":
                    this.emit("subgift", channel, username, streakMonths, recipient, methods, tags);
                    break;
                  case "anonsubgift":
                    this.emit("anonsubgift", channel, streakMonths, recipient, methods, tags);
                    break;
                  case "submysterygift":
                    this.emit("submysterygift", channel, username, giftSubCount, methods, tags);
                    break;
                  case "anonsubmysterygift":
                    this.emit("anonsubmysterygift", channel, giftSubCount, methods, tags);
                    break;
                  case "primepaidupgrade":
                    this.emit("primepaidupgrade", channel, username, methods, tags);
                    break;
                  case "giftpaidupgrade": {
                    const sender = tags["msg-param-sender-name"] || tags["msg-param-sender-login"];
                    this.emit("giftpaidupgrade", channel, username, sender, tags);
                    break;
                  }
                  case "anongiftpaidupgrade":
                    this.emit("anongiftpaidupgrade", channel, username, tags);
                    break;
                  case "raid": {
                    const username2 = tags["msg-param-displayName"] || tags["msg-param-login"];
                    const viewers = +tags["msg-param-viewerCount"];
                    this.emit("raided", channel, username2, viewers, tags);
                    break;
                  }
                  default:
                    this.emit("usernotice", msgid, channel, tags, msg);
                    break;
                }
                break;
              }
              case "CLEARCHAT":
                if (message.params.length > 1) {
                  const duration = message.tags["ban-duration"] ?? null;
                  if (duration === null) {
                    this.log.info(`[${channel}] ${msg} has been banned.`);
                    this.emit("ban", channel, msg, null, message.tags);
                  } else {
                    this.log.info(`[${channel}] ${msg} has been timed out for ${duration} seconds.`);
                    this.emit("timeout", channel, msg, null, ~~duration, message.tags);
                  }
                } else {
                  this.log.info(`[${channel}] Chat was cleared by a moderator.`);
                  this.emits(["clearchat", "_promiseClear"], [[channel], [null]]);
                }
                break;
              case "CLEARMSG":
                if (message.params.length > 1) {
                  const deletedMessage = msg;
                  const username = tags["login"];
                  tags["message-type"] = "messagedeleted";
                  this.log.info(`[${channel}] ${username}'s message has been deleted.`);
                  this.emit("messagedeleted", channel, username, deletedMessage, tags);
                }
                break;
              case "RECONNECT":
                this.log.info("Received RECONNECT request from Twitch..");
                this.log.info(`Disconnecting and reconnecting in ${Math.round(this.reconnectTimer / 1e3)} seconds..`);
                this.disconnect().catch((err) => this.log.error(err));
                setTimeout(() => this.connect().catch((err) => this.log.error(err)), this.reconnectTimer);
                break;
              case "USERSTATE":
                message.tags.username = this.username;
                if (message.tags["user-type"] === "mod") {
                  if (!this.moderators[channel]) {
                    this.moderators[channel] = [];
                  }
                  if (!this.moderators[channel].includes(this.username)) {
                    this.moderators[channel].push(this.username);
                  }
                }
                if (!_.isJustinfan(this.getUsername()) && !this.userstate[channel]) {
                  this.userstate[channel] = tags;
                  this.lastJoined = channel;
                  this.channels.push(channel);
                  this.log.info(`Joined ${channel}`);
                  this.emit("join", channel, _.username(this.getUsername()), true);
                }
                if (message.tags["emote-sets"] !== this.emotes) {
                  this.emit("emotesets", message.tags["emote-sets"], {});
                }
                this.userstate[channel] = tags;
                this.emit("userstate", channel, tags);
                break;
              case "GLOBALUSERSTATE":
                this.globaluserstate = tags;
                this.emit("globaluserstate", tags);
                if (typeof message.tags["emote-sets"] !== "undefined") {
                  this.emit("emotesets", message.tags["emote-sets"], {});
                }
                break;
              case "ROOMSTATE":
                if (_.channel(this.lastJoined) === channel) {
                  this.emit("_promiseJoin", null, channel);
                }
                message.tags.channel = channel;
                this.emit("roomstate", channel, message.tags);
                if (!_.hasOwn(message.tags, "subs-only")) {
                  if (_.hasOwn(message.tags, "slow")) {
                    if (typeof message.tags.slow === "boolean" && !message.tags.slow) {
                      const disabled = [channel, false, 0];
                      this.log.info(`[${channel}] This room is no longer in slow mode.`);
                      this.emits(["slow", "slowmode", "_promiseSlowoff"], [disabled, disabled, [null]]);
                    } else {
                      const seconds = ~~message.tags.slow;
                      const enabled = [channel, true, seconds];
                      this.log.info(`[${channel}] This room is now in slow mode.`);
                      this.emits(["slow", "slowmode", "_promiseSlow"], [enabled, enabled, [null]]);
                    }
                  }
                  if (_.hasOwn(message.tags, "followers-only")) {
                    if (message.tags["followers-only"] === "-1") {
                      const disabled = [channel, false, 0];
                      this.log.info(`[${channel}] This room is no longer in followers-only mode.`);
                      this.emits(["followersonly", "followersmode", "_promiseFollowersoff"], [disabled, disabled, [null]]);
                    } else {
                      const minutes = ~~message.tags["followers-only"];
                      const enabled = [channel, true, minutes];
                      this.log.info(`[${channel}] This room is now in follower-only mode.`);
                      this.emits(["followersonly", "followersmode", "_promiseFollowers"], [enabled, enabled, [null]]);
                    }
                  }
                }
                break;
              default:
                this.log.warn(`Could not parse message from tmi.twitch.tv:
${JSON.stringify(message, null, 4)}`);
                break;
            }
          } else if (message.prefix === "jtv") {
            switch (message.command) {
              case "MODE":
                if (msg === "+o") {
                  if (!this.moderators[channel]) {
                    this.moderators[channel] = [];
                  }
                  if (!this.moderators[channel].includes(message.params[2])) {
                    this.moderators[channel].push(message.params[2]);
                  }
                  this.emit("mod", channel, message.params[2]);
                } else if (msg === "-o") {
                  if (!this.moderators[channel]) {
                    this.moderators[channel] = [];
                  }
                  this.moderators[channel].filter((value) => value !== message.params[2]);
                  this.emit("unmod", channel, message.params[2]);
                }
                break;
              default:
                this.log.warn(`Could not parse message from jtv:
${JSON.stringify(message, null, 4)}`);
                break;
            }
          } else {
            switch (message.command) {
              case "353":
                this.emit("names", message.params[2], message.params[3].split(" "));
                break;
              case "366":
                break;
              case "JOIN": {
                const nick = message.prefix.split("!")[0];
                if (_.isJustinfan(this.getUsername()) && this.username === nick) {
                  this.lastJoined = channel;
                  this.channels.push(channel);
                  this.log.info(`Joined ${channel}`);
                  this.emit("join", channel, nick, true);
                }
                if (this.username !== nick) {
                  this.emit("join", channel, nick, false);
                }
                break;
              }
              case "PART": {
                let isSelf = false;
                const nick = message.prefix.split("!")[0];
                if (this.username === nick) {
                  isSelf = true;
                  if (this.userstate[channel]) {
                    delete this.userstate[channel];
                  }
                  let index = this.channels.indexOf(channel);
                  if (index !== -1) {
                    this.channels.splice(index, 1);
                  }
                  index = this.opts.channels.indexOf(channel);
                  if (index !== -1) {
                    this.opts.channels.splice(index, 1);
                  }
                  this.log.info(`Left ${channel}`);
                  this.emit("_promisePart", null);
                }
                this.emit("part", channel, nick, isSelf);
                break;
              }
              case "WHISPER": {
                const nick = message.prefix.split("!")[0];
                this.log.info(`[WHISPER] <${nick}>: ${msg}`);
                if (!_.hasOwn(message.tags, "username")) {
                  message.tags.username = nick;
                }
                message.tags["message-type"] = "whisper";
                const from = _.channel(message.tags.username);
                this.emits(["whisper", "message"], [
                  [from, message.tags, msg, false]
                ]);
                break;
              }
              case "PRIVMSG": {
                message.tags.username = message.prefix.split("!")[0];
                const messagesLogLevel = this.opts.options.messagesLogLevel ?? "info";
                const actionMessage = _.actionMessage(msg);
                message.tags["message-type"] = actionMessage ? "action" : "chat";
                msg = actionMessage ? actionMessage[1] : msg;
                if (_.hasOwn(message.tags, "bits")) {
                  this.emit("cheer", channel, message.tags, msg);
                } else {
                  if (_.hasOwn(message.tags, "msg-id")) {
                    const rewardtype = msgid;
                    this.emit("redeem", channel, message.tags.username, rewardtype, message.tags, msg);
                  } else if (_.hasOwn(message.tags, "custom-reward-id")) {
                    const rewardtype = message.tags["custom-reward-id"];
                    this.emit("redeem", channel, message.tags.username, rewardtype, message.tags, msg);
                  }
                  if (actionMessage) {
                    this.log[messagesLogLevel](`[${channel}] *<${message.tags.username}>: ${msg}`);
                    this.emits(["action", "message"], [
                      [channel, message.tags, msg, false]
                    ]);
                  } else {
                    this.log[messagesLogLevel](`[${channel}] <${message.tags.username}>: ${msg}`);
                    this.emits(["chat", "message"], [
                      [channel, message.tags, msg, false]
                    ]);
                  }
                }
                break;
              }
              default:
                this.log.warn(`Could not parse message:
${JSON.stringify(message, null, 4)}`);
                break;
            }
          }
        }
        // Connect to server..
        connect() {
          return new Promise((resolve, reject) => {
            this.server = this.opts.connection.server ?? "irc-ws.chat.twitch.tv";
            this.port = this.opts.connection.port ?? 80;
            if (this.secure) {
              this.port = 443;
            }
            if (this.port === 443) {
              this.secure = true;
            }
            this.reconnectTimer = this.reconnectTimer * this.reconnectDecay;
            if (this.reconnectTimer >= this.maxReconnectInterval) {
              this.reconnectTimer = this.maxReconnectInterval;
            }
            this._openConnection();
            this.once("_promiseConnect", (err) => {
              if (!err) {
                resolve([this.server, ~~this.port]);
              } else {
                reject(err);
              }
            });
          });
        }
        // Open a connection..
        _openConnection() {
          const url = `${this.secure ? "wss" : "ws"}://${this.server}:${this.port}/`;
          const connectionOptions = {};
          if ("agent" in this.opts.connection) {
            connectionOptions.agent = this.opts.connection.agent;
          }
          this.ws = new _WebSocket(url, "irc", connectionOptions);
          this.ws.onmessage = this._onMessage.bind(this);
          this.ws.onerror = this._onError.bind(this);
          this.ws.onclose = this._onClose.bind(this);
          this.ws.onopen = this._onOpen.bind(this);
        }
        // Called when the WebSocket connection's readyState changes to OPEN.
        // Indicates that the connection is ready to send and receive data..
        _onOpen() {
          if (!this._isConnected()) {
            return;
          }
          this.log.info(`Connecting to ${this.server} on port ${this.port}..`);
          this.emit("connecting", this.server, ~~this.port);
          this._getToken().then((token) => {
            const password = _.password(token);
            const isAnonymous = (password ?? "") === "";
            this.username = isAnonymous ? "justinfan123456" : "justinfan";
            this.log.info("Sending authentication to server..");
            this.emit("logon");
            let caps = "twitch.tv/tags twitch.tv/commands";
            if (!this._skipMembership) {
              caps += " twitch.tv/membership";
            }
            this.ws.send("CAP REQ :" + caps);
            this.ws.send(`PASS ${isAnonymous ? "SCHMOOPIIE" : password}`);
            this.ws.send(`NICK ${this.username}`);
          }).catch((err) => {
            this.emits(["_promiseConnect", "disconnected"], [[err], ["Could not get a token."]]);
          });
        }
        // Fetches a token from the option.
        _getToken() {
          const passwordOption = this.opts.identity.password;
          let password;
          if (typeof passwordOption === "function") {
            password = passwordOption();
            if (password instanceof Promise) {
              return password;
            }
            return Promise.resolve(password);
          }
          return Promise.resolve(passwordOption);
        }
        // Called when a message is received from the server..
        _onMessage(event) {
          const parts = event.data.trim().split("\r\n");
          parts.forEach((str) => {
            const msg = parse.msg(str);
            if (msg) {
              this.handleMessage(msg);
            }
          });
        }
        // Called when an error occurs..
        _onError() {
          this.moderators = {};
          this.userstate = {};
          this.globaluserstate = {};
          clearInterval(this.pingLoop);
          clearTimeout(this.pingTimeout);
          this.reason = this.ws === null ? "Connection closed." : "Unable to connect.";
          this.emits(["_promiseConnect", "disconnected"], [[this.reason]]);
          if (this.reconnect && this.reconnections === this.maxReconnectAttempts) {
            this.emit("maxreconnect");
            this.log.error("Maximum reconnection attempts reached.");
          }
          if (this.reconnect && !this.reconnecting && this.reconnections <= this.maxReconnectAttempts - 1) {
            this.reconnecting = true;
            this.reconnections = this.reconnections + 1;
            this.log.error(`Reconnecting in ${Math.round(this.reconnectTimer / 1e3)} seconds..`);
            this.emit("reconnect");
            setTimeout(() => {
              this.reconnecting = false;
              this.connect().catch((err) => this.log.error(err));
            }, this.reconnectTimer);
          }
          this.ws = null;
        }
        // Called when the WebSocket connection's readyState changes to CLOSED..
        _onClose() {
          this.moderators = {};
          this.userstate = {};
          this.globaluserstate = {};
          clearInterval(this.pingLoop);
          clearTimeout(this.pingTimeout);
          if (this.wasCloseCalled) {
            this.wasCloseCalled = false;
            this.reason = "Connection closed.";
            this.log.info(this.reason);
            this.emits(["_promiseConnect", "_promiseDisconnect", "disconnected"], [[this.reason], [null], [this.reason]]);
          } else {
            this.emits(["_promiseConnect", "disconnected"], [[this.reason]]);
            if (this.reconnect && this.reconnections === this.maxReconnectAttempts) {
              this.emit("maxreconnect");
              this.log.error("Maximum reconnection attempts reached.");
            }
            if (this.reconnect && !this.reconnecting && this.reconnections <= this.maxReconnectAttempts - 1) {
              this.reconnecting = true;
              this.reconnections = this.reconnections + 1;
              this.log.error(`Could not connect to server. Reconnecting in ${Math.round(this.reconnectTimer / 1e3)} seconds..`);
              this.emit("reconnect");
              setTimeout(() => {
                this.reconnecting = false;
                this.connect().catch((err) => this.log.error(err));
              }, this.reconnectTimer);
            }
          }
          this.ws = null;
        }
        _setPingLoop() {
          clearInterval(this.pingLoop);
          this.pingLoop = setInterval(() => {
            if (this._isConnected()) {
              this.ws.send("PING");
            }
            this.latency = /* @__PURE__ */ new Date();
            clearTimeout(this.pingTimeout);
            this.pingTimeout = setTimeout(() => {
              if (this.ws !== null) {
                this.wasCloseCalled = false;
                this.log.error("Ping timeout.");
                this.ws.close();
                clearInterval(this.pingLoop);
                clearTimeout(this.pingTimeout);
              }
            }, this.opts.connection.timeout ?? 9999);
          }, 6e4);
        }
        // Minimum of 600ms for command promises, if current latency exceeds, add 100ms to it to make sure it doesn't get timed out..
        _getPromiseDelay() {
          if (this.currentLatency <= 600) {
            return 600;
          } else {
            return this.currentLatency + 100;
          }
        }
        // Send command to server or channel..
        _sendCommand(delay, channel, command, fn) {
          return new Promise((resolve, reject) => {
            if (!this._isConnected()) {
              return reject("Not connected to server.");
            } else if (delay === null || typeof delay === "number") {
              if (delay === null) {
                delay = this._getPromiseDelay();
              }
              _.promiseDelay(delay).then(() => reject("No response from Twitch."));
            }
            if (channel !== null) {
              const chan = _.channel(channel);
              this.log.info(`[${chan}] Executing command: ${command}`);
              this.ws.send(`PRIVMSG ${chan} :${command}`);
            } else {
              this.log.info(`Executing command: ${command}`);
              this.ws.send(command);
            }
            if (typeof fn === "function") {
              fn(resolve, reject);
            } else {
              resolve();
            }
          });
        }
        // Send a message to channel..
        _sendMessage(delay, channel, message, tags, fn) {
          if (typeof tags === "function") {
            [fn, tags] = [tags, {}];
          }
          return new Promise((resolve, reject) => {
            if (!this._isConnected()) {
              return reject("Not connected to server.");
            } else if (_.isJustinfan(this.getUsername())) {
              return reject("Cannot send anonymous messages.");
            }
            const chan = _.channel(channel);
            if (!this.userstate[chan]) {
              this.userstate[chan] = {};
            }
            if (message.length >= 500) {
              const msg = _.splitLine(message, 500);
              message = msg[0];
              setTimeout(() => {
                this._sendMessage(delay, channel, msg[1], () => {
                });
              }, 350);
            }
            const clientNonce = `tmi.js_${_.nonce()}`;
            const tagsStr = _.formatTags({ "client-nonce": clientNonce, ...tags ?? {} });
            this.ws.send(`@${tagsStr} PRIVMSG ${chan} :${message}`);
            const emotes = {};
            Object.keys(this.emotesets).forEach((id) => this.emotesets[id].forEach((emote) => {
              const emoteFunc = _.isRegex(emote.code) ? parse.emoteRegex : parse.emoteString;
              return emoteFunc(message, emote.code, emote.id, emotes);
            }));
            const userstate = Object.assign(
              this.userstate[chan],
              parse.emotes({ emotes: parse.transformEmotes(emotes) || null })
            );
            const messagesLogLevel = this.opts.options.messagesLogLevel ?? "info";
            if (message.startsWith("/me ")) {
              userstate["message-type"] = "action";
              const text = message.slice(4);
              this.log[messagesLogLevel](`[${chan}] *<${this.getUsername()}>: ${text}`);
              this.emits(["action", "message"], [
                [chan, userstate, text, true]
              ]);
            } else {
              userstate["message-type"] = "chat";
              this.log[messagesLogLevel](`[${chan}] <${this.getUsername()}>: ${message}`);
              this.emits(["chat", "message"], [
                [chan, userstate, message, true]
              ]);
            }
            if (typeof fn === "function") {
              fn(resolve, reject, clientNonce);
            } else {
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
          if (!this.moderators[chan]) {
            this.moderators[chan] = [];
          }
          return this.moderators[chan].includes(_.username(username));
        }
        // Get readyState..
        readyState() {
          if (this.ws === null) {
            return "CLOSED";
          }
          return ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][this.ws.readyState];
        }
        // Determine if the client has a WebSocket and it's open..
        _isConnected() {
          return this.ws !== null && this.ws.readyState === 1;
        }
        // Disconnect from server..
        disconnect() {
          return new Promise((resolve, reject) => {
            if (this.ws !== null && this.ws.readyState !== 3) {
              this.wasCloseCalled = true;
              this.log.info("Disconnecting from server..");
              this.ws.close();
              this.once("_promiseDisconnect", () => resolve([this.server, ~~this.port]));
            } else {
              this.log.error("Cannot disconnect from server. Socket is not opened or connection is already closing.");
              reject("Cannot disconnect from server. Socket is not opened or connection is already closing.");
            }
          });
        }
        // Send a ping to the server..
        ping() {
          return this._sendCommand(null, null, "PING", (resolve, _reject) => {
            this.latency = /* @__PURE__ */ new Date();
            this._setPingLoop();
            this.once("_promisePing", (latency) => resolve([parseFloat(latency)]));
          });
        }
        // Join a channel by name..
        async join(channel) {
          channel = _.channel(channel);
          _.validateChannel(channel);
          return this._sendCommand(void 0, null, `JOIN ${channel}`, (resolve, reject) => {
            const eventName = "_promiseJoin";
            let hasFulfilled = false;
            const listener = (err, joinedChannel) => {
              if (channel === _.channel(joinedChannel)) {
                this.removeListener(eventName, listener);
                hasFulfilled = true;
                if (!err) {
                  resolve([channel]);
                } else {
                  reject(err);
                }
              }
            };
            this.on(eventName, listener);
            const delay = this._getPromiseDelay();
            _.promiseDelay(delay).then(() => {
              if (!hasFulfilled) {
                this.emit(eventName, "No response from Twitch.", channel);
              }
            });
          });
        }
        // Leave a channel..
        async part(channel) {
          channel = _.channel(channel);
          _.validateChannel(channel);
          return this._sendCommand(null, null, `PART ${channel}`, (resolve, reject) => {
            this.once("_promisePart", (err) => {
              if (!err) {
                resolve([channel]);
              } else {
                reject(err);
              }
            });
          });
        }
        // Alias for part()..
        leave(channel) {
          return this.part(channel);
        }
        // Send a raw message to the server..
        raw(message) {
          return this._sendCommand(null, null, message, (resolve, _reject) => resolve([message]));
        }
        // Send a message on a channel..
        async say(channel, message, tags = {}) {
          channel = _.channel(channel);
          _.validateChannel(channel);
          const text = message.startsWith("/me ") ? message.slice(4) : message;
          return this._sendMessage(this._getPromiseDelay(), channel, message, tags, (resolve, reject, clientNonce) => {
            const eventName = "userstate";
            let hasFulfilled = false;
            const listener = (eventChannel, eventTags) => {
              if (channel === eventChannel && eventTags["client-nonce"] === clientNonce) {
                this.removeListener(eventName, listener);
                hasFulfilled = true;
                resolve([channel, text, eventTags, true]);
              }
            };
            this.on(eventName, listener);
            const delay = this._getPromiseDelay();
            _.promiseDelay(delay).then(() => {
              if (!hasFulfilled) {
                this.removeListener(eventName, listener);
                reject("No response from Twitch.");
              }
            });
          });
        }
        // Send an action message (/me <message>) to a channel..
        action(channel, message) {
          return this.say(channel, `/me ${message}`);
        }
        reply(channel, message, parentId) {
          return this.say(channel, message, { "reply-parent-msg-id": parentId });
        }
      };
      module.exports = Client;
    }
  });

  // index.js
  var require_tmi = __commonJS({
    "index.js"(exports, module) {
      var Client = require_client();
      module.exports = {
        client: Client,
        Client
      };
    }
  });
  return require_tmi();
})();
//# sourceMappingURL=tmi.js.map
