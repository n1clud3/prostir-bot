//@ts-check

const data_manager = require("../../../data_manager");
const config = require("../../../config.json");
const Logger = require("../../../logging");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { calculateLevel } = require("..");

const logger = new Logger("lvlsys_cmd_leaderboard");

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

    let message = "";
    let i = 1;

    for (const uid in sortObjectByValue(leaderboard)) {
      if (i > 20) break;
      const username = (await interaction.client.users.fetch(uid)).username;
      const prefix = i <= 3 ? "#".repeat(i) : "";
      message = message.concat(
        `\n${prefix} ${i}. ${username} - :star: ${leaderboard[uid].toString()} XP - :chart_with_upwards_trend: LVL ${calculateLevel(leaderboard[uid], config.modules.level_system).toString()}`,
      );
      i++;
    }
    //@ts-ignore
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xd4c47c).setTitle("Таблиця лідерів").setDescription(message)],
    });
  },
};
