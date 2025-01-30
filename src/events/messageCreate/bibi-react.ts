import { ChannelType, Client, Message } from "discord.js";
import log from "fancy-log";

const ENABLED_CHANNELS = ["699379838322081852"];

export default async function (message: Message, client: Client<true>) {
  if (message.author.bot) return;
  if (message.channel.type != ChannelType.GuildText) return;

  const channel = message.channel;
  if (!ENABLED_CHANNELS.includes(channel.id)) return;

  message.react("<:bibi:1316754248859648040>");
}
