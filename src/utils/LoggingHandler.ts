import {
  BufferResolvable,
  channelLink,
  Client,
  Collection,
  EmbedField,
  Guild,
  GuildMember,
  GuildTextBasedChannel,
  Message,
  PartialGuildMember,
  PartialMessage,
  TextChannel,
  time,
  TimestampStyles,
  userMention,
} from "discord.js";
import Database from "./data/database";
import { debugMsg, ThingGetter } from "./TinyUtils";
import BasicEmbed from "./BasicEmbed";
import { LogTypes } from "../commands/moderation/logsettings";
import FetchEnvs from "./FetchEnvs";
import logger from "fancy-log";
import LogSchema, { LogSchemaType } from "../models/LogSchema";

const db = new Database();
const env = FetchEnvs();

export default class LoggingHandler {
  client: Client<true>;
  getter: ThingGetter;
  db: Database;
  constructor(client: Client<true>) {
    this.client = client;
    this.getter = new ThingGetter(client);
    this.db = new Database();
  }

  messageDeleted = async (message: Message | PartialMessage, guild: Guild) => {
    const { channel, logData } = await this.#getLogData(guild);
    if (!channel || !logData) return;
    if (message.channelId === channel.id) return;
    const fields: EmbedField[] = [];
    if (message.partial) {
      fields.push({ name: "Message ID", value: message.id, inline: true });
      fields.push({ name: "Channel", value: channelLink(message.channelId), inline: true });
      fields.push({
        name: "Content",
        value: "Message was created before the bot last started so was not cached.",
        inline: false,
      });

      this.#log(fields, LogTypes.MESSAGE_DELETED, guild);
      return;
    }

    fields.push({ name: "Message ID", value: message.id, inline: true });
    fields.push({ name: "Channel", value: channelLink(message.channelId), inline: true });
    fields.push({
      name: "Author",
      value: `${userMention(message.author.id)} - ${message.author.id}`,
      inline: true,
    });
    fields.push({ name: "Content", value: message.content, inline: false });

    this.#log(fields, LogTypes.MESSAGE_DELETED, guild);
    return;
  };

  bulkMessageDelete = async (
    messages: Collection<string, Message<boolean> | PartialMessage>,
    guild: Guild
  ) => {
    const { channel, logData } = await this.#getLogData(guild);
    if (!channel || !logData) return;
    const fields: EmbedField[] = [];
    fields.push({ name: "Messages Deleted", value: messages.size.toString(), inline: true });
    const attachment = Buffer.from(
      messages
        .map(async (m) => {
          if (!m.partial && m.channelId === channel.id) return;
          return `${m.partial ? `Partial Message ID: ${m.id}` : `Message ID: ${m.id}`}\nAuthor: ${
            m.author?.tag
          } - ${m.author?.id}\nContent: ${m.content}\n\n`;
        })
        .join("\n")
    );
    this.#log(fields, LogTypes.MESSAGE_BULK_DELETED, guild, attachment);
    return;
  };

  messagEdited = async (
    oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage,
    guild: Guild
  ) => {
    if (newMessage.partial || newMessage.author.bot) return;
    const fields: EmbedField[] = [];
    fields.push({ name: "Message ID", value: newMessage.id, inline: true });
    fields.push({ name: "Channel", value: channelLink(newMessage.channelId), inline: true });
    fields.push({
      name: "Author",
      value: `${userMention(newMessage.author.id)} - ${newMessage.author.id}`,
      inline: true,
    });
    fields.push({
      name: "Old Content",
      value: oldMessage.partial ? "Message content unavailable" : oldMessage.content,
      inline: false,
    });
    fields.push({ name: "New Content", value: newMessage.content, inline: false });

    this.#log(fields, LogTypes.MESSAGE_UPDATED, guild);
    return;
  };

  memberJoined = async (member: GuildMember) => {
    const fields: EmbedField[] = [];
    fields.push({
      name: "Member",
      value: `${userMention(member.id)} - ${member.id}`,
      inline: true,
    });
    member.joinedTimestamp
      ? fields.push({
          name: "Joined At",
          value: time(Math.floor(member.joinedTimestamp / 1000), TimestampStyles.RelativeTime),
          inline: true,
        })
      : null;
    member.user.createdTimestamp
      ? fields.push({
          name: "Account Created",
          value: time(
            Math.floor(member.user.createdTimestamp / 1000),
            TimestampStyles.RelativeTime
          ),
          inline: true,
        })
      : null;

    this.#log(fields, LogTypes.MEMBER_JOINED, member.guild);
    return;
  };

  memberLeft = async (member: GuildMember | PartialGuildMember) => {
    const fields: EmbedField[] = [];
    fields.push({
      name: "Member",
      value: `${userMention(member.id)} - ${member.id}`,
      inline: true,
    });
    member.joinedTimestamp
      ? fields.push({
          name: "Joined At",
          value: time(Math.floor(member.joinedTimestamp / 1000), TimestampStyles.RelativeTime),
          inline: true,
        })
      : null;
    member.user.createdTimestamp
      ? fields.push({
          name: "Account Created",
          value: time(
            Math.floor(member.user.createdTimestamp / 1000),
            TimestampStyles.RelativeTime
          ),
          inline: true,
        })
      : null;

    this.#log(fields, LogTypes.MEMBER_LEFT, member.guild);
    return;
  };

  #log = async (
    fields: EmbedField[],
    type: LogTypes,
    guild: Guild,
    attachment?: BufferResolvable
  ) => {
    try {
      const { channel, logData } = await this.#getLogData(guild);
      if (!channel || !logData) return;
      if (!logData.enabledLogs.includes(type)) return;
      channel.send({
        embeds: [BasicEmbed(this.client, "Logging", type, fields)],
        allowedMentions: { parse: [] },
        files: attachment ? [{ attachment, name: "message.txt" }] : undefined,
      });
    } catch (error) {
      logger.error(error);
      return;
    }
  };

  #getLogData = async (guild: Guild) => {
    const logData = (await this.db.findOne(
      LogSchema,
      { guildId: guild.id },
      true
    )) as LogSchemaType;
    if (!logData) return { channel: null, logData: null };
    const channel = (await this.getter.getChannel(logData.channelId)) as TextChannel;
    if (!channel) return { channel: null, logData: null };
    return { channel, logData };
  };
}
