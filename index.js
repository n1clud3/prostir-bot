const { Client, Events, GatewayIntentBits } = require("discord.js");
const config = require("./config.json");
const Logger = require("./logging");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

client.once(Events.ClientReady, (e) => {
  const logger = new Logger("main");
  logger.log(`Logged in as "${e.user.tag}"`);

  for (const mod in config.modules) {
    logger.log(`Setting up ${mod}...`);
    try {
      const { initModule, handleCommands } = require(`./modules/${mod}`);
      if (handleCommands) handleCommands(client);
      if (!config.modules[mod].enabled) continue;
      initModule(client);
    } catch (error) {
      logger.error(`Catched error when trying to init module ${mod}: ${error.stack}`);
    }
  }
});

client.login(config.token);
