import type { CommandData, SlashCommandProps, CommandOptions } from "commandkit";
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { log } from "itsasht-logger";
import { globalCooldownKey, setCommandCooldown, waitingEmoji } from "../../Bot";
import { fetchApiUrl, sleep } from "../../utils/TinyUtils";
import BasicEmbed from "../../utils/BasicEmbed";
import logger from "fancy-log";
import FetchEnvs from "../../utils/FetchEnvs";
import CensusStatus, { CensusStatusType } from "../../models/CensusStatus";
import Database from "../../utils/data/database";
import { getCensusStatusMessage, updateCensusStatus } from "../../events/ready/census-testing";

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

let censusData: any;
let censusError: boolean = false;
let offlineSinceString: string = "";
const db = new Database();

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

  const censusStatusData = (await db.findOne(CensusStatus, { id: 1 })) as CensusStatusType;
  if (censusStatusData?.isOffline) {
    censusError = true;
    censusErrorString = "Census is currently offline, or has returned an invalid response.";
    offlineSinceString = `<t:${censusStatusData.lastChange}:R>`;
  }

  const startTime = Date.now();
  try {
    const timeout = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("Request timed out"));
      }, 10000); // 10 seconds
    });

    const env = FetchEnvs();

    censusData = await Promise.race([
      fetch(`https://census.daybreakgames.com/s:${env.CENSUS_KEY}/get/ps2:v2/world/`),
      timeout,
    ]);
  } catch (error) {
    log.error(`Census Error: ${error}`);
    censusError = true;
    censusErrorString = error as string;
  }
  const endTime = Date.now();

  if (!censusData) {
    censusError = true;
  }

  if (censusError) {
    if (offlineSinceString)
      fields[2].value = `<a:panik:1269540588810932335> Census is currently **Offline** \nLast online: ${offlineSinceString}`;
    else {
      fields[2].value = `<a:panik:1269540588810932335> Census has just gone offline, or has returned bad data. I will update my records. \nError: ${censusErrorString}`;
      const message = await getCensusStatusMessage(client);
      message ? updateCensusStatus(client, message, true) : null;
    }
  } else {
    fields[2].value = `${endTime - startTime}ms`;
  }

  try {
    await interaction.editReply({
      embeds: [BasicEmbed(client, embedTitle, embedDescription, fields)],
    });
  } catch (error) {
    null;
  }

  if (needsRefresh) {
    await sleep(15 * 1000);
    fields[0].value = `${interaction.client.ws.ping}ms`;
    try {
      await interaction.editReply({
        content: "",
        embeds: [BasicEmbed(client, embedTitle, embedDescription, fields)],
      });
    } catch (error) {
      null;
    }
  }
}
