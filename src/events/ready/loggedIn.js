const { Client, PresenceStatus, ActivityType } = require("discord.js");
var log = require("fancy-log");
const { debugMsg } = require("../../utils/debugMsg");
const { botStartTime } = require("../../Bot");

/**
 *
 * @param {Client} c
 * @param {Client} client
 */
module.exports = (c, client) => {
  const endTime = new Date();
  log(`Logged in as ${client.user.tag}`);
  debugMsg(`Boot time: ${endTime - botStartTime}ms`);

  // Set online
  client.user.setActivity("for messages.", { type: ActivityType.Watching });
  client.user.setStatus("online");
};
