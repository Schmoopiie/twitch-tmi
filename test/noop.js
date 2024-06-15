const tmi = require('../index.js');

const tests = [
	':tmi.twitch.tv 002',
	':tmi.twitch.tv 003',
	':tmi.twitch.tv 004',
	':tmi.twitch.tv 375',
	':tmi.twitch.tv 372 schmoopiie :You are in a maze of twisty passages.',
	':tmi.twitch.tv CAP',
	'@msg-id=slow_on :tmi.twitch.tv NOTICE #schmoopiie',
	'@msg-id=slow_off :tmi.twitch.tv NOTICE #schmoopiie',
	':schmoopiie!schmoopiie@schmoopiie.tmi.twitch.tv 366'
];

describe('no-op server events', () => {
	tests.forEach(test => {
		it(`treat "${test}" as a no-op`, () => {
			const stopTest = function() {
				'Should not call this'.should.not.be.ok();
			};

			const client = new tmi.Client({
				logger: {
					trace: stopTest,
					debug: stopTest,
					info: stopTest,
					warn: stopTest,
					error: stopTest,
					fatal: stopTest
				}
			});

			client._onMessage({ data: test });
		});
	});
});
