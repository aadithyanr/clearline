require('ts-node/register/transpile-only');

(async () => {
  const { WhatsappBot } = require('../lib/whatsappBot.ts');
  console.log('Starting Clearline WhatsApp bot...');
  new WhatsappBot();
})();
