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
  const filename = "shortvid_cache.mp4";

  const pathbuf = path.join("data");
  const filepath = path.join(pathbuf, filename);
  fs.mkdirSync(pathbuf, { recursive: true });

  const f = fs.createWriteStream(filepath);

  try {
    // @ts-ignore
    const res = await axios.get(url, {
      responseType: "stream"
    });
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
      "X-RapidAPI-Host": config.modules.shortvids_convert.converters.reels.rapidAPIhost,
    },
  };

  try {
    const response = await axios.request(options);
    return response.data.data.medias;
  } catch (error) {
    return error;
  }
}

/**
 *
 * @param {*} url
 */
async function tiktokScraper(url) {
  const options = {
    method: 'GET',
    url: 'https://tiktok-scraper7.p.rapidapi.com/',
    params: {
      url: url,
      hd: '1'
    },
    headers: {
      'X-RapidAPI-Key': config.modules.shortvids_convert.rapidAPIkey,
      'X-RapidAPI-Host': config.modules.shortvids_convert.converters.tiktok.rapidAPIhost
    }
  };
  
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

/**
 *
 * @param {*} url
 */
async function shortsScraper(url) {
  const options = {
    method: 'GET',
    url: 'https://youtube-media-downloader.p.rapidapi.com/v2/video/details',
    params: {
      videoId: url.split("/")[url.split("/").length - 1]
    },
    headers: {
      'X-RapidAPI-Key': config.modules.shortvids_convert.rapidAPIkey,
      'X-RapidAPI-Host': config.modules.shortvids_convert.converters.yt_shorts.rapidAPIhost
    }
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error(error);
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
          embeds: [new EmbedBuilder().setColor("Red").setDescription("Виникла помилка при обробці посилання.")],
        });
        return;
      }
    });
  }

  try {
    const f = await downloadLink(dl_link);
    response.edit({ embeds: [], content: "Посилання конвертовано!", files: [f] });
  } catch (err) {
    logger.error("Error trying to send a Reels video.", err);
    try {
      response.edit({ embeds: [new EmbedBuilder().setColor("Red").setDescription("Виникла помилка при обробці посилання.")] });
    } catch (err) {
      logger.error("Error trying to print out error embed (BRUH).", err);
    }
  }
};

const messageCreateTiktok = async (/** @type {Message<boolean>} */ msg) => {
  if (!(msg.content.startsWith("https://www.tiktok.com/") || msg.content.startsWith("https://vm.tiktok.com/") )) return;
  const link = msg.content;
  const response = await msg.reply({
    embeds: [new EmbedBuilder().setColor(0xd4c47c).setDescription("Обробляю посилання, зачекайте...")],
  });

  const post = await tiktokScraper(link);
  
  try {
    const dl_link = post.data.play;
    const f = await downloadLink(dl_link);
    response.edit({ embeds: [], content: "Посилання конвертовано!", files: [f] });
  } catch (err) {
    logger.error("Error trying to send a TikTok video.", err);
    try {
      response.edit({ embeds: [new EmbedBuilder().setColor("Red").setDescription("Виникла помилка при обробці посилання.")] });
    } catch (err) {
      logger.error("Error trying to print out error embed (BRUH).", err);
    }
  }
}

const messageCreateShorts = async (/** @type {Message<boolean>} */ msg) => {
  if (!msg.content.startsWith("https://www.youtube.com/shorts/")) return;
  const link = msg.content;
  const response = await msg.reply({
    embeds: [new EmbedBuilder().setColor(0xd4c47c).setDescription("Обробляю посилання, зачекайте...")],
  });

  const post = await shortsScraper(link);
  
  try {
    const dl_link = post.videos.items[0].url;
    const f = await downloadLink(dl_link);
    response.edit({ embeds: [], content: "Посилання конвертовано!", files: [f] });
  } catch (err) {
    logger.error("Error trying to send a YT Shorts video.", err);
    try {
      response.edit({ embeds: [new EmbedBuilder().setColor("Red").setDescription("Виникла помилка при обробці посилання.")] });
    } catch (err) {
      logger.error("Error trying to print out error embed (BRUH).", err);
    }
  }
}

function initModule(/**@type {Client}*/ client) {
  if (config.modules.shortvids_convert.converters.reels.enabled) client.on(Events.MessageCreate, messageCreateReels);
  if (config.modules.shortvids_convert.converters.tiktok.enabled) client.on(Events.MessageCreate, messageCreateTiktok);
  if (config.modules.shortvids_convert.converters.yt_shorts.enabled) client.on(Events.MessageCreate, messageCreateShorts);

  logger.log("Shortvids converters are set up!");
}

module.exports = { initModule };
