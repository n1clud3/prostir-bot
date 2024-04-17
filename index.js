//@ts-check
const { Client, Events, GatewayIntentBits, PermissionsBitField, ChannelType } = require("discord.js");
const { token, master_voices } = require("./config.json");
const Channels = require("./data");
const Logger = require("./logging");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

let channels = [];

const channels_data = new Channels(master_voices);
client.once(Events.ClientReady, e => {
  Logger.log(`Ready! Logged in as "${e.user.tag}"`);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (oldState.channel !== null && oldState.channel.id !== null && channels.includes(oldState.channel.id) && oldState.channel.members.size <= 0) {
    oldState.channel.delete();
    delete channels[channels.indexOf(oldState.channel.id)];
    Logger.log(`Deleted voice channel "${oldState.channel.name}" (${oldState.channel.id})`);
  }

  
  if (newState.channel === null || !channels_data.exists(newState.channelId) || newState.member === null || client.user === null) {return};
  Logger.log(`${newState.member.displayName} joined a master voice "${newState.channel.name}" (${newState.channelId})`);

  const botUser = newState.guild.roles.botRoleFor(client.user);
  if (botUser === null) {return};
  
  const channelPerms = [
    {
      "id": newState.member.id,
      "allow": [PermissionsBitField.Flags.ManageChannels],
    },
    {
      "id": botUser.id,
      "allow": [PermissionsBitField.Flags.ViewChannel],
    },
    {
      "id": newState.guild.roles.everyone,
      "deny": [PermissionsBitField.Flags.ViewChannel],
      
    }
  ];
  const categoryVisible = newState.channel.parent?.permissionsFor(newState.guild.roles.everyone).toArray().includes("ViewChannel");

  if (categoryVisible) {
    channelPerms.pop();
  }

  newState.guild.channels.create({
    "name": newState.member.displayName,
    "parent": newState.channel.parent,
    "type": ChannelType.GuildVoice,
    "userLimit": 0,
    "permissionOverwrites": channelPerms,
  }).then((channel) => {
    if (newState.member === null) {return};
    Logger.log(`Moved ${newState.member.displayName} (${newState.member.id}) to a new voice channel`);
    //@ts-ignore
    newState.member.voice.setChannel(channel);
    channels.push(channel.id);
  })
});

client.login(token);