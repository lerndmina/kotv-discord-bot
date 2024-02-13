import { ActivityType, type ActivityOptions, type Client, PresenceStatusData } from "discord.js";
import type { CommandKit } from "commandkit";
import { log } from "itsasht-logger";
import { stopTimer } from "../../Bot";

/**
 *
 * @param {Client} c
 * @param {Client} client
 */
export default (c: Client<true>, client: Client<true>, handler: CommandKit) => {
  const startTime = stopTimer();
  log.info(`Logged in as ${client.user?.tag}`);
  log.info(
    `Took ${startTime}ms to start the bot. ${startTime > 5000 ? "That's a long time!" : "🚀"}`
  );

  // Set online
  const activityOptions: ActivityOptions = {
    type: ActivityType.Playing,
    name: "",
  };
  client.user.setActivity("DM For Modmail.", activityOptions);
  client.user.setStatus("online" as PresenceStatusData);
};
