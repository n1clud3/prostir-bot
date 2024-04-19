//@ts-check

const { Guild, Collection, GuildMember } = require("discord.js");
const logger = require("../../../logging");

/**
 * @param {Guild} guild 
 * @param {Collection<string, GuildMember>} members
 * @param {{enabled: boolean, channelId: string}} settings 
 */
module.exports = async function updateOnlineCounter(guild, members, settings) {
  const channel = guild.channels.cache.get(settings.channelId);
  if (!channel) return;

  const member_count = guild.memberCount;
  const online_members = members.filter(member => member.presence?.status !== 'offline').size;
  const counter_label = `Онлайн: ${online_members}/${member_count}`;

  await channel.edit({
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