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
      await interaction.reply({embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("Помилка")
          .setDescription("XP модуль наразі вимкнений :stop_sign:")
      ]});
      return;
    };

    const bot_db = new sqlite3.Database("bot.db");
    bot_db.all("SELECT * FROM levels_data", async (err, rows) => {
      if (err) {
        logger.error("DB", err);
        //@ts-ignore
        // await interaction.reply(":stop_sign: Виникла проблема при виконанні команди.");
        await interaction.reply({embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("Помилка")
            .setDescription("Виникла проблема при виконанні команди. :stop_sign:")
        ]});
        return;
      }

      if (!rows) {
        //@ts-ignore
        // await interaction.reply(":warning: Таблиця лідерів пуста.");
        await interaction.reply({embeds: [
          new EmbedBuilder()
            .setColor("Yellow")
            .setTitle("Увага")
            .setDescription("Виникла проблема при виконанні команди. :warning:")
        ]});
        return;
      }

      const leaderboard = {}
      for (const row in rows) {
        leaderboard[rows[row].uid] = rows[row].xp;
      }

      let message = "```ansi";

      let i = 1;
      
      for (const uid in sortObjectByValue(leaderboard)) {
        if (i > 10) break;
        const username = (await interaction.client.users.fetch(uid)).username;
        message = message.concat(`\n${i}. [2;33m[2;30m[2;37m[2;36m${username}[0m[2;37m[0m[2;30m[0m[2;33m[2;30m - [0m[2;33m${leaderboard[uid].toString()} XP[2;30m - [0m[2;33m[2;34mLVL ${calculateLevel(leaderboard[uid]).toString()}[0m[2;33m[0m[2;33m[0m`);
        i++;
      }
      message = message.concat("\n```");
      //@ts-ignore
      // await interaction.reply(message);
      await interaction.reply({embeds: [
        new EmbedBuilder()
          .setColor(0xd4c47c)
          .setTitle("Таблиця лідерів")
          .setDescription(message)
      ]});
    })
  }
}