//@ts-check

const { Client, Events, ChannelType } = require("discord.js");
const Logger = require("../../logging");
const config = require("../../config.json");

/**
 * @param {Client} client
 */
async function initModule(client) {
  const logger = new Logger("voice_managing");
  const channels = [];

  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    if (
      oldState.channel !== null &&
      oldState.channel.id !== null &&
      channels.includes(oldState.channel.id) &&
      oldState.channel.members.size <= 0
    ) {
      oldState.channel.delete().catch((reason) => {
        console.error("Channel deletion was rejected. Reason:", reason);
      });
      delete channels[channels.indexOf(oldState.channel.id)];
      logger.log(`Deleted voice channel "${oldState.channel.name}" (${oldState.channel.id})`);
    }

    if (
      newState.channel === null ||
      !config.modules.voice_managing.master_voices.includes(newState.channel.id) ||
      newState.member === null ||
      client.user === null
    ) {
      return;
    }
    logger.log(
      `${newState.member.displayName} joined a master voice "${newState.channel.name}" (${newState.channelId})`,
    );

    newState.guild.channels
      .create({
        name: newState.member.displayName,
        parent: newState.channel.parent,
        type: ChannelType.GuildVoice,
        userLimit: 0,
      })
      .then((channel) => {
        if (newState.member === null) {
          return;
        }
        channel.permissionOverwrites.edit(newState.member, { ManageChannels: true }).catch((reason) => {
          logger.error("Permission overwrite was rejected. Reason:", reason);
        });
        //@ts-ignore
        newState.member.voice.setChannel(channel).catch((reason) => {
          logger.error("Move member action was rejected. Reason:", reason);
        });
        logger.log(`Moved ${newState.member.displayName} (${newState.member.id}) to a new voice channel`);
        channels.push(channel.id);
      })
      .catch((reason) => {
        logger.error("Channel creation was rejected. Reason:", reason);
      });
  });
  logger.log("Voice managing module is set up.");
}

module.exports = { initModule };
