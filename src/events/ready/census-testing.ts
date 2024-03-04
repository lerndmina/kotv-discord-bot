import {
  ActivityType,
  type ActivityOptions,
  type Client,
  PresenceStatusData,
  ChannelType,
  Message,
  Snowflake,
} from "discord.js";
import type { CommandKit } from "commandkit";
import { log } from "itsasht-logger";
import {
  KOTV_CENSUS_INFO_CHANNEL,
  KOTV_CENSUS_INFO_MESSAGE,
  redisClient,
  stopTimer,
} from "../../Bot";
import { ThingGetter, debugMsg } from "../../utils/TinyUtils";
import FetchEnvs from "../../utils/FetchEnvs";
import BasicEmbed from "../../utils/BasicEmbed";
import { setuid } from "process";
import Database from "../../utils/cache/database";
import CensusStatus, { CensusStatusType } from "../../models/CensusStatus";
import { Model } from "mongoose";
import { debug } from "console";

let offlinePings = 0;
let onlinePings = 0;
const MAX_OFFLINE_PINGS = 6;
const MAX_ONLINE_PINGS = 6;
const CHECK_INTERVAL_MINS = 5;
const CHECK_INTERVAL = CHECK_INTERVAL_MINS * 60 * 1000;
let lastChangeData: CensusStatusType;

const db = new Database();

/**
 *
 * @param {Client} c
 * @param {Client} client
 */
export default async (c: Client<true>, client: Client<true>, handler: CommandKit) => {
  if (!lastChangeData) {
    lastChangeData = await fetchLastChange();
  }

  const censusStatusMessage = await getCensusStatusMessage(client);
  if (!censusStatusMessage) {
    log.error("Census status message not found, cannot update. . .");
    return;
  }

  debugMsg("Census status message found, begining update loop. . .");
  debugMsg(`Will check for census every ${CHECK_INTERVAL_MINS} minutes.`);
  updateCensusStatus(client, censusStatusMessage, false);
  setInterval(() => {
    updateCensusStatus(client, censusStatusMessage);
  }, CHECK_INTERVAL);
};

async function getCensusStatusMessage(client: Client<true>) {
  const getter = new ThingGetter(client);
  const channel = await getter.getChannel(KOTV_CENSUS_INFO_CHANNEL);
  if (channel == null) {
    log.error("Failed to get channel");
    return;
  }
  if (channel.type !== ChannelType.GuildText) {
    log.error("Channel is not a text channel");
    return;
  }
  const message = await channel.messages.fetch(KOTV_CENSUS_INFO_MESSAGE);
  if (message == null) {
    log.error("Failed to get census status message.");
    return;
  }

  return message;
}

export async function updateCensusStatus(
  client: Client<true>,
  message: Message<true>,
  updateInstantly = false
) {
  const env = FetchEnvs();
  const censusUrl = `https://census.daybreakgames.com/s:${env.CENSUS_KEY}/get/ps2:v2/world/`;

  let censusStatusMsg = "🟢 Census API is online. Character linking should work.";
  let fields: any = [];

  try {
    // Promise race fetching the urla
    const timeout = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("Request timed out"));
      }, 30_000);
    });
    const data = await Promise.race([fetchCensus(censusUrl), timeout]);
    if (!data || !data.returned) {
      throw new Error("Census returned no data");
    } else {
      onlinePings++;
    }
  } catch (error) {
    offlinePings++;
    log.error(`Census Error: ${error}`);
    log.error(`Census is offline. Offline pings: ${offlinePings}`);
    censusStatusMsg = "🔴 Census API is **offline** or has provided invalid data.";
    fields = [
      {
        name: "Impact",
        value: "Character linking will not work until the API is back online.",
        inline: false,
      },
    ];
  }

  const online_offlineSince = `<t:${lastChangeData.lastChange}:F> <t:${lastChangeData.lastChange}:R>`;

  // Census offline
  if (offlinePings >= MAX_OFFLINE_PINGS || updateInstantly) {
    onlinePings = 0;
    if (!lastChangeData.isOffline) {
      // If not already OFFLINE that's a change
      log.info("Census has changed to offline. . .");
      lastChangeData.isOffline = true;
      lastChangeData.lastChange = Math.round(Date.now() / 1000);
      await db.findOneAndUpdate(CensusStatus, { id: 1 }, lastChangeData);
    }
    fields.push({
      name: "Offline Since",
      value: online_offlineSince,
    });

    const embed = BasicEmbed(client, "Census Status", censusStatusMsg, fields);
    await message.edit({ embeds: [embed], content: "", components: [] });
    return;
  }

  // Census online
  if (onlinePings >= MAX_ONLINE_PINGS) {
    offlinePings = 0;
    if (lastChangeData.isOffline) {
      // If not already ONLINE that's a change
      log.info("Census has come back online!");
      lastChangeData.isOffline = false;
      lastChangeData.lastChange = Math.round(Date.now() / 1000);
      await db.findOneAndUpdate(CensusStatus, { id: 1 }, lastChangeData);
    }
    fields.push({
      name: "Online Since",
      value: online_offlineSince,
    });

    const embed = BasicEmbed(client, "Census Status", censusStatusMsg, fields);
    await message.edit({ embeds: [embed], content: "", components: [] });
    return;
  }

  // Census is unstable
  if (offlinePings || (onlinePings && !updateInstantly)) {
    censusStatusMsg = "🟡 Census API is **unstable**. Character linking may not work.";
    fields.push({
      name: "Offline Pings",
      value: `${offlinePings}`,
      inline: true,
    });
    fields.push({
      name: "Online Pings",
      value: `${onlinePings}`,
      inline: true,
    });
    const embed = BasicEmbed(client, "Census Status", censusStatusMsg, fields);
    await message.edit({ embeds: [embed], content: "", components: [] });
    return;
  }
}

async function fetchCensus(url: string) {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}
async function fetchLastChange() {
  const censusDbData = await db.findOne(CensusStatus, { id: 1 });
  if (censusDbData) {
    return censusDbData;
  }
  const newCensusData = new CensusStatus({
    id: 1,
    lastChange: Math.round(Date.now() / 1000),
    isOffline: false,
  });
  await db.findOneAndUpdate(CensusStatus, { id: 1 }, newCensusData);
  return newCensusData;
}
