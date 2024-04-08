import {
  BufferResolvable,
  channelLink,
  Client,
  Collection,
  EmbedField,
  GuildTextBasedChannel,
  Message,
  PartialMessage,
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

  messageDeleted = async (message: Message | PartialMessage) => {
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

  bulkMessageDelete = async (messages: Collection<string, Message<boolean> | PartialMessage>) => {
    const fields: EmbedField[] = [];
    fields.push({ name: "Messages Deleted", value: messages.size.toString(), inline: true });
    const attachment = Buffer.from(
      messages
        .map(
          (m) =>
            `${m.partial ? `Partial Message ID: ${m.id}` : `Message ID: ${m.id}`}\nAuthor: ${
              m.author?.tag
            } - ${m.author?.id}\nContent: ${m.content}\n\n`
        )
        .join("\n")
    );
    return this.#log(fields, LogType.MESSAGE_BULK_DELETED, attachment);
  };

  #log = async (fields: EmbedField[], type: LogType, attachment?: BufferResolvable) => {
    try {
      const channel = (await this.getter.getChannel(LOGGING_CHANNEL)) as GuildTextBasedChannel;
      if (!channel) return;
      channel.send({
        embeds: [BasicEmbed(this.client, "Logging", type, fields)],
        allowedMentions: { parse: [] },
        files: attachment ? [{ attachment, name: "message.txt" }] : undefined,
      });
    } catch (error) {
      return;
    }
  };
}

export enum LogType {
  MESSAGE_DELETED = "Message Deleted",
  MESSAGE_BULK_DELETED = "Messages Bulk Deleted",
  MESSAGE_UPDATED = "Message Updated",
  MEMBER_JOINED = "Member Joined",
  MEMBER_LEFT = "Member Left",
}
