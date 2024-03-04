import type { CommandData, SlashCommandProps, CommandOptions } from "commandkit";
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { log } from "itsasht-logger";
import { globalCooldownKey, setCommandCooldown, waitingEmoji } from "../../Bot";
import { fetchApiUrl, sleep } from "../../utils/TinyUtils";
import BasicEmbed from "../../utils/BasicEmbed";
import logger from "fancy-log";

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
  setCommandCooldown(globalCooldownKey(interaction.commandName), 15);

  var isPrivate = interaction.options.getBoolean("private") || false;
  await interaction.reply({ content: waitingEmoji, ephemeral: isPrivate });

  if (isPrivate == null) isPrivate = true;

  const timestamp = interaction.createdTimestamp;
  const currentTime = Date.now();
  var latency = timestamp - currentTime < 0 ? currentTime - timestamp : timestamp - currentTime;
  const latencyString = latency.toString() + "ms";

  var wsPing = interaction.client.ws.ping;

  let censusData: any;
  let censusError: boolean = false;

  const fields = [
    { name: "Websocket", value: `${wsPing}ms`, inline: false },
    { name: "Message Latency", value: `${latencyString}`, inline: false },
    { name: "Census Latency", value: waitingEmoji, inline: false },
  ];

  let needsRefresh = false;
  if (wsPing < 5 || latency < 5) {
    fields[0].value = `${waitingEmoji}`;
    needsRefresh = true;
  }

  const embedTitle = "🏓 Pong!";
  const embedDescription = `Bot online! Results Below.`;

  await interaction.editReply({
    content: "",
    embeds: [BasicEmbed(client, embedTitle, embedDescription, fields)],
  });

  let censusErrorString = "";

  const startTime = Date.now();
  try {
    const timeout = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("Request timed out"));
      }, 10000); // 10 seconds
    });

    censusData = await Promise.race([fetchApiUrl("AWildLerndmina"), timeout]);
  } catch (error) {
    log.error(`Census Error: ${error}`);
    censusError = true;
    censusErrorString = error as string;
  }
  const endTime = Date.now();

  if (!censusData || censusData.returned == 0 || !censusData.character_list[0]) {
    censusError = true;
  }

  if (censusError) {
    fields[2].name = "Census ERROR!";
    fields[2].value =
      "Census is either down or returned an invalid response. This will cause issues with character linking.\n\nHere's the error: ```\n" +
      censusErrorString +
      "```\n\nThis is not an issue with the bot but an issue with the census API. Please try again later.";
  } else {
    fields[2].value = `${endTime - startTime}ms`;
  }

  await interaction.editReply({
    embeds: [BasicEmbed(client, embedTitle, embedDescription, fields)],
  });

  if (needsRefresh) {
    await sleep(15 * 1000);
    fields[0].value = `${interaction.client.ws.ping}ms`;
    await interaction.editReply({
      content: "",
      embeds: [BasicEmbed(client, embedTitle, embedDescription, fields)],
    });
  }
}
