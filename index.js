//@ts-check
const { Client, Events, GatewayIntentBits } = require("discord.js");
const { token, master_voices } = require("./config.json");
const Channels = require("./data");
const Logger = require("./logging");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

let channels = [];

const channels_data = new Channels(master_voices);

client.once(Events.ClientReady, e => {
  Logger.log(`Ready! Logged in as ${e.user.tag}`);
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  Logger.log("VoiceStateUpdate event fired!");
  if (oldState.channel !== null && oldState.channel.id !== null && channels.includes(oldState.channel.id) && oldState.channel.members.size <= 0) {
    oldState.channel.delete();
    delete channels[channels.indexOf(oldState.channel.id)];
    Logger.log(`Deleted voice channel "${oldState.channel.name}" (${oldState.channel.id})`);
  }

  if (newState.channel === null || !channels_data.exists(newState.channelId) || newState.member === null) {return};
  Logger.log(`${newState.member.displayName} joined a master voice ${newState.channel.name} (${newState.channelId}).`);


  newState.guild.channels.create({
    "name": newState.member.displayName,
    "parent": newState.channel.parent,
    "type": 2,
    "userLimit": 0,
  }).then((channel) => {
    if (newState.member === null) {return};
    Logger.log(`Created a new voice channel for ${newState.member.displayName} (${newState.member.id})`);
    //@ts-ignore
    newState.member.voice.setChannel(channel);
    channels.push(channel.id);
  })
});

client.login(token);