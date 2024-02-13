import type { CommandData, SlashCommandProps, CommandOptions } from "commandkit";
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { log } from "itsasht-logger";
import { waitingEmoji } from "../../Bot";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!")
  .addBooleanOption((option) =>
    option.setName("private").setDescription("Whether to reply privately or not").setRequired(false)
  );

export const options: CommandOptions = {
  devOnly: false,
  guildOnly: false,
  deleted: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  var isPrivate = interaction.options.getBoolean("private");

  if (isPrivate == null) isPrivate = true;

  const timestamp = interaction.createdTimestamp;
  const currentTime = Date.now();
  const latency = currentTime - timestamp;
  var latencyString = "";
  if (latency < 0) {
    latencyString = `${latency}ms (This is probably wrong)\n\nAt least you know the bot is alive lmao!`;
  } else {
    latencyString = latency.toString() + "ms";
  }

  var wsPing = interaction.client.ws.ping;
  var deferred = false;

  if (wsPing < 5 || latency < 5) {
    var preEmbed = new EmbedBuilder()
      .setTitle("🏓 Pong!")
      .addFields({
        name: `Websocket`,
        value: `The bot just started. Waiting 1m for websocket ping to be cached. ${waitingEmoji}`,
      })
      .addFields({
        name: `Message Latency`,
        value: `${latencyString}`,
      })
      .setColor("#0099ff");
    await interaction.reply({ embeds: [preEmbed], ephemeral: isPrivate });

    await new Promise((r) => setTimeout(r, 60000));
    wsPing = interaction.client.ws.ping;
    deferred = true;
  }

  const postEmbed = new EmbedBuilder()
    .setTitle("🏓 Pong!")
    .addFields({ name: `Websocket`, value: `${wsPing}ms` })
    .addFields({ name: `Message Latency`, value: `${latencyString}` })
    .setColor("#0099ff");

  if (deferred) {
    await interaction.editReply({ embeds: [postEmbed] });
  } else {
    await interaction.reply({ embeds: [postEmbed], ephemeral: isPrivate });
  }
}
