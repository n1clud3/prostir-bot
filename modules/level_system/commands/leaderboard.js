//@ts-check

const sqlite3 = require("sqlite3").verbose();
const data_manager = require("../../../data_manager");
const config = require("../../../config.json");
const logger = require("../../../logging");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { calculateLevel } = require("..");

function sortObjectByValue(obj) {
  const sortedEntries = Object.entries(obj).sort((a, b) => b[1] - a[1]); // Sorting entries based on numeric values

  const sortedObj = {};
  for (const [key, value] of sortedEntries) {
    sortedObj[key] = value;
  }

  return sortedObj;
}

module.exports = {
  data: new SlashCommandBuilder().setName("leaderboard").setDescription("Показує топ 25 людей по кількості XP"),
  async execute(/** @type {import("discord.js").Interaction<import("discord.js").CacheType>}*/ interaction) {
    if (!config.modules.level_system.enabled) {
      logger.log(`${interaction.user.username} tried to run /leaderboard command in a disabled module "level_system".`);
      //@ts-ignore
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("Помилка")
            .setDescription("XP модуль наразі вимкнений :stop_sign:"),
        ],
      });
      return;
    }

    const df = data_manager.readDatafile("level_system");
    if (!df) {
      logger.log(`${interaction.user.username} tried to run /leaderboard command. Could not load the datafile.`);
      //@ts-ignore
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("Помилка")
            .setDescription("Виникла проблема при виконанні команди. :stop_sign:"),
        ],
      });
      return;
    }

    if (Object.keys(df).length <= 0) {
      //@ts-ignore
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor("Yellow").setDescription("Таблиця лідерів наразі пуста.")],
      });
      return;
    }

    const leaderboard = {};
    for (const uid in df) {
      leaderboard[uid] = df[uid].xp;
    }

    let message = "```ansi";
    let i = 1;

    for (const uid in sortObjectByValue(leaderboard)) {
      if (i > 25) break;
      const username = (await interaction.client.users.fetch(uid)).username;
      message = message.concat(
        `\n${i}. [2;33m[2;30m[2;37m[2;36m${username}[0m[2;37m[0m[2;30m[0m[2;33m[2;30m - [0m[2;33m${leaderboard[uid].toString()} XP[2;30m - [0m[2;33m[2;34mLVL ${calculateLevel(leaderboard[uid]).toString()}[0m[2;33m[0m[2;33m[0m`,
      );
      i++;
    }
    message = message.concat("\n```");
    //@ts-ignore
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xd4c47c).setTitle("Таблиця лідерів").setDescription(message)],
    });
  },
};
