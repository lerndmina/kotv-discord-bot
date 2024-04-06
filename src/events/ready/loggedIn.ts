import { ActivityType, type ActivityOptions, type Client, PresenceStatusData } from "discord.js";
import type { CommandKit } from "commandkit";
import log from "fancy-log";
import { redisClient } from "../../Bot";
import Database from "../../utils/data/database";
import Settings, { SettingsType } from "../../models/Settings";
import { ActivityEnum } from "../../commands/utilities/settings";
/**
 *
 * @param {Client} c
 * @param {Client} client
 */
export default async (c: Client<true>, client: Client<true>, handler: CommandKit) => {
  log(`Logged in as ${client.user?.tag}`);

  const db = new Database();
  const settings = (await db.findOne(Settings, { botId: client.user?.id }, false)) as SettingsType;

  if (settings && settings.activityText && settings.activityType) {
    const activity: ActivityOptions = {
      type: settings.activityType,
      name: settings.activityText,
    };
    client.user.setActivity(activity);
  }

  // Set last restart
  redisClient.set(`${client.user.id}-lastRestart`, Date.now().toString());
};
