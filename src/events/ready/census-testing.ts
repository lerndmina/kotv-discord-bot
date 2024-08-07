import {
  ActivityType,
  type ActivityOptions,
  type Client,
  PresenceStatusData,
  ChannelType,
  Message,
  Snowflake,
  Embed,
  EmbedBuilder,
} from "discord.js";
import type { CommandKit } from "commandkit";
import { log } from "itsasht-logger";
import {
  KOTV_CENSUS_INFO_CHANNEL,
  KOTV_CENSUS_INFO_MESSAGE,
  OUTFIT_ID,
  redisClient,
  stopTimer,
} from "../../Bot";
import { ThingGetter, debugMsg } from "../../utils/TinyUtils";
import FetchEnvs from "../../utils/FetchEnvs";
import BasicEmbed from "../../utils/BasicEmbed";
import { setuid } from "process";
import Database from "../../utils/data/database";
import CensusStatus, { CensusStatusType } from "../../models/CensusStatus";
import { Model } from "mongoose";
import { debug } from "console";
import { editMessage } from "../../utils/messages/editMessage";

let offlinePings = 0;
let onlinePings = 0;
const MAX_OFFLINE_PINGS = 6;
const MAX_ONLINE_PINGS = 6;
const CHECK_INTERVAL_MINS = 5;
const CHECK_INTERVAL = CHECK_INTERVAL_MINS * 60 * 1000;
let lastChangeData: CensusStatusType;

let updateInstantlyCount = MAX_ONLINE_PINGS;
function shouldUpdateInstantly() {
  if (updateInstantlyCount > 0) {
    updateInstantlyCount--;
    return true;
  }
  return false;
}

const db = new Database();

/**
 *
 * @param {Client} c
 * @param {Client} client
 */
export default async (c: Client<true>, client: Client<true>, handler: CommandKit) => {
  if (!KOTV_CENSUS_INFO_MESSAGE || !KOTV_CENSUS_INFO_CHANNEL) return;
  const censusStatusMessage = await getCensusStatusMessage(client);
  if (!censusStatusMessage) {
    log.error("Census status message not found, cannot update. . .");
    return;
  }

  log.info("Census status message found, begining update loop. . .");
  log.info(`Will check for census every ${CHECK_INTERVAL_MINS} minutes.`);

  lastChangeData = await getRecordedCensusStatus();
  try {
    await updateCensusStatus(client, censusStatusMessage, shouldUpdateInstantly());
  } catch (error) {
    log.error("Error updating census status: ", error);
  }

  setInterval(async () => {
    lastChangeData = await getRecordedCensusStatus();
    try {
      await updateCensusStatus(client, censusStatusMessage, shouldUpdateInstantly());
    } catch (error) {
      log.error("Error updating census status: ", error);
    }
  }, CHECK_INTERVAL);
};

export async function getCensusStatusMessage(client: Client<true>) {
  const getter = new ThingGetter(client);
  try {
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
  } catch (error) {
    return;
  }
}

export async function updateCensusStatus(
  client: Client<true>,
  message: Message<true>,
  updateInstantly = false
) {
  const env = FetchEnvs();
  const censusUrl = `https://census.daybreakgames.com/s:${env.CENSUS_KEY}/json/get/ps2:v2/character/?name.first_lower=awildlerndmina&c:join=outfit_member`;

  const ONLINE_MESSAGE = "🟢 Census API is online. Character linking should work.";
  let censusStatusMsg = ONLINE_MESSAGE;
  let fields: any = [];

  debugMsg(`Upate instantly: ${updateInstantly}`);

  try {
    // Promise race fetching the urla
    const timeout = new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error("Request timed out"));
      }, 30_000);
    });
    const data = await Promise.race([fetchCensus(censusUrl), timeout]);
    if (!data || !data.returned || data.error) {
      console.debug("Census Data: ", data);
      throw new Error("Census returned no data, or an error.");
    } else if (!data.character_list[0].character_id_join_outfit_member) {
      censusStatusMsg = "🔴 Census API is returning bad data. Character linking will not work.";
      console.debug("Census Data: ", data);
      throw new Error("Census is not returning outfit data correctly.");
    } else {
      onlinePings++;
    }
  } catch (error) {
    offlinePings++;
    log.error(`Census Error: ${error}`);
    log.error(`Census is offline. Offline pings: ${offlinePings}`);
    if (censusStatusMsg === ONLINE_MESSAGE)
      censusStatusMsg = "🔴 Census API is **offline**. Character linking will not work.";
    fields = [
      {
        name: "Impact",
        value: "Character linking will not work until the API is back online.",
        inline: false,
      },
    ];
  }

  const online_offlineSince = `<t:${lastChangeData.lastChange}:F> | <t:${lastChangeData.lastChange}:R>`;

  // Census offline
  if (offlinePings >= MAX_OFFLINE_PINGS || (offlinePings > 0 && updateInstantly)) {
    console.log("offlinePings", offlinePings);
    console.log("Was Already Offline", lastChangeData.isOffline);
    onlinePings = 0;
    if (!lastChangeData.isOffline) {
      // If not already OFFLINE that's a change
      log.info("Census has changed to offline. . .");
      lastChangeData.isOffline = true;
      lastChangeData.lastChange = Math.round(Date.now() / 1000);
      await db.findOneAndUpdate(CensusStatus, { id: 1 }, lastChangeData);
    }
    fields.push({
      name: "Last Online",
      value: online_offlineSince,
    });

    editMessage(message, "Census Status", censusStatusMsg, fields, false);
    return;
  }

  // Census online
  if (onlinePings >= MAX_ONLINE_PINGS || (onlinePings > 0 && updateInstantly)) {
    console.log("onlinePings", onlinePings);
    console.log("Was Already Offline", lastChangeData.isOffline);
    offlinePings = 0;
    if (lastChangeData.isOffline) {
      // If not already ONLINE that's a change
      log.info("Census has come back online!");
      lastChangeData.isOffline = false;
      lastChangeData.lastChange = Math.round(Date.now() / 1000);
      await db.findOneAndUpdate(CensusStatus, { id: 1 }, lastChangeData);
    }
    fields.push({
      name: "Last Offline",
      value: online_offlineSince,
    });

    editMessage(message, "Census Status", censusStatusMsg, fields, true);
    return;
  }

  // Census is unstable
  if ((offlinePings || onlinePings) && !updateInstantly) {
    censusStatusMsg = "🟡 Census API is **unstable**. Character linking may not work.";
    fields.push({
      name: "Unstable Since",
      value: online_offlineSince,
    });
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
    editMessage(message, "Census Status", censusStatusMsg, fields, false);
    return;
  }
}

async function fetchCensus(url: string) {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}
async function getRecordedCensusStatus() {
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
