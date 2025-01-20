const { Events, EmbedBuilder } = require("discord.js");
const Logger = require("../../logging.js");
const config = require("../../config.json");
const { WebSocketServer } = require("ws");
const { XMLParser } = require("fast-xml-parser")
const axios = require("axios");

const logger = new Logger("gmod_relay");

const WSMethods = {
  PlayerSpawn: "prsbotPlayerSpawn",
  PlayerConnect: "prsbotPlayerConnect",
  PlayerLeave: "prsbotPlayerLeave",
  AvatarFetch: "prsbotAvatarFetch",
  MessageSend: "prsbotMessageSend",
  StatusCmd: "prsbotStatusCmd"
}

function initModule(/**@type {Client}*/ client) {
  const wss = new WebSocketServer({ port: config.modules.gmod_relay.wss_port });

  wss.on("connection", (ws) => {
    // try {
    //   axios.post(config.modules.gmod_relay.messaging_webhook, {
    //     username: config.modules.gmod_relay.relay_webhook_name,
    //     avatar_url: config.modules.gmod_relay.relay_webhook_avatar,
    //     embeds: [
    //       new EmbedBuilder()
    //         .setTitle("Сервер працює!")
    //         .setColor(0xcccc11)
    //     ]
    //   })
    // } catch (err) {
    //   logger.error(err);
    // }

    ws.on("error", logger.error);

    ws.on("message", async (data) => {
      const strdata = data.toString()

      // send avatar urls from gmod users
      if (strdata.startsWith(WSMethods.AvatarFetch)) {
        logger.trace("Received request of type", WSMethods.AvatarFetch)
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
      } else if (strdata.startsWith(WSMethods.PlayerConnect)) {
        logger.trace("Received request of type", WSMethods.PlayerConnect)
        const received_data = JSON.parse(data.toString().substring(WSMethods.PlayerConnect.length));

        try {
          axios.post(config.modules.gmod_relay.messaging_webhook, {
            username: config.modules.gmod_relay.relay_webhook_name,
            avatar_url: config.modules.gmod_relay.relay_webhook_avatar,
            embeds: [
              new EmbedBuilder()
                .setTitle(`Гравець **${received_data.plyname}** приєднується до гри ...`)
                .setColor("yellow")
            ]
          });
        } catch (err) {
          logger.error(err);
        }
      } else if (strdata.startsWith(WSMethods.PlayerSpawn)) {
        logger.trace("Received request of type", WSMethods.PlayerSpawn)
        const received_data = JSON.parse(data.toString().substring(WSMethods.PlayerSpawn.length));
        const url =
          "https://steamcommunity.com/profiles/" + received_data.plysteamid64;

        try {
          axios.post(config.modules.gmod_relay.messaging_webhook, {
            username: config.modules.gmod_relay.relay_webhook_name,
            avatar_url: config.modules.gmod_relay.relay_webhook_avatar,
            embeds: [
              new EmbedBuilder()
                .setTitle(`Гравець **${received_data.plyname}** приєднався до гри!`)
                .setDescription(`SteamID: ${received_data.plysteamid}\n[Steam Профіль](${url})`)
                .setColor(0x11cc11)
            ]
          })
        } catch (err) {
          logger.error(err);
        }
      } else if (strdata.startsWith(WSMethods.PlayerLeave)) {
        logger.trace("Received request of type", WSMethods.PlayerLeave)
        const received_data = JSON.parse(data.toString().substring(WSMethods.PlayerLeave.length));
        const url =
          "https://steamcommunity.com/profiles/" + received_data.plysteamid64;

        try {
          axios.post(config.modules.gmod_relay.messaging_webhook, {
            username: config.modules.gmod_relay.relay_webhook_name,
            avatar_url: config.modules.gmod_relay.relay_webhook_avatar,
            embeds: [
              new EmbedBuilder()
                .setTitle(`Гравець **${received_data.plyname}** покинув гру.`)
                .setDescription(`SteamID: ${received_data.plysteamid}\n[Steam Профіль](${url})`)
                .setColor(0xcc1111)
            ]
          })
        } catch (err) {
          logger.error(err);
        }
      } else if (strdata.startsWith(WSMethods.StatusCmd)) {
        logger.trace("Received request of type", WSMethods.StatusCmd)
        const received_data = JSON.parse(data.toString().substring(WSMethods.StatusCmd.length));

        logger.trace(received_data);

        let content = "";
        content = content.concat(`\n**IP**: \`${received_data.ipaddr}\``);
        content = content.concat(`\n**Онлайн**: ${received_data.players.length}/${received_data.maxplys} гравців`);
        content = content.concat(`\n**Поточна мапа**: ${received_data.curmap}`);

        content = content.concat("\n**Список гравців**:")
        for (let ply of received_data.players) {
          content = content.concat(`\n${ply}`)
        }

        const embed = new EmbedBuilder()
          .setTitle(`Статус сервера **${received_data.hostname}**`)
          .setDescription(content)
          .setColor(0x11cccc)

        try {
          axios.post(config.modules.gmod_relay.messaging_webhook, {
            username: config.modules.gmod_relay.relay_webhook_name,
            avatar_url: config.modules.gmod_relay.relay_webhook_avatar,
            embeds: [ embed ]
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
        if (msg.content === "!status") {
          ws.send(WSMethods.StatusCmd);
          return;
        }
        ws.send(`${WSMethods.MessageSend}${msg.author.displayName}: ${msg.content}`);
      }
    })
  })

  logger.log("GMod relay is set up.");
}

module.exports = { initModule }