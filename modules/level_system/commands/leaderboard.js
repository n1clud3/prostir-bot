//@ts-check

const sqlite3 = require("sqlite3").verbose();
const config = require("./../../../config.json");
const logger = require("./../../../logging");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { calculateLevel } = require("..");

function sortObjectByValue(obj) {
  const sortedEntries = Object.entries(obj)
      .sort((a, b) => b[1] - a[1]); // Sorting entries based on numeric values

  const sortedObj = {};
  for (const [key, value] of sortedEntries) {
      sortedObj[key] = value;
  }

  return sortedObj;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Показує топ 10 людей по кількості XP"),
  async execute(/** @type {import("discord.js").Interaction<import("discord.js").CacheType>}*/interaction) {
    if (!config.modules.level_system.enabled) {
      //@ts-ignore
      interaction.reply(":stop_sign: XP модуль наразі вимкнений.");
      return;
    };

    const bot_db = new sqlite3.Database("bot.db");
    bot_db.all("SELECT * FROM levels_data", async (err, rows) => {
      if (err) {
        logger.error("DB", err);
        //@ts-ignore
        await interaction.reply(":stop_sign: Виникла проблема при виконанні команди.");
        return;
      }

      if (!rows) {
        //@ts-ignore
        await interaction.reply(":warning: Таблиця лідерів пуста.");
        return;
      }

      const leaderboard = {}
      for (const row in rows) {
        leaderboard[rows[row].uid] = rows[row].xp;
      }

      let message = "## :bar_chart: Дошка лідерів\n```";

      let i = 1;
      
      for (const uid in sortObjectByValue(leaderboard)) {
        if (i > 10) break;
        const username = (await interaction.client.users.fetch(uid)).username;
        message = message.concat(`\n${i}. ${username} - ${leaderboard[uid].toString()} XP - LVL ${calculateLevel(leaderboard[uid]).toString()}`);
        i++;
      }
      message = message.concat("\n```");
      //@ts-ignore
      await interaction.reply(message);
    })
  }
}