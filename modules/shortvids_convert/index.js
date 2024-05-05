//@ts-check

const { Client, Message, EmbedBuilder, Events } = require("discord.js");
const axios = require("axios");
const fs = require("node:fs");
const path = require("node:path");
const logger = require("../../logging.js");
const config = require("../../config.json");

/**
 * @param {string} url
 * @returns {Promise<string, Error>}
 */
async function downloadLink(url) {
  const filename = url.split("/")[url.split("/").length - 1].split("?")[0];
  logger.debug("filename:", filename);

  const pathbuf = path.join("data", "shortvids_cache");
  const filepath = path.join(pathbuf, filename);
  fs.mkdirSync(pathbuf, { recursive: true });

  if (fs.existsSync(filepath)) {
    logger.log("File already exists!");
    return path.join(pathbuf, filename).toString();
  }

  const f = fs.createWriteStream(filepath);

  try {
    // @ts-ignore
    const res = await axios.get(url, { responseType: "stream" });
    res.data.pipe(f);

    return new Promise((resolve, reject) => {
      f.on("finish", () => {
        f.close();
        logger.log("Download finished.");
        resolve(filepath.toString());
      });
      f.on("error", (err) => {
        logger.error("Error during download:", err);
        reject(err);
      });
    });
  } catch (err) {
    throw err;
  }
}

/**
 *
 * @param {*} url
 * @returns {Promise<any[], Error>}
 */
async function instaScraper(url) {
  const options = {
    method: "GET",
    url: "https://instagram-looter2.p.rapidapi.com/post-dl",
    params: {
      link: url,
    },
    headers: {
      "X-RapidAPI-Key": config.modules.shortvids_convert.rapidAPIkey,
      "X-RapidAPI-Host": config.modules.shortvids_convert.rapidAPIhost,
    },
  };

  try {
    const response = await axios.request(options);
    return response.data.data.medias;
  } catch (error) {
    return error;
  }
}

const messageCreateReels = async (/** @type {Message<boolean>} */ msg) => {
  if (!msg.content.startsWith("https://www.instagram.com/")) return;
  const link = msg.content;
  const response = await msg.reply({
    embeds: [new EmbedBuilder().setColor(0xd4c47c).setDescription("Обробляю посилання, зачекайте...")],
  });
  const post = await instaScraper(link);
  logger.debug(post);

  let dl_link = "";

  if (post.length > 0) {
    post.forEach((media) => {
      if (media.type === "video") dl_link = media.link;
      else {
        response.edit({
          embeds: [new EmbedBuilder().setColor("Red").setDescription("Виникла помилка при обробці посилання!")],
        });
        return;
      }
    });
  }

  try {
    const f = await downloadLink(dl_link);
    response.edit({ embeds: [], files: [f] });
  } catch (err) {
    logger.error("Error trying to edit message:", err);
  }
};

function initModule(/**@type {Client}*/ client) {
  if (config.modules.shortvids_convert.converters.reels) client.on(Events.MessageCreate, messageCreateReels);

  if (config.modules.shortvids_convert.converters.yt_shorts) logger.log("YT Shorts links not implemented yet.");

  if (config.modules.shortvids_convert.converters.tiktok) logger.log("Tiktok links not implemented yet.");

  logger.log("Shortvids converters are set up!");
}

module.exports = { initModule };
