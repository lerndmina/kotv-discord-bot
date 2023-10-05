const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const log = require("fancy-log");
const BasicEmbed = require("../../utils/BasicEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Get the bot's ping")
    .addBooleanOption((option) =>
      option.setName("private").setDescription("Whether to reply privately or not")
    ),
  options: {
    devOnly: false,
  },
  run: async ({ interaction, client, handler }) => {
    var private = interaction.options.getBoolean("private");

    if (private == null) private = true;

    const timestamp = interaction.createdTimestamp;
    const currentTime = Date.now();
    var latency = currentTime - timestamp;
    if (latency < 0) {
      latency = "< 0";
    }

    var wsPing = interaction.client.ws.ping;
    var deferred = false;

    if (wsPing == -1) {
      const now = Date.now();
      const pingAgainTime = now + 30000;
      const discordTime = Math.floor(pingAgainTime / 1000);

      var preEmbed = BasicEmbed(client, "🏓 Pong?", `websocket ping == -1`, [
        { name: `Websocket`, value: `Bot just started, pinging again <t:${discordTime}:R>` },
        { name: `Message Latency`, value: `${latency}ms` },
      ]);

      await interaction.reply({ embeds: [preEmbed], ephemeral: private });

      await new Promise((r) => setTimeout(r, 30000));
      wsPing = interaction.client.ws.ping;
      deferred = true;
    }

    const postEmbed = BasicEmbed(client, "🏓 Pong!", `I'm ALIVE!`, [
      { name: `Websocket`, value: `${wsPing}ms` },
      { name: `Message Latency`, value: `${latency}ms` },
    ]);

    if (deferred) {
      await interaction.editReply({ embeds: [postEmbed], ephemeral: private });
    } else {
      await interaction.reply({ embeds: [postEmbed], ephemeral: private });
    }
  },
};
