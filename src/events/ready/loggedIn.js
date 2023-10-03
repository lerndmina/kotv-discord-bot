const { Client, PresenceStatus, ActivityType } = require("discord.js");
var log = require("fancy-log");

/**
 *
 * @param {Client} c
 * @param {Client} client
 */
module.exports = (c, client) => {
  log("Booting up KOTV Bot...");
  log(`Logged in as ${client.user.tag}`);

  // Set online
  client.user.setActivity("for messages.", { type: ActivityType.Watching });
  client.user.setStatus("online");
};
