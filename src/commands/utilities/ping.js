const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const log = require("fancy-log");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!")
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
      var preEmbed = new EmbedBuilder()
        .setTitle("🏓 Pong!")
        .addFields({ name: `Websocket`, value: `Bot just started, pinging again...` })
        .addFields({ name: `Message Latency`, value: `${latency}ms` })
        .setColor("#0099ff");
      await interaction.reply({ embeds: [preEmbed], ephemeral: private });

      await new Promise((r) => setTimeout(r, 30000));
      wsPing = interaction.client.ws.ping;
      deferred = true;
    }

    const postEmbed = new EmbedBuilder()
      .setTitle("🏓 Pong!")
      .addFields({ name: `Websocket`, value: `${wsPing}ms` })
      .addFields({ name: `Message Latency`, value: `${latency}ms` })
      .setColor("#0099ff");

    if (deferred) {
      await interaction.editReply({ embeds: [postEmbed], ephemeral: private });
    } else {
      await interaction.reply({ embeds: [postEmbed], ephemeral: private });
    }
  },
};
