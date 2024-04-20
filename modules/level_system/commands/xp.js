//@ts-check

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const logger = require("./../../../logging");
const config = require("./../../../config.json");
const { calculateLevel } = require("./../.");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Дізнайтеся вашу кількість очок досвіду."),
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
    bot_db.get("SELECT xp FROM levels_data WHERE uid = (?)", interaction.user.id, async (err, row) => {
      if (err) {
        logger.error("DB", err);
        //@ts-ignore
        await interaction.reply({embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("Помилка")
            .setDescription("Виникла проблема при виконанні команди :stop_sign:")
        ]});
        return;
      }

      let xp = 0;
      let lvl = 0;

      if (row) {
        xp = row.xp;
        lvl = calculateLevel(row.xp);
      }
      //@ts-ignore
      await interaction.reply({embeds: [
        new EmbedBuilder()
          .setColor(0xd4c47c)
          .addFields(
            {
              "name": "Кількість XP :star:",
              "value": `\`\`\`${xp}\`\`\``,
              "inline": true,
            },
            {
              "name": "Ваш рівень :chart_with_upwards_trend:",
              "value": `\`\`\`${lvl}\`\`\``,
              "inline": true,
            }
          )
      ]});
    });
    bot_db.close();
  }
}