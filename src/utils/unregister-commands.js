const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
var log = require("fancy-log");
const DeleteMessage = require("./DeleteMessage");
const BasicEmbed = require("./BasicEmbed");
const FetchEnvs = require("./FetchEnvs");

env = FetchEnvs();

const syncCommands = async (client, message, guildId, global) => {
  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(env.BOT_TOKEN);

  if (!global) {
    try {
      await message.channel.send("Deleting this guild's commands...");
      await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: [] });
      await message.channel.send("Guild's commands deleted.");
      return;
    } catch (error) {
      log.error(error);
      await message.channel.send("Error deleting commands.");
      return;
    }
  } else {
    try {
      await message.channel.send("Deleting global commands...");
      await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
      await message.channel.send("Global commands deleted.");
      return;
    } catch (error) {
      log.error(error);
      await message.channel.send("Error deleting commands.");
      return;
    }
  }
};

module.exports = syncCommands;
