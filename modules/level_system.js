//@ts-check

const { Events, Client } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const logger = require("./../logging");
const config = require("./../config.json");

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

module.exports = function initModule(/**@type {Client}*/ client) {
  const bot_db = new sqlite3.Database("bot.db");

  // Basically if levels_data table doesn't exist, create it.
  // If SQL wouldn't throw error after trying to create existing table, this would be smaller.
  bot_db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='levels_data'", (err, row) => {
    if (err) {
      logger.error("DB Error:", err);
      return;
    }

    if (!row) {
      bot_db.run("CREATE TABLE levels_data (uid TEXT, xp INTEGER)", (err) => {
        if (err) {
          logger.error("DB Error:", err);
        } else {
          logger.log("Level system DB table created successfully.");
        }
      });
    }
  });
  bot_db.close();

  client.on(Events.MessageCreate, (msg) => {
    if (msg.author.bot) {return} // No XP for bots
    const db = new sqlite3.Database("bot.db");
    const reward = Math.ceil(msg.content.length * config.modules.level_system.messageLengthXPMultiplier);
    logger.log(`${msg.author.displayName} was rewarded with ${reward} XP!`);

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
        logger.log(`Their XP: ${row.xp + reward}. Their LVL: ${calculateLevel(row.xp + reward)}`);
        
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