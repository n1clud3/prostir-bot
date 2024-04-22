//@ts-check

const path = require("node:path");
const fs = require("node:fs");
const { Events, Client, Collection, Message, VoiceState, EmbedBuilder } = require("discord.js");
const logger = require("../../logging");
const config = require("../../config.json");
const data_manager = require("../../data_manager");

/**
 * Calculates level from the XP amount.
 * @param {number} xp
 * @returns {number} The calculated level
 */
function calculateLevel(xp) {
  let level = 0;
  let xpRequired = config.modules.level_system.baseLevelXP; // Initial XP required for level 2
  while (xp >= xpRequired) {
    level++;
    xpRequired *= config.modules.level_system.nextLevelXPReqMultiplier; // Increase XP required for next level by X times
  }
  return level;
}

/**
 * Calculates XP required for a given level
 * @param {number} level
 * @param {{baseLevelXP: number, nextLevelXPReqMultiplier: number}} settings
 * @returns Amount of XP required for a given level
 */
function calculateXP(level, settings) {
  return Math.round(
    (settings.baseLevelXP * Math.pow(settings.nextLevelXPReqMultiplier, level)) /
      (settings.nextLevelXPReqMultiplier - 1),
  );
}

/**
 * @param {number} level
 * @param {Message<boolean>} msg
 * @returns boolean
 */
function checkForReward(level, msg) {
  const rewards = config.modules.level_system.rewards;
  logger.debug("Checking for reward.");
  logger.debug(rewards);
  if (msg.member === null) {
    logger.error("Member is null.");
    return false;
  }
  for (const reward of rewards) {
    logger.debug("Checking reward", reward);
    logger.debug("Required level fulfilled?", level >= reward.level);
    if (level >= reward.level) {
      logger.debug("Reward type", reward.type);
      if (reward.type === "grant_role") {
        if (msg.member.roles.cache.has(reward.role_id)) {
          logger.debug("Member already has the reward");
          continue;
        }
        msg.member.roles.add(reward.role_id).catch((reason) => {
          logger.error("Could not add role to a user. Reason:", reason);
          return;
        });
        logger.log(`${msg.author.username} got a ${reward.type} reward!`);
        return true;
      }
    }
  }

  return false;
}

function loadCommands(/**@type {Client}*/ client) {
  const commands = new Collection();

  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.set(command.data.name, command);
    } else {
      logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }

  return commands;
}

function handleCommands(/**@type {Client}*/ client) {
  const commands = loadCommands();
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = commands.get(interaction.commandName);

    if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          ephemeral: true,
        });
      }
    }
  });

  logger.log("Command handlers are set up.");
}

const messageCreate = (/** @type {Message<boolean>} */ msg) => {
  if (msg.author.bot) return; // No XP for bots
  if (msg.content.includes("https://") || msg.content.includes("http://")) return; // No XP for links
  if (config.modules.level_system.ignoredChannels.includes(msg.channel.id)) return;

  const reward = Math.round(
    config.modules.level_system.messageMinReward +
      msg.content.length * config.modules.level_system.messageLengthXPBonusMultiplier,
  );
  logger.debug(`${msg.author.displayName} was rewarded with ${reward} XP!`);

  const df = data_manager.readDatafile("level_system");
  if (df === null) return;
  if (!df[msg.author.id]) {
    df[msg.author.id] = {};
    df[msg.author.id].xp = reward;
    // df[msg.author.id].nextLvlXP = reward;
    // df[msg.author.id].lvl = calculateLevel(reward);
    data_manager.writeDatafile("level_system", df);
  } else {
    df[msg.author.id].xp += reward;
    data_manager.writeDatafile("level_system", df);
  }

  logger.debug(
    `Their XP: ${df[msg.author.id].xp + reward}. Their LVL: ${calculateLevel(df[msg.author.id].xp + reward)}`,
  );
  const old_lvl = calculateLevel(df[msg.author.id].xp);
  const new_lvl = calculateLevel(df[msg.author.id].xp + reward);
  const grantedReward = checkForReward(new_lvl, msg);
  if (old_lvl < new_lvl) {
    let response_message = `:up: Ви досягли ${new_lvl} рівня!`;
    if (grantedReward) {
      response_message = response_message.concat("\n\n:military_medal: Вам було видано роль за ваш досягнутий рівень.");
    }
    msg.reply({
      embeds: [new EmbedBuilder().setColor(0xd4c47c).setTitle("LVL UP!").setDescription(response_message)],
    });
  } else if (grantedReward) {
    msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xd4c47c)
          .setTitle("Інформація")
          .setDescription(":military_medal: Вам було видано роль за ваш досягнутий рівень."),
      ],
    });
  }
};

const voice_xp_farmers = [];

/**
 * @param {VoiceState} oldState
 * @param {VoiceState} newState
 */
const voiceStateUpdate = async (oldState, newState) => {
  logger.debug("voiceStateUpdate event fired!");
  if (!newState.member || newState.member.user.bot) return; // No XP for bots
  if (newState.channelId === null || newState.member.voice.selfMute) {
    logger.debug(newState.member.user.username, "Removing from voice XP farmers");
    const removed = voice_xp_farmers.indexOf(newState.member.user.id);
    if (removed > -1) voice_xp_farmers.splice(removed, 1);
  } else if (oldState.channelId === null || !newState.member.voice.selfMute) {
    if (!voice_xp_farmers.includes(newState.member.user.id)) {
      logger.debug(newState.member.user.username, "Adding to voice XP farmers");
      voice_xp_farmers.push(newState.member.user.id)
    };
  }
  logger.debug(voice_xp_farmers);
};

const voiceXPFarmingCallback = () => {
  const df = data_manager.readDatafile("level_system");
  if (!df) return;
  for (const uid of voice_xp_farmers) {
    logger.debug("Giving voice farmer reward to", uid);

    const reward = config.modules.level_system.voiceXP.reward * voice_xp_farmers.length * config.modules.level_system.voiceXP.groupFarmingMultiplier;
    logger.debug("Reward:", reward);

    if (!df[uid]) {
      df[uid] = {};
      df[uid].xp = reward;
      if (data_manager.writeDatafile("level_system", df) === null) {
        logger.error("Failed to write to datafile");
      }
    } else {
      df[uid].xp += reward;
      if (data_manager.writeDatafile("level_system", df) === null) {
        logger.error("Failed to write to datafile");
      }
    }
  }
};

function initModule(/**@type {Client}*/ client) {
  const df = data_manager.createDatafile("level_system", {});
  if (!df) {
    throw Error("Failed to get a datafile.");
  }

  client.on(Events.MessageCreate, messageCreate);
  client.on(Events.VoiceStateUpdate, voiceStateUpdate);
  setInterval(voiceXPFarmingCallback, config.modules.level_system.voiceXP.interval);

  logger.log("Level system is set up.");
}

module.exports = { initModule, calculateLevel, calculateXP, handleCommands };
