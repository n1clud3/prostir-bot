//@ts-check

const { Client, Events } = require("discord.js");
const Logger = require("../../logging");
const config = require("../../config.json");
const _ = require("lodash");

let responses_left = [];

/**
 * @param {Client} client
 */
function initModule(client) {
  const logger = new Logger("ping_response");
  client.on(Events.MessageCreate, async (msg) => {
    if (!msg.mentions.has(client.user)) return;

    if (responses_left.length < 1) responses_left = config.modules.ping_response.responses;

    const selection = _.random(0, responses_left.length - 1, false);
    const selected_response = responses_left[selection];
    // remove selected response from left responses
    responses_left = responses_left.slice(0, selection).concat(responses_left.slice(selection + 1));
    logger.trace(responses_left);

    await msg.reply(selected_response);
  });

  logger.log("Ping responses are set up.");
}

module.exports = { initModule };
