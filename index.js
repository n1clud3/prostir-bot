//@ts-check
const { Client, Events, GatewayIntentBits, PermissionsBitField, ChannelType } = require("discord.js");
const config = require("./config.json");
const logger = require("./logging");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

client.once(Events.ClientReady, e => {
  logger.log(`Logged in as "${e.user.tag}"`);

  for (const mod in config.modules) {
    if (!config.modules[mod].enabled) { continue };
    logger.log(`Setting up ${mod}...`);
    try {
      const initModule = require(`./modules/${mod}`);
      initModule(client);
    } catch (error) {
      logger.error(`Catched error when trying to init module ${mod}.`, error);
    }
  }
});

client.login(config.token);