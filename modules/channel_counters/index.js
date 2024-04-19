//@ts-check

const { Client, VoiceChannel, PermissionsBitField } = require("discord.js");
const logger = require("../../logging");
const config = require("../../config.json");

/**
 * @param {import("discord.js").Guild} guild
 */
async function setupMemberCounter(guild, settings) {
  const chan = guild.channels.cache.get(settings.channelId)
  if (!chan) return;
  const botRole = guild.roles.botRoleFor(guild.client.user.id);
  if (!botRole) return;

  const member_count = guild.members.cache.size;
  const counter_label = `К-ть учасників: ${member_count}`;

  await chan.edit({
    "name": counter_label,
  }).catch(reason => {
    logger.error("Failed to edit channel counter.");
    if (reason.code === 50001) {
      logger.error("Bot doesn't have the permission to edit the channel. \
      Give a \"Connect\" permission in order for the counter to work.");
    }
    logger.error("Full reason:", reason);
  })
}

/**
 * @param {import("discord.js").Guild} guild
 */
async function setupOnlineCounter(guild, settings) {
  const chan = guild.channels.cache.get(settings.channelId)
  if (!chan) return;
  const botRole = guild.roles.botRoleFor(guild.client.user.id);
  if (!botRole) return;

  const member_count = guild.members.cache.size;
  const members_online = guild.members.cache.filter(member => member.presence?.status !== "offline").size;
  const counter_label = `Онлайн: ${members_online}/${member_count}`;

  await chan.edit({
    "name": counter_label,
  }).catch(reason => {
    logger.error("Failed to edit channel counter.");
    if (reason.code === 50001) {
      logger.error("Bot doesn't have the permission to edit the channel. \
      Give a \"Connect\" permission in order for the counter to work.");
    }
    logger.error("Full reason:", reason);
  })
}

function initModule(/** @type {Client} */client) {
  const guild = client.guilds.cache.first();
  if (!guild) return;

  const counters = config.modules.channel_counters.counters

  if (counters.member.enabled) {
    setupMemberCounter(guild, counters.member);
    setInterval(() => setupMemberCounter(guild, counters.member), config.modules.channel_counters.updateInterval)
    logger.log("Member counter is set up.");
  };

  if (counters.online.enabled) {
    setupOnlineCounter(guild, counters.online);
    setInterval(() => setupOnlineCounter(guild, counters.online), config.modules.channel_counters.updateInterval)
    logger.log("Online counter is set up.");
  };

  logger.log("Channel counters are set up.");
}

module.exports = { initModule }