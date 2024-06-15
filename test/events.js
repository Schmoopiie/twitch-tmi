const should = require('should');
const tmi = require('../index.js');

const events = [ {
	name: 'action',
	data: '@badges=broadcaster/1,warcraft/horde;color=#0D4200;display-name=Schmoopiie;emotes=25:0-4,12-16/1902:6-10;subscriber=0;turbo=1;user-type=global_mod :schmoopiie!~schmoopiie@schmoopiie.tmi.twitch.tv PRIVMSG #schmoopiie :\u0001ACTION Hello :)\u0001',
	expected: [
		'#schmoopiie',
		{
			badges: { broadcaster: '1', warcraft: 'horde' },
			color: '#0D4200',
			'display-name': 'Schmoopiie',
			emotes: {
				'25': [ '0-4', '12-16' ],
				'1902': [ '6-10' ]
			},
			subscriber: false,
			turbo: true,
			'user-type': 'global_mod',
			'emotes-raw': '25:0-4,12-16/1902:6-10',
			'badges-raw': 'broadcaster/1,warcraft/horde',
			username: 'schmoopiie',
			'message-type': 'action'
		},
		'Hello :)'
	]
}, {
	name: 'automod',
	data: '@msg-id=msg_rejected :tmi.twitch.tv NOTICE #schmoopiie :Hey! Your message is being checked by mods and has not been sent.',
	expected: [
		'#schmoopiie',
		'msg_rejected',
		'Hey! Your message is being checked by mods and has not been sent.'
	]
}, {
	name: 'automod',
	data: '@msg-id=msg_rejected_mandatory :tmi.twitch.tv NOTICE #schmoopiie :Your message wasn\'t posted due to conflicts with the channel\'s moderation settings.',
	expected: [
		'#schmoopiie',
		'msg_rejected_mandatory',
		'Your message wasn\'t posted due to conflicts with the channel\'s moderation settings.'
	]
}, {
	name: 'ban',
	data: '@room-id=20624989;target-user-id=20624989 :tmi.twitch.tv CLEARCHAT #schmoopiie :schmoopiie',
	expected: [
		'#schmoopiie',
		'schmoopiie',
		null,
		{
			'room-id': '20624989',
			'target-user-id': '20624989'
		}
	]
}, {
	name: 'chat',
	// data: '@badges=broadcaster/1,warcraft/horde;color=#0D4200;display-name=Schmoopiie;emotes=25:0-4,12-16/1902:6-10;subscriber=0;turbo=1;user-type=global_mod :schmoopiie!~schmoopiie@schmoopiie.tmi.twitch.tv PRIVMSG #schmoopiie :Hello :)',
	data: '@badge-info=subscriber/21;badges=broadcaster/1,subscriber/12,overwatch-league-insider_2019A/1;color=#177DE3;display-name=Alca;emotes=499:3-4;flags=;id=c5ddcb05-85ae-4a60-91bc-7704c7031257;mod=0;room-id=7676884;subscriber=1;tmi-sent-ts=1554296462753;turbo=0;user-id=7676884;user-type= :alca!alca@alca.tmi.twitch.tv PRIVMSG #alca :Hi :)',
	expected: [
		'#alca',
		{
			'badge-info': { subscriber: '21' },
			badges: {
				broadcaster: '1',
				subscriber: '12',
				'overwatch-league-insider_2019A': '1'
			},
			color: '#177DE3',
			'display-name': 'Alca',
			emotes: { '499': [ '3-4' ] },
			flags: null,
			id: 'c5ddcb05-85ae-4a60-91bc-7704c7031257',
			mod: false,
			'room-id': '7676884',
			subscriber: true,
			'tmi-sent-ts': '1554296462753',
			turbo: false,
			'user-id': '7676884',
			'user-type': null,
			'emotes-raw': '499:3-4',
			'badge-info-raw': 'subscriber/21',
			'badges-raw': 'broadcaster/1,subscriber/12,overwatch-league-insider_2019A/1',
			username: 'alca',
			'message-type': 'chat'
		},
		'Hi :)'
	]
}, {
	name: 'cheer',
	data: '@badges=broadcaster/1,warcraft/horde;color=#0D4200;bits=100;display-name=Schmoopiie;emotes=;subscriber=0;turbo=1;user-type=global_mod :schmoopiie!~schmoopiie@schmoopiie.tmi.twitch.tv PRIVMSG #schmoopiie :cheer100 Hello :)',
	expected: [
		'#schmoopiie',
		{
			badges: { broadcaster: '1', warcraft: 'horde' },
			bits: '100',
			color: '#0D4200',
			'display-name': 'Schmoopiie',
			emotes: null,
			'message-type': 'chat',
			subscriber: false,
			turbo: true,
			'user-type': 'global_mod',
			'emotes-raw': null,
			'badges-raw': 'broadcaster/1,warcraft/horde',
			username: 'schmoopiie'
		},
		'cheer100 Hello :)'
	]
}, {
	name: 'cheer',
	data: '@badges=broadcaster/1,warcraft/horde;color=#0D4200;bits=100;display-name=Schmoopiie;emotes=;subscriber=0;turbo=1;user-type=global_mod :schmoopiie!~schmoopiie@schmoopiie.tmi.twitch.tv PRIVMSG #schmoopiie :\u0001ACTION cheer100 Hello :)\u0001',
	expected: [
		'#schmoopiie',
		{
			badges: { broadcaster: '1', warcraft: 'horde' },
			bits: '100',
			color: '#0D4200',
			'display-name': 'Schmoopiie',
			emotes: null,
			'message-type': 'action',
			subscriber: false,
			turbo: true,
			'user-type': 'global_mod',
			'emotes-raw': null,
			'badges-raw': 'broadcaster/1,warcraft/horde',
			username: 'schmoopiie'
		},
		'cheer100 Hello :)'
	]
}, {
	name: 'clearchat',
	data: ':tmi.twitch.tv CLEARCHAT #schmoopiie',
	expected: [
		'#schmoopiie'
	]
}, {
	name: 'connected',
	data: ':tmi.twitch.tv 376 schmoopiie :>'
}, {
	name: 'emotesets',
	data: '@color=#1E90FF;display-name=Schmoopiie;emote-sets=0;turbo=0;user-type= :tmi.twitch.tv GLOBALUSERSTATE',
	expected: [
		'0'
	]
}, {
	name: 'globaluserstate',
	data: '@badge-info=;badges=glitchcon2020/1;color=#177DE3;display-name=Alca;emote-sets=0;user-id=7676884;user-type= :tmi.twitch.tv GLOBALUSERSTATE',
	expected: [
		{
			'badge-info': null,
			'badge-info-raw': null,
			badges: { glitchcon2020: '1' },
			'badges-raw': 'glitchcon2020/1',
			color: '#177DE3',
			'display-name': 'Alca',
			'emote-sets': '0',
			'user-id': '7676884',
			'user-type': null
		}
	]
}, {
	name: 'join',
	data: ':schmoopiie!schmoopiie@schmoopiie.tmi.twitch.tv JOIN #schmoopiie',
	expected: [
		'#schmoopiie',
		'schmoopiie',
		false
	]
}, {
	name: 'mod',
	data: ':jtv MODE #schmoopiie +o schmoopiie',
	expected: [
		'#schmoopiie',
		'schmoopiie'
	]
}, {
	name: 'part',
	data: ':schmoopiie!schmoopiie@schmoopiie.tmi.twitch.tv PART #schmoopiie',
	expected: [
		'#schmoopiie',
		'schmoopiie',
		false
	]
}, {
	name: 'ping',
	data: 'PING :tmi.twitch.tv'
}, {
	name: 'pong',
	data: 'PONG :tmi.twitch.tv'
}, {
	name: 'r9kbeta',
	data: '@msg-id=r9k_on :tmi.twitch.tv NOTICE #schmoopiie :This room is now in r9k mode.',
	expected: [
		'#schmoopiie',
		true
	]
}, {
	name: 'r9kbeta',
	data: '@msg-id=r9k_off :tmi.twitch.tv NOTICE #schmoopiie :This room is no longer in r9k mode.',
	expected: [
		'#schmoopiie',
		false
	]
}, {
	name: 'raided',
	data: '@badges=bits/100;color=#FF0000;display-name=Raider;emotes=;flags=;id=00000000-0000-0000-0000-000000000000;login=raider;mod=0;msg-id=raid;msg-param-displayName=Raider;msg-param-login=raider;msg-param-profileImageURL=https://static-cdn.jtvnw.net/jtv_user_pictures/IMAGE_ID-profile_image-70x70.png;msg-param-viewerCount=6;room-id=987654321;subscriber=0;system-msg=6\\sraiders\\sfrom\\sraider\\shave\\sjoined\\n!;tmi-sent-ts=1500000000000;turbo=0;user-id=123456789;user-type= :tmi.twitch.tv USERNOTICE #channel',
	expected: [
		'#channel',
		'Raider',
		6,
		{
			badges: { bits: '100' },
			'badges-raw': 'bits/100',
			color: '#FF0000',
			'display-name': 'Raider',
			emotes: null,
			'emotes-raw': null,
			flags: null,
			id: '00000000-0000-0000-0000-000000000000',
			login: 'raider',
			'message-type': 'raid',
			mod: false,
			'msg-id': 'raid',
			'msg-param-displayName': 'Raider',
			'msg-param-login': 'raider',
			'msg-param-profileImageURL': 'https://static-cdn.jtvnw.net/jtv_user_pictures/IMAGE_ID-profile_image-70x70.png',
			'msg-param-viewerCount': '6',
			'room-id': '987654321',
			subscriber: false,
			'system-msg': '6 raiders from raider have joined!',
			'tmi-sent-ts': '1500000000000',
			turbo: false,
			'user-id': '123456789',
			'user-type': null
		}
	]
}, {
	name: 'roomstate',
	data: '@broadcaster-lang=;r9k=0;slow=0;subs-only=0 :tmi.twitch.tv ROOMSTATE #schmoopiie',
	expected: [
		'#schmoopiie',
		{
			'broadcaster-lang': null,
			r9k: false,
			slow: false,
			'subs-only': false,
			channel: '#schmoopiie'
		}
	]
}, {
	name: 'slowmode',
	data: '@slow=8 :tmi.twitch.tv ROOMSTATE #schmoopiie',
	expected: [
		'#schmoopiie',
		true,
		8
	]
}, {
	name: 'slowmode',
	data: '@slow=0 :tmi.twitch.tv ROOMSTATE #schmoopiie',
	expected: [
		'#schmoopiie',
		false,
		0
	]
}, {
	name: 'subanniversary',
	data: '@badges=staff/1,subscriber/6,turbo/1;color=#008000;display-name=Schmoopiie;emotes=;flags=;id=00000000-0000-0000-0000-000000000000;login=schmoopiie;mod=0;msg-id=resub;msg-param-cumulative-months=7;msg-param-should-share-streak=0;msg-param-sub-plan-name=Channel\\sSubscription\\s(Schmoopiie);msg-param-sub-plan=Prime;room-id=20624989;subscriber=1;system-msg=Schmoopiie\\sSubscribed\\swith\\sTwitch\\sPrime.;tmi-sent-ts=1500000000000;turbo=0;user-id=20624989;user-type=staff :tmi.twitch.tv USERNOTICE #schmoopiie :Great stream -- keep it up!',
	expected: [
		'#schmoopiie',
		'Schmoopiie',
		0,
		'Great stream -- keep it up!',
		{
			badges: { staff: '1', subscriber: '6', turbo: '1' },
			'badges-raw': 'staff/1,subscriber/6,turbo/1',
			color: '#008000',
			'display-name': 'Schmoopiie',
			emotes: null,
			'emotes-raw': null,
			flags: null,
			id: '00000000-0000-0000-0000-000000000000',
			login: 'schmoopiie',
			'message-type': 'resub',
			mod: false,
			'msg-id': 'resub',
			'msg-param-cumulative-months': '7',
			'msg-param-should-share-streak': false,
			'msg-param-sub-plan': 'Prime',
			'msg-param-sub-plan-name': 'Channel Subscription (Schmoopiie)',
			'room-id': '20624989',
			subscriber: true,
			'system-msg': 'Schmoopiie Subscribed with Twitch Prime.',
			'tmi-sent-ts': '1500000000000',
			turbo: false,
			'user-id': '20624989',
			'user-type': 'staff'
		},
		{
			prime: true,
			plan: 'Prime',
			planName: 'Channel Subscription (Schmoopiie)'
		}
	]
}, {
	name: 'resub',
	data: '@badges=staff/1,subscriber/6,turbo/1;color=#008000;display-name=Schmoopiie;emotes=;flags=;id=00000000-0000-0000-0000-000000000000;login=schmoopiie;mod=0;msg-id=resub;msg-param-cumulative-months=7;msg-param-should-share-streak=1;msg-param-streak-months=6;msg-param-sub-plan-name=Channel\\sSubscription\\s(Schmoopiie);msg-param-sub-plan=Prime;room-id=20624989;subscriber=1;system-msg=Schmoopiie\\sSubscribed\\swith\\sTwitch\\sPrime.;tmi-sent-ts=1500000000000;turbo=0;user-id=20624989;user-type=staff :tmi.twitch.tv USERNOTICE #schmoopiie :Great stream -- keep it up!',
	expected: [
		'#schmoopiie',
		'Schmoopiie',
		6,
		'Great stream -- keep it up!',
		{
			badges: { staff: '1', subscriber: '6', turbo: '1' },
			'badges-raw': 'staff/1,subscriber/6,turbo/1',
			color: '#008000',
			'display-name': 'Schmoopiie',
			emotes: null,
			'emotes-raw': null,
			flags: null,
			id: '00000000-0000-0000-0000-000000000000',
			login: 'schmoopiie',
			'message-type': 'resub',
			mod: false,
			'msg-id': 'resub',
			'msg-param-cumulative-months': '7',
			'msg-param-should-share-streak': true,
			'msg-param-streak-months': '6',
			'msg-param-sub-plan': 'Prime',
			'msg-param-sub-plan-name': 'Channel Subscription (Schmoopiie)',
			'room-id': '20624989',
			subscriber: true,
			'system-msg': 'Schmoopiie Subscribed with Twitch Prime.',
			'tmi-sent-ts': '1500000000000',
			turbo: false,
			'user-id': '20624989',
			'user-type': 'staff'
		},
		{
			prime: true,
			plan: 'Prime',
			planName: 'Channel Subscription (Schmoopiie)'
		}
	]
}, {
	name: 'subscribers',
	data: '@msg-id=subs_on :tmi.twitch.tv NOTICE #schmoopiie :This room is now in subscribers-only mode.',
	expected: [
		'#schmoopiie',
		true
	]
}, {
	name: 'subscribers',
	data: '@msg-id=subs_off :tmi.twitch.tv NOTICE #schmoopiie :This room is no longer in subscribers-only mode.',
	expected: [
		'#schmoopiie',
		false
	]
}, {
	name: 'subscription',
	data: '@badges=staff/1,subscriber/1,turbo/1;color=#008000;display-name=Schmoopiie;emotes=;mod=0;msg-id=sub;room-id=20624989;subscriber=1;msg-param-sub-plan=Prime;msg-param-sub-plan-name=Channel\\sSubscription\\s(Schmoopiie);system-msg=Schmoopiie\\sjust\\ssubscribed!;login=schmoopiie;turbo=1;user-id=20624989;user-type=staff :tmi.twitch.tv USERNOTICE #schmoopiie :Great stream -- keep it up!',
	expected: [
		'#schmoopiie',
		'Schmoopiie',
		{
			'prime': true,
			'plan': 'Prime',
			'planName': 'Channel Subscription (Schmoopiie)'
		},
		'Great stream -- keep it up!',
		{
			badges: { staff: '1', subscriber: '1', turbo: '1' },
			'badges-raw': 'staff/1,subscriber/1,turbo/1',
			color: '#008000',
			'display-name': 'Schmoopiie',
			emotes: null,
			'emotes-raw': null,
			login: 'schmoopiie',
			'message-type': 'sub',
			mod: false,
			'msg-id': 'sub',
			'msg-param-sub-plan': 'Prime',
			'msg-param-sub-plan-name': 'Channel Subscription (Schmoopiie)',
			'room-id': '20624989',
			subscriber: true,
			'system-msg': 'Schmoopiie just subscribed!',
			turbo: true,
			'user-id': '20624989',
			'user-type': 'staff'
		}
	]
}, {
	name: 'giftpaidupgrade',
	data: '@badge-info=subscriber/1;badges=subscriber/0;color=;display-name=SubscriberName;emotes=;flags=;id=00000000-0000-0000-0000-000000000000;login=subscribername;mod=0;msg-id=giftpaidupgrade;msg-param-sender-login=sendername;msg-param-sender-name=SenderName;room-id=123456789;subscriber=1;system-msg=SubscriberName\\sis\\scontinuing\\sthe\\sGift\\sSub\\sthey\\sgot\\sfrom\\sSenderName!;tmi-sent-ts=1590000000000;user-id=987654321;user-type= :tmi.twitch.tv USERNOTICE #channelname',
	expected: [
		'#channelname',
		'SubscriberName',
		'SenderName',
		{
			'badge-info': { subscriber: '1' },
			'badge-info-raw': 'subscriber/1',
			badges: { subscriber: '0' },
			'badges-raw': 'subscriber/0',
			color: null,
			'display-name': 'SubscriberName',
			emotes: null,
			'emotes-raw': null,
			flags: null,
			id: '00000000-0000-0000-0000-000000000000',
			login: 'subscribername',
			'message-type': 'giftpaidupgrade',
			mod: false,
			'msg-id': 'giftpaidupgrade',
			'msg-param-sender-login': 'sendername',
			'msg-param-sender-name': 'SenderName',
			'room-id': '123456789',
			subscriber: true,
			'system-msg': 'SubscriberName is continuing the Gift Sub they got from SenderName!',
			'tmi-sent-ts': '1590000000000',
			'user-id': '987654321',
			'user-type': null
		}
	]
}, {
	name: 'anongiftpaidupgrade',
	data: '@badge-info=subscriber/1;badges=vip/1,subscriber/0,premium/1;color=#D2691E;display-name=SubscriberName;emotes=;flags=;id=00000000-0000-0000-0000-000000000000;login=subscribername;mod=0;msg-id=anongiftpaidupgrade;room-id=123456789;subscriber=1;system-msg=SubscriberName\\sis\\scontinuing\\sthe\\sGift\\sSub\\sthey\\sgot\\sfrom\\san\\sanonymous\\suser!;tmi-sent-ts=1590000000000;user-id=987654321;user-type= :tmi.twitch.tv USERNOTICE #channelname',
	expected: [
		// channel, username, userstate
		'#channelname',
		'SubscriberName',
		{
			'badge-info': {
				'subscriber': '1'
			},
			'badge-info-raw': 'subscriber/1',
			badges: {
				premium: '1',
				subscriber: '0',
				vip: '1'
			},
			'badges-raw': 'vip/1,subscriber/0,premium/1',
			color: '#D2691E',
			'display-name': 'SubscriberName',
			emotes: null,
			'emotes-raw': null,
			flags: null,
			id: '00000000-0000-0000-0000-000000000000',
			login: 'subscribername',
			'message-type': 'anongiftpaidupgrade',
			mod: false,
			'msg-id': 'anongiftpaidupgrade',
			'room-id': '123456789',
			subscriber: true,
			'system-msg': 'SubscriberName is continuing the Gift Sub they got from an anonymous user!',
			'tmi-sent-ts': '1590000000000',
			'user-id': '987654321',
			'user-type': null
		}
	]
}, {
	name: 'primepaidupgrade',
	data: '@badge-info=subscriber/2;badges=subscriber/0,premium/1;color=;display-name=SubscriberName;emotes=;flags=;id=00000000-0000-0000-0000-000000000000;login=subscribername;mod=0;msg-id=primepaidupgrade;msg-param-sub-plan=1000;room-id=123456789;subscriber=1;system-msg=SubscriberName\\sconverted\\sfrom\\sa\\sTwitch\\sPrime\\ssub\\sto\\sa\\sTier\\s1\\ssub!;tmi-sent-ts=1590000000000;user-id=987654321;user-type= :tmi.twitch.tv USERNOTICE #channelname',
	expected: [
		// channel, username, methods, userstate
		'#channelname',
		'SubscriberName',
		{
			plan: '1000',
			planName: null,
			prime: false
		},
		{
			'badge-info': { subscriber: '2' },
			'badge-info-raw': 'subscriber/2',
			badges: { premium: '1', subscriber: '0' },
			'badges-raw': 'subscriber/0,premium/1',
			color: null,
			'display-name': 'SubscriberName',
			emotes: null,
			'emotes-raw': null,
			flags: null,
			id: '00000000-0000-0000-0000-000000000000',
			login: 'subscribername',
			'message-type': 'primepaidupgrade',
			mod: false,
			'msg-id': 'primepaidupgrade',
			'msg-param-sub-plan': '1000',
			'room-id': '123456789',
			subscriber: true,
			'system-msg': 'SubscriberName converted from a Twitch Prime sub to a Tier 1 sub!',
			'tmi-sent-ts': '1590000000000',
			'user-id': '987654321',
			'user-type': null
		}
	]
}, {
	name: 'timeout',
	data: '@ban-duration=60;room-id=20624989;target-user-id=20624989 :tmi.twitch.tv CLEARCHAT #schmoopiie :schmoopiie',
	expected: [
		'#schmoopiie',
		'schmoopiie',
		null,
		60,
		{
			'ban-duration': '60',
			'room-id': '20624989',
			'target-user-id': '20624989'
		}
	]
}, {
	name: 'unmod',
	data: ':jtv MODE #schmoopiie -o schmoopiie',
	expected: [
		'#schmoopiie',
		'schmoopiie'
	]
}, {
	name: 'whisper',
	data: '@color=#FFFFFF;display-name=Schmoopiie;emotes=;turbo=1;user-type= :schmoopiie!schmoopiie@schmoopiie.tmi.twitch.tv WHISPER martinlarouche :Hello! ;-)',
	expected: [
		'#schmoopiie',
		{
			color: '#FFFFFF',
			'display-name': 'Schmoopiie',
			emotes: null,
			turbo: true,
			'user-type': null,
			'emotes-raw': null,
			username: 'schmoopiie',
			'message-type': 'whisper'
		},
		'Hello! ;-)',
		false
	]
}, {
	name: 'redeem',
	data: '@badge-info=;color=#0FC7D1;custom-reward-id=27c8e486-a386-40cc-9a4b-dbb5cf01e439;display-name=MurdocTurner;emotes=;flags=;id=702b9546-f0fe-41cb-b35b-fba5f8315909;mod=1;room-id=7676884;subscriber=0;tmi-sent-ts=1607582291194;turbo=0;user-id=89983882;user-type=mod :murdocturner!murdocturner@murdocturner.tmi.twitch.tv PRIVMSG #channel :lol',
	expected: [
		'#channel',
		'murdocturner',
		'27c8e486-a386-40cc-9a4b-dbb5cf01e439',
		{
			'badge-info': null,
			color: '#0FC7D1',
			'custom-reward-id': '27c8e486-a386-40cc-9a4b-dbb5cf01e439',
			'display-name': 'MurdocTurner',
			emotes: null,
			flags: null,
			id: '702b9546-f0fe-41cb-b35b-fba5f8315909',
			mod: true,
			'room-id': '7676884',
			subscriber: false,
			'tmi-sent-ts': '1607582291194',
			turbo: false,
			'message-type': 'chat',
			'user-id': '89983882',
			'user-type': 'mod',
			'badge-info-raw': null,
			'emotes-raw': null,
			'username': 'murdocturner'
		},
		'lol'
	]
}, {
	name: 'redeem',
	data: '@badge-info=;badges=;color=#9ACD32;display-name=MurdocTurner;emotes=;flags=;id=da38bdb9-2d50-4961-8da3-ca2737132773;mod=0;msg-id=skip-subs-mode-message;room-id=121476331;subscriber=0;tmi-sent-ts=1607586320639;turbo=0;user-id=89983882;user-type= :murdocturner!murdocturner@murdocturner.tmi.twitch.tv PRIVMSG #channel :test',
	expected: [
		'#channel',
		'murdocturner',
		'skip-subs-mode-message',
		{
			'badge-info': null,
			badges: null,
			color: '#9ACD32',
			'display-name': 'MurdocTurner',
			emotes: null,
			flags: null,
			id: 'da38bdb9-2d50-4961-8da3-ca2737132773',
			mod: false,
			'msg-id': 'skip-subs-mode-message',
			'room-id': '121476331',
			subscriber: false,
			'tmi-sent-ts': '1607586320639',
			turbo: false,
			'message-type': 'chat',
			'user-id': '89983882',
			'user-type': null,
			'badge-info-raw': null,
			'badges-raw': null,
			'emotes-raw': null,
			'username': 'murdocturner'
		},
		'test'
	]
}, {
	name: 'redeem',
	data: '@badge-info=;color=#0FC7D1;display-name=MurdocTurner;emotes=;flags=;id=3da15282-3268-402e-8fc7-d736d7093077;mod=1;msg-id=highlighted-message;room-id=121476331;subscriber=0;tmi-sent-ts=1607586921729;turbo=0;user-id=89983882;user-type=mod :murdocturner!murdocturner@murdocturner.tmi.twitch.tv PRIVMSG #channel :test123',
	expected: [
		'#channel',
		'murdocturner',
		'highlighted-message',
		{
			'badge-info': null,
			color: '#0FC7D1',
			'display-name': 'MurdocTurner',
			emotes: null,
			flags: null,
			id: '3da15282-3268-402e-8fc7-d736d7093077',
			mod: true,
			'msg-id': 'highlighted-message',
			'room-id': '121476331',
			subscriber: false,
			'tmi-sent-ts': '1607586921729',
			turbo: false,
			'message-type': 'chat',
			'user-id': '89983882',
			'user-type': 'mod',
			'badge-info-raw': null,
			'emotes-raw': null,
			'username': 'murdocturner'
		},
		'test123'
	]
} ];

describe('client events', () => {
	events.forEach(e => {
		const { name, data, expected } = e;
		it(`emit ${name}`, cb => {
			const client = new tmi.Client();

			client.on(name, (...args) => {
				'Reach this callback'.should.be.ok();
				expected && expected.forEach((data, index) => {
					if(data === null) {
						should.not.exist(args[index]);
					}
					else {
						args[index].should.eql(data);
					}
				});
				cb();
			});

			client._onMessage({ data: data });
		});
	});

	it('emits disconnected', cb => {
		const client = new tmi.Client();

		client.on('disconnected', reason => {
			reason.should.be.exactly('Connection closed.').and.be.a.String();
			cb();
		});

		client.log.error = function noop() {};
		client._onError();
	});
});
