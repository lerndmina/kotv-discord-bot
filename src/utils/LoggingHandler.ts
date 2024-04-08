import {
  channelLink,
  Client,
  EmbedField,
  GuildTextBasedChannel,
  Message,
  userMention,
} from "discord.js";
import Database from "./data/database";
import { ThingGetter } from "./TinyUtils";
import BasicEmbed from "./BasicEmbed";

const db = new Database();
const LOGGING_CHANNEL = "1226908980551614485";

export default class LoggingHandler {
  client: Client<true>;
  getter: ThingGetter;
  constructor(client: Client<true>) {
    this.client = client;
    this.getter = new ThingGetter(client);
  }

  messageDeleted = async (message: Message) => {
    const fields: EmbedField[] = [];
    if (message.partial) {
      fields.push({ name: "Message ID", value: message.id, inline: true });
      fields.push({ name: "Channel", value: channelLink(message.channelId), inline: true });
      fields.push({
        name: "Content",
        value: "Message was created before the bot last started so was not cached.",
        inline: false,
      });

      return this.#log(fields, LogType.MESSAGE_DELETED);
    }

    fields.push({ name: "Message ID", value: message.id, inline: true });
    fields.push({ name: "Channel", value: channelLink(message.channelId), inline: true });
    fields.push({
      name: "Author",
      value: `${userMention(message.author.id)} - ${message.author.id}`,
      inline: true,
    });
    fields.push({ name: "Content", value: message.content, inline: false });

    return this.#log(fields, LogType.MESSAGE_DELETED);
  };

  #log = async (fields: EmbedField[], type: LogType) => {
    const channel = (await this.getter.getChannel(LOGGING_CHANNEL)) as GuildTextBasedChannel;
    if (!channel) return;
    channel.send({
      embeds: [BasicEmbed(this.client, "Logging", type, fields)],
      allowedMentions: { parse: [] },
    });
  };
}

export enum LogType {
  MESSAGE_DELETED = "Message Deleted",
  MESSAGE_UPDATED = "Message Updated",
  MEMBER_JOINED = "Member Joined",
  MEMBER_LEFT = "Member Left",
}
