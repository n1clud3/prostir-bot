const data_manager = require("../../data_manager");
const { Events } = require("discord.js");
const Logger = require("../../logging.js");
const config = require("../../config.json");
const { WebSocketServer } = require("ws");
const { XMLParser } = require("fast-xml-parser")
const axios = require("axios");

const logger = new Logger("gmod_relay");

const WSMethods = {
  AvatarFetch: "prsbotAvatarFetch",
  MessageSend: "prsbotMessageSend",
}

function initModule(/**@type {Client}*/ client) {
  const wss = new WebSocketServer({ port: 443 });

  wss.on("connection", (ws) => {
    ws.on("error", logger.error);

    ws.on("message", async (data) => {
      const strdata = data.toString()

      // send avatar urls from gmod users
      if (strdata.startsWith(WSMethods.AvatarFetch)) {
        logger.debug("Received request of type", WSMethods.AvatarFetch)
        const received_data = JSON.parse(data.toString().substring(WSMethods.AvatarFetch.length));
        const url =
          "https://steamcommunity.com/profiles/" + received_data.plysteamid + "/?xml=1";

        try {
          const steamres = await axios.request({
            method: "GET",
            url: url,
            responseType: "text"
          });

          const parser = new XMLParser();
          const data = parser.parse(steamres.data);
          // logger.log(data);
          axios.post(config.modules.gmod_relay.messaging_webhook, {
            content: received_data.plymsg,
            username: received_data.plyname,
            avatar_url: data.profile.avatarFull
          })
        } catch (err) {
          logger.error(err);
        }
      }
    })

    // send messages from ds chat to gmod
    client.on(Events.MessageCreate, async (msg) => {
      if (msg.webhookId) return;
      if (msg.channelId === config.modules.gmod_relay.relay_chat && msg.content.length > 0) {
        ws.send(`${WSMethods.MessageSend}${msg.author.displayName}: ${msg.content}`);
      }
    })
  })

  logger.log("GMod relay is set up.");
}

module.exports = { initModule }