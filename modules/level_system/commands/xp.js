//@ts-check

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const data_manager = require("../../../data_manager");
const logger = require("../../../logging");
const config = require("../../../config.json");
const { calculateLevel, calculateXP } = require("../.");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Дізнайтеся вашу кількість очок досвіду.")
    .addUserOption((option) => 
      option
        .setName("target")
        .setDescription("Ціль для перегляду досвіду")
        .setRequired(false)
    )
    .setDMPermission(false),
  async execute(/** @type {import("discord.js").Interaction<import("discord.js").CacheType>}*/ interaction) {
    if (!config.modules.level_system.enabled) {
      logger.log(`${interaction.user.username} tried to run /xp command in a disabled module "level_system".`);
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
      logger.log(`${interaction.user.username} tried to run /xp command. Could not load the datafile.`);
      //@ts-ignore
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("Помилка")
            .setDescription("Виникла проблема при виконанні команди :stop_sign:"),
        ],
      });
      return;
    }

    //@ts-ignore
    const target = interaction.options.getUser("target") ?? interaction.user;

    let xp = 0;
    let lvl = 0;

    if (df[target.id]) {
      xp = df[target.id].xp;
      lvl = calculateLevel(df[target.id].xp, config.modules.level_system);
    }

    //@ts-ignore
    await interaction.reply({ embeds: [
      new EmbedBuilder()
        .setColor(0xd4c47c)
        .setTitle(`Досвід учасника ${target.username}`)
        .addFields(
          {
            name: "Кількість XP :star:",
            value: `\`\`\`${xp} XP\`\`\``,
            inline: true,
          },
          {
            name: "Рівень :chart_with_upwards_trend:",
            value: `\`\`\`LVL ${lvl}\`\`\``,
            inline: true,
          },
          {
            name: "До наступного рівня :star2:",
            value: `\`\`\`${calculateXP(lvl, config.modules.level_system)} XP\`\`\``,
            inline: true,
          },
        ),
      ],
    });
  },
};
