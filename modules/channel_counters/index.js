//@ts-check

const { Client } = require("discord.js");
const Logger = require("../../logging");
const config = require("../../config.json");

const logger = new Logger("channel_counters");

async function initModule(/** @type {Client} */ client) {
  await client.guilds.fetch();
  const guild = client.guilds.cache.get(config.guildId);
  if (!guild) return;

  const counters = config.modules.channel_counters.counters;

  if (counters.member.enabled) {
    const updateMemberCounter = require("./counters/member");
    await updateMemberCounter(guild, counters.member);
    setInterval(
      async () => await updateMemberCounter(guild, counters.member),
      config.modules.channel_counters.updateInterval,
    );
    logger.log("Member counter is set up.");
  }

  if (counters.online.enabled) {
    await guild.members.fetch({ withPresences: true }).then(async (fetchedMembers) => {
      const updateOnlineCounter = require("./counters/online");
      await updateOnlineCounter(guild, fetchedMembers, counters.online);
      setInterval(
        async () => await updateOnlineCounter(guild, fetchedMembers, counters.online),
        config.modules.channel_counters.updateInterval,
      );
    });
    logger.log("Online counter is set up.");
  }

  logger.log("Channel counters are set up.");
}

module.exports = { initModule };
