import { ChannelType, Client, Message } from "discord.js";
import Database from "../../utils/data/database";
import BibiChannels from "../../models/BibiChannels";

const db = new Database();

export default async function (message: Message, client: Client<true>) {
  if (message.author.bot) return;
  if (message.channel.type != ChannelType.GuildText) return;

  const channel = message.channel;
  const data = await db.findOne(BibiChannels, { guildID: channel.guild.id });
  if (!data) return;
  if (!data.channelIDs.includes(channel.id)) return;
  message.react("<:bibi:1316754248859648040>");
}
