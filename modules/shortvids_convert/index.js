//@ts-check

// FIXME: this whole file is rigged with boilerplates and repeatable code. damn.

const { Client, Message, EmbedBuilder, Events } = require("discord.js");
const axios = require("axios");
const fs = require("node:fs");
const path = require("node:path");
const Logger = require("../../logging.js");
const config = require("../../config.json");

const logger = new Logger("shortvids_convert");

/**
 * @param {string} url
 * @param {boolean} img
 * @param {number} index
 * @returns {Promise<string, Error>}
 */
async function downloadLink(url, img, index) {
  const filename = img ? `shortvid_slide_${index}.jpeg` : "shortvid.mp4";

  const pathbuf = path.join("data");
  const filepath = path.join(pathbuf, filename);
  fs.mkdirSync(pathbuf, { recursive: true });

  const f = fs.createWriteStream(filepath);

  try {
    // @ts-ignore
    const res = await axios.get(url, {
      responseType: "stream",
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
    method: "GET",
    url: "https://tiktok-scraper7.p.rapidapi.com/",
    params: {
      url: url,
      hd: "1",
    },
    headers: {
      "X-RapidAPI-Key": config.modules.shortvids_convert.rapidAPIkey,
      "X-RapidAPI-Host": config.modules.shortvids_convert.converters.tiktok.rapidAPIhost,
    },
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
    method: "GET",
    url: "https://youtube-media-downloader.p.rapidapi.com/v2/video/details",
    params: {
      videoId: url.split("/")[url.split("/").length - 1],
    },
    headers: {
      "X-RapidAPI-Key": config.modules.shortvids_convert.rapidAPIkey,
      "X-RapidAPI-Host": config.modules.shortvids_convert.converters.yt_shorts.rapidAPIhost,
    },
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
  try {
    await msg.suppressEmbeds(true);
  } catch (err) {
    logger.error("Error trying to suppress embeds.", err);
  }
  const link = msg.content;
  const response = await msg.reply({
    embeds: [new EmbedBuilder().setColor(0xd4c47c).setDescription("Обробляю посилання, зачекайте...")],
  });
  const post = await instaScraper(link);
  logger.trace(post);

  let dl_link = "";

  if (post.length > 0) {
    post.forEach((media) => {
      if (media.type === "video") {
        dl_link = media.link;
      } else {
        response.edit({
          embeds: [new EmbedBuilder().setColor("Red").setDescription("Виникла помилка при обробці посилання.")],
        });
      }
    });
  }

  try {
    const f = await downloadLink(dl_link, false, 0);
    logger.trace("Higher than 25mb?", fs.statSync(f).size > 25 * (1024 * 1024));
    if (fs.statSync(f).size > 25 * (1024 * 1024)) {
      logger.error("Error trying to send a Reels video. File is larger than 25 MB.");
      response.edit({
        embeds: [
          new EmbedBuilder().setColor("Red").setDescription("Відео важить більше 25MB, неможливо завантажити в чат."),
        ],
      });
      return;
    }
    response.edit({ embeds: [], content: "Посилання конвертовано!", files: [f] });
  } catch (err) {
    logger.error("Error trying to send a Reels video.", err);
    try {
      response.edit({
        embeds: [new EmbedBuilder().setColor("Red").setDescription("Виникла помилка при обробці посилання.")],
      });
    } catch (err) {
      logger.error("Error trying to respond with error embed.", err);
    }
  }
};

const messageCreateTiktok = async (/** @type {Message<boolean>} */ msg) => {
  if (!(msg.content.startsWith("https://www.tiktok.com/") || msg.content.startsWith("https://vm.tiktok.com/"))) return;
  try {
    await msg.suppressEmbeds(true);
  } catch (err) {
    logger.error("Error trying to suppress embeds.", err);
  }
  const link = msg.content;
  const response = await msg.reply({
    embeds: [new EmbedBuilder().setColor(0xd4c47c).setDescription("Обробляю посилання, зачекайте...")],
  });

  const post = await tiktokScraper(link);
  logger.log(post);

  try {
    const files = [];
    logger.trace(post.data.images);
    if (!post.data.images) {
      const dl_link = post.data.play;
      const f = await downloadLink(dl_link, false, 0);
      logger.trace("Higher than 25mb?", fs.statSync(f).size > 25 * (1024 * 1024));
      if (fs.statSync(f).size > 25 * (1024 * 1024)) {
        logger.error("Error trying to send a TikTok video. File is larger than 25 MB.");
        response.edit({
          embeds: [
            new EmbedBuilder().setColor("Red").setDescription("Відео важить більше 25MB, неможливо завантажити в чат."),
          ],
        });
        return;
      }

      files.push(f);
    } else {
      if (post.data.images.length > 10) {
        logger.error("Error trying to send a TikTok slideshow. More than 10 slides.");
        response.edit({
          embeds: [
            new EmbedBuilder().setColor("Red").setDescription("Більше ніж 10 слайдів, неможливо завантажити в чат."),
          ],
        });
        return;
      }

      for (let i = 0; i < post.data.images.length; i++) {
        const dl_link = post.data.images[i];
        const f = await downloadLink(dl_link, true, i);
        if (fs.statSync(f).size > 25 * (1024 * 1024)) {
          logger.error("Error trying to send a TikTok slideshow. File is larger than 25 MB.");
          response.edit({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setDescription("Фото важить більше 25MB, неможливо завантажити в чат."),
            ],
          });
          return;
        }
        files.push(f);
      }
    }

    response.edit({ embeds: [], content: "Посилання конвертовано!", files: files });
  } catch (err) {
    logger.error("Error trying to send a TikTok video.", err);
    try {
      response.edit({
        embeds: [new EmbedBuilder().setColor("Red").setDescription("Виникла помилка при обробці посилання.")],
      });
    } catch (err) {
      logger.error("Error trying to respond with error embed.", err);
    }
  }
};

const messageCreateShorts = async (/** @type {Message<boolean>} */ msg) => {
  if (!msg.content.startsWith("https://www.youtube.com/shorts/")) return;
  try {
    await msg.suppressEmbeds(true);
  } catch (err) {
    logger.error("Error trying to suppress embeds.", err);
  }
  const link = msg.content;
  const response = await msg.reply({
    embeds: [new EmbedBuilder().setColor(0xd4c47c).setDescription("Обробляю посилання, зачекайте...")],
  });

  const post = await shortsScraper(link);

  try {
    const dl_link = post.videos.items[0].url;
    const f = await downloadLink(dl_link, false, 0);
    logger.trace("Higher than 25mb?", fs.statSync(f).size > 25 * (1024 * 1024));
    if (fs.statSync(f).size > 25 * (1024 * 1024)) {
      logger.error("Error trying to send a YT Shorts video. File is larger than 25 MB.");
      response.edit({
        embeds: [
          new EmbedBuilder().setColor("Red").setDescription("Відео важить більше 25MB, неможливо завантажити в чат."),
        ],
      });
      return;
    }
    response.edit({ embeds: [], content: "Посилання конвертовано!", files: [f] });
  } catch (err) {
    logger.error("Error trying to send a YT Shorts video.", err);
    try {
      response.edit({
        embeds: [new EmbedBuilder().setColor("Red").setDescription("Виникла помилка при обробці посилання.")],
      });
    } catch (err) {
      logger.error("Error trying to respond with error embed.", err);
    }
  }
};

function initModule(/**@type {Client}*/ client) {
  const converters = {
    reels: messageCreateReels,
    tiktok: messageCreateTiktok,
    yt_shorts: messageCreateShorts,
  };

  Object.keys(converters).forEach((converter) => {
    if (config.modules.shortvids_convert.converters[converter].enabled) {
      logger.log("Enabling", converter, "converter...");
      client.on(Events.MessageCreate, converters[converter]);
    }
  });

  logger.log("Shortvids converters are set up!");
}

module.exports = { initModule };
