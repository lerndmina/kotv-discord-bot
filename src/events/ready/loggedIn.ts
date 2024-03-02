import {
  ActivityType,
  type ActivityOptions,
  type Client,
  PresenceStatusData,
  ChannelType,
} from "discord.js";
import type { CommandKit } from "commandkit";
import { log } from "itsasht-logger";
import { stopTimer } from "../../Bot";
import { ThingGetter } from "../../utils/TinyUtils";

/**
 *
 * @param {Client} c
 * @param {Client} client
 */
export default async (c: Client<true>, client: Client<true>, handler: CommandKit) => {
  const startTime = stopTimer();
  log.info(`Logged in as ${client.user?.tag}`);
  console.log("");
  log.info(
    `Startup complete in ${startTime}ms. Ready to serve ${client.guilds.cache.size} server(s).`
  );

  // Set online
  const activityOptions: ActivityOptions = {
    type: ActivityType.Playing,
    name: "",
  };
  client.user.setActivity("DM For Modmail.", activityOptions);
  client.user.setStatus("online" as PresenceStatusData);
};
