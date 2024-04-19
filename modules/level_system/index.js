//@ts-check

const path = require("node:path");
const fs = require("node:fs");
const { Events, Client, Collection } = require("discord.js");
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
  return Math.ceil(level);
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
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  });
  
  logger.log("Command handlers are set up.");
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

  client.on(Events.MessageCreate, (msg) => {
    if (msg.author.bot) return // No XP for bots
    if (msg.content.includes("https://") || msg.content.includes("http://")) return; // No XP for links
    if (config.modules.level_system.ingoredChannels.includes(msg.channel.id)) return;

    const db = new sqlite3.Database("bot.db");
    const reward = Math.round(msg.content.length * config.modules.level_system.messageLengthXPMultiplier);
    logger.debug(`${msg.author.displayName} was rewarded with ${reward} XP!`);

    // databases are a fucking mess.
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
        if (old_lvl < new_lvl) {
          msg.reply(`:fire: LVL UP! Ви досягли ${new_lvl} рівня :sunglasses:`);
        }
      }
    });
    db.close();
  });

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