//@ts-check

const { SlashCommandBuilder, SlashCommandUserOption } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const logger = require("./../../../logging");
const { calculateLevel } = require("./../.");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Get the XP amount."),
  async execute(/** @type {import("discord.js").Interaction<import("discord.js").CacheType>}*/interaction) {
    const bot_db = new sqlite3.Database("bot.db");
    bot_db.get("SELECT xp FROM levels_data WHERE uid = (?)", interaction.user.id, async (err, row) => {
      if (err) {
        logger.error("DB", err);
        return;
      }

      if (!row) {
        //@ts-ignore
        await interaction.reply("Ваша кількість XP: `0`. Ваш рівень: `1`.");
      } else {
        //@ts-ignore
        await interaction.reply(`Ваша кількість XP: \`${row.xp}\`. Ваш рівень: \`${calculateLevel(row.xp)}\``);
      }
    });
    bot_db.close();
  }
}