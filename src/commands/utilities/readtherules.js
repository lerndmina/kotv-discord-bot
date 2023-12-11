const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const log = require("fancy-log");
const BasicEmbed = require("../../utils/BasicEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("readtherules")
    .setDescription("Tell someone to read the rules."),
  options: {
    devOnly: false,
  },
  run: async ({ interaction, client, handler }) => {
    interaction.reply("https://therules.fyi/");
  },
};
