const { DiscordAPIError } = require("discord.js");
const log = require("fancy-log");
const { set } = require("mongoose");

module.exports = async (message, time) => {
  if (time == undefined) time = 0;
  setTimeout(async () => {
    try {
      await message.delete();
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        log.error(`Discord API Error: ${error.message}`);
      }
    }
  }, time);
};
