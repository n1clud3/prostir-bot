//@ts-check

const path = require("node:path");
const fs = require("node:fs");
const { Events, Client, Collection, Message, VoiceState } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const logger = require("../../logging");
const config = require("../../config.json");

/**
 * Calculates level from the XP amount.
 * @param {number} xp 
 * @returns {number} The calculated level
 */
function calculateLevel(xp) {
  let level = 0;
  let xpRequired = config.modules.level_system.baseXP; // Initial XP required for level 2
  while (xp >= xpRequired) {
      level++;
      xpRequired *= config.modules.level_system.nextLevelXPReqMultiplier; // Increase XP required for next level by X times
  }
  return level;
}

/**
 * @param {number} level
 * @param {Message<boolean>} msg
 * @returns boolean
 */
function checkForReward(level, msg) {
  const rewards = config.modules.level_system.rewards;
  for (const reward of rewards) {
    if (level >= reward.level) {
      if (reward.type === "grant_role") {
        if (msg.member === null) {
          logger.error("Member is null.");
          return false;
        }
        if (msg.member.roles.cache.has(reward.role_id)) return false;
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

function loadCommands(/**@type {Client}*/client) {
  const commands = new Collection();

  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
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

function handleCommands(/**@type {Client}*/client) {
  const commands = loadCommands();
  client.on(Events.InteractionCreate, async interaction => {
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
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  });
  
  logger.log("Command handlers are set up.");
}

const messageCreate = (/** @type {Message<boolean>} */msg) => {
  if (msg.author.bot) return // No XP for bots
  if (msg.content.includes("https://") || msg.content.includes("http://")) return; // No XP for links
  if (config.modules.level_system.ignoredChannels.includes(msg.channel.id)) return;

  const reward = Math.round(config.modules.level_system.messageBaseReward + msg.content.length * config.modules.level_system.messageLengthXPBonusMultiplier);
  logger.debug(`${msg.author.displayName} was rewarded with ${reward} XP!`);
  
  // databases are a fucking mess.
  const db = new sqlite3.Database("bot.db");
  db.get("SELECT xp FROM levels_data WHERE uid = (?)", msg.author.id, (err, row) => {
    if (err) {
      logger.error("DB", err);
      return;
    }

    if (!row) {
      db.run(`INSERT INTO levels_data (uid, xp) VALUES ('${msg.author.id}', ${reward})`, (err) => {
        if (err) {
          logger.error("DB", err);
        } else {
          logger.log(`Initialized DB row for ${msg.author.displayName} (${msg.author.id})`);
        }
      });
    } else {
      db.run(`UPDATE levels_data SET xp = ${row.xp + reward} WHERE uid = '${msg.author.id}'`);
      logger.debug(`Their XP: ${row.xp + reward}. Their LVL: ${calculateLevel(row.xp + reward)}`);
      
      const old_lvl = calculateLevel(row.xp);
      const new_lvl = calculateLevel(row.xp + reward);
      const grantedReward = checkForReward(new_lvl, msg);
      if (old_lvl < new_lvl) {
        let response = `:fire: LVL UP! Ви досягли ${new_lvl} рівня :sunglasses:`;
        if (grantedReward) {
          response = response.concat(`\n:military_medal: Вам було видано роль за ваш досягнутий рівень. :saluting_face:`);
        }
        msg.reply(response);
      } else if (grantedReward) {
        msg.reply(`:military_medal: Вам було видано роль за ваш досягнутий рівень. :saluting_face:`)
      }
    }
  });
  db.close();
}

const voice_xp_farmers = [];

/**
 * @param {VoiceState} oldState 
 * @param {VoiceState} newState 
 */
const voiceStateUpdate = async (oldState, newState) => {
  if (!newState.member || newState.member.user.bot) return // No XP for bots
  if (newState.channelId === null) {
    logger.debug(newState.member.user.username, "left voice. Removing from voice XP farmers");
    const removed = voice_xp_farmers.indexOf(newState.member.user.id);
    if (removed > -1) voice_xp_farmers.splice(removed, 1);
  } else if (oldState.channelId === null) {
    logger.debug(newState.member.user.username, "joined voice. Adding to voice XP farmers");
    voice_xp_farmers.push(newState.member.user.id);
  };
  logger.debug(voice_xp_farmers);
}

const voiceXPFarmingCallback = () => {
  const db = new sqlite3.Database("bot.db");
  for (const uid of voice_xp_farmers) {
    logger.debug("Giving voice farmer reward to", uid);
    db.get("SELECT xp FROM levels_data WHERE uid = (?)", uid, (err, row) => {
      if (err) {
        logger.error("DB", err);
        return;
      }

      if (!row) {
        db.run(`INSERT INTO levels_data (uid, xp) VALUES ('${uid}', ${config.modules.level_system.voiceXP.reward})`, (err) => {
          if (err) {
            logger.error("DB", err);
          } else {
            logger.log(`Initialized DB row for voice user ${uid}`);
          }
        });
      } else {
        db.run(`UPDATE levels_data SET xp = ${row.xp + config.modules.level_system.voiceXP.reward} WHERE uid = '${uid}'`);
      }
    });
  }
  db.close();
}

function initModule(/**@type {Client}*/ client) {
  // Basically if levels_data table doesn't exist, create it.
  // If SQL wouldn't throw error after trying to create existing table, this would be smaller.
  const bot_db = new sqlite3.Database("bot.db");
  bot_db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='levels_data'", (err, row) => {
    if (err) {
      logger.error("DB", err);
      return;
    }
    
    if (!row) {
      bot_db.run("CREATE TABLE levels_data (uid TEXT, xp INTEGER)", (err) => {
        if (err) {
          logger.error("DB", err);
        } else {
          logger.log("Level system DB table created successfully.");
        }
      });
    }
  });
  bot_db.close();

  client.on(Events.MessageCreate, messageCreate);
  client.on(Events.VoiceStateUpdate, voiceStateUpdate);
  setInterval(voiceXPFarmingCallback, config.modules.level_system.voiceXP.interval);

  if (process.env.RUN_TESTS) {
    logger.log("calculateLevel() Test")
    logger.log(`baseXP: ${config.modules.level_system.baseXP}. nextLevelXPReqMultiplier: ${config.modules.level_system.nextLevelXPReqMultiplier}`);
    for (let i = 0; i <= 5000; i+=10) {
      logger.log(`XP: ${i}; LVL: ${calculateLevel(i)}`);
    }
  }

  logger.log("Level system is set up.");
}

module.exports = { initModule, calculateLevel, handleCommands }