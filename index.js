const { Client, Events, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const config = require("./config.json");
const Logger = require("./logging");
const fs = require("node:fs");

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

// load token
// const preinit_logger = new Logger("preinit_logger");
const TOKEN = fs.readFileSync("/run/secrets/bot_token", {encoding: "utf8"});

client.once(Events.ClientReady, async (e) => {
  const logger = new Logger("main");
  logger.log(`Logged in as "${e.user.tag}"`);

  let enabled_modules = {};

  for (const mod in config.modules) {
    logger.log(`Setting up ${mod}...`);
    try {
      const { initModule, handleCommands } = require(`./modules/${mod}`);
      enabled_modules[mod] = false;
      if (handleCommands) handleCommands(client);
      if (!config.modules[mod].enabled) continue;
      initModule(client);
      enabled_modules[mod] = true;
    } catch (error) {
      logger.error(`Catched error when trying to init module ${mod}: ${error.stack}`);
    }
  }

  e.channels.fetch(config.logs_channel).then((c) => {
    if (!c) {
      logger.error("Failed to access logs channel");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xd4c47c)
      .setTitle("Prostir Bot запущено!")
      .setDescription("Увімкнені модулі:");

    Object.keys(config.modules).forEach((mod) => {
      embed.addFields({ name: mod, value: enabled_modules[mod] ? ":white_check_mark:" : ":x:" });
    });

    c.send({ embeds: [embed] }).catch((reason) => {
      logger.error(`Failed to send greeting message to logs channel: ${reason}`);
    });
  });
});

client.login(TOKEN);
