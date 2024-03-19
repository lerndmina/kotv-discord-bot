import {
  Client,
  Snowflake,
  Guild,
  User,
  Channel,
  ClientApplication,
  BaseInteraction,
  Interaction,
  CommandInteraction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  InteractionReplyOptions,
  Base,
  RepliableInteraction,
  MessageFlags,
  Message,
  GuildMember,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import FetchEnvs from "./FetchEnvs";
import { log } from "itsasht-logger";
import BasicEmbed from "./BasicEmbed";
import { Url } from "url";
import chalk from "chalk";
import { ParsedTime } from "./ParseTimeFromMessage";
import ButtonWrapper from "./ButtonWrapper";
import { KOTV_PREACHER_ROLE } from "../Bot";

const env = FetchEnvs();

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isVoiceMessage(message: Message) {
  return message.flags.bitfield === MessageFlags.IsVoiceMessage && message.attachments.size == 1;
}

export async function postWebhookToThread(url: Url, threadId: Snowflake, content: string) {
  try {
    await fetch(`${url}?thread_id=${threadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content }),
    });
  } catch (error) {
    console.error(error);
    return false;
  }
  return true;
}

export async function sendDM(userId: Snowflake, content: string, client: Client<true>) {
  try {
    const thingGetter = new ThingGetter(client);
    const user = await thingGetter.getUser(userId);
    if (!user) {
      log.error("Failed to send a DM to user: " + userId + "I couldn't find the user.");
      return;
    }
    return await user.send(content);
  } catch (error) {
    log.error(
      "Failed to send a DM to user: " +
        userId +
        "I probably don't have permission to send DMs to them. Error to follow:"
    );
    log.error(error as string);
  }
}

export class ThingGetter {
  typeMap: { users: string; channels: string; guilds: string };
  client: Client<true>;
  constructor(client: Client<true>) {
    this.client = client;
    this.typeMap = {
      users: "users",
      channels: "channels",
      guilds: "guilds",
    };
  }

  async getUser(id: Snowflake) {
    try {
      return (await this.#get(id, "users")) as unknown as User; // This is technically safe
    } catch (error) {
      return null;
    }
  }

  async getChannel(id: Snowflake) {
    try {
      return (await this.#get(id, "channels")) as unknown as Channel; // This is technically safe
    } catch (error) {
      return null;
    }
  }

  async getGuild(id: Snowflake) {
    try {
      return (await this.#get(id, "guilds")) as unknown as Guild; // This is technically safe
    } catch (error) {
      return null;
    }
  }

  async getMember(guild: Guild, id: Snowflake) {
    try {
      const member = guild.members.cache.get(id);
      return member ? member : await guild.members.fetch(id);
    } catch (error) {
      return null;
    }
  }

  async getRole(guild: Guild, id: Snowflake) {
    try {
      const role = guild.roles.cache.get(id);
      return role ? role : await guild.roles.fetch(id);
    } catch (error) {
      return null;
    }
  }

  getMemberName(guildMember: GuildMember) {
    return guildMember.nickname || this.getUsername(guildMember.user);
  }

  getUsername(user: User) {
    return user.globalName || user.username;
  }

  async #get(id: Snowflake, type: "users" | "channels" | "guilds") {
    var start = env.DEBUG_LOG ? Date.now() : undefined;
    const property = this.typeMap[type];
    if (!property) {
      throw new Error(`Invalid type: ${type}`);
    }

    let thing = (this.client as any)[property].cache.get(id);
    if (!thing) {
      thing = await (this.client as any)[property].fetch(id);
    }
    if (env.DEBUG_LOG) debugMsg(`ThingGetter - Time taken: ${Date.now() - start!}ms`);
    return thing;
  }
}

export function debugMsg(msg: string | Object) {
  if (!env.DEBUG_LOG) return;
  if (msg instanceof Object) {
    console.log(msg);
  } else {
    log.info(`DEBUG: ${msg}`);
  }
}

export async function returnMessage(
  interaction: RepliableInteraction,
  client: Client<true>,
  title: string,
  message: string,
  args: { error?: boolean; firstMsg?: boolean; ephemeral?: boolean } = {
    error: false,
    firstMsg: false,
    ephemeral: true,
  }
) {
  const embed = BasicEmbed(
    client,
    args.error ? "Error" : title,
    message.toString(),
    undefined,
    args.error ? "Red" : "Green"
  );

  if (args.firstMsg) {
    return await interaction.reply({
      content: "",
      embeds: [embed],
      ephemeral: args.ephemeral,
    });
  }
  await interaction.editReply({
    content: "",
    embeds: [embed],
  });
}

export function getTagKey(guildId: Snowflake, tagName: string) {
  return `${guildId}:${tagName}`;
}

export function upperCaseFirstLetter(string: string) {
  if (!string) return;
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * @description Replaces all occurrences of the literal string "\n" with the newline character in the given string.
 */
export function parseNewlines(string: string) {
  return string.replace(/\\n/g, "\n");
}

export function getTagName(tagKey: string) {
  return tagKey.split(":")[1];
}

export async function uploadImgurFromBase64(base64Image: string) {
  const clientId = env.IMGUR_CLIENT_ID;
  const url = "https://api.imgur.com/3/image";

  // Strip data URI scheme if present (assuming base64 encoded image starts with data:image)
  const strippedImage = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Client-ID ${clientId}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: strippedImage,
        type: "base64",
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export function stripMotdColor(text: string) {
  // Regular expression to match the color code pattern (§ followed by any character)
  const colorCodeRegex = /§./g;

  return text.replace(colorCodeRegex, "");
}

export function flattenStringArray(array: string[] | string) {
  if (typeof array === "string") {
    return array;
  }
  return array.join("\n");
}

export async function prepModmailMessage(
  client: Client<true>,
  message: Message,
  characterLimit: number
) {
  var content = message.content;
  var attachments = message.attachments.map((attachment) => {
    return attachment.url;
  });
  var allContent = [content, attachments.length > 0 ? "\nAttachments:" : "", ...attachments].join(
    "\n"
  );

  if (!allContent && message.stickers.size !== 0) {
    await message.react("❌");
    const botmessage = await message.reply({
      content: "",
      embeds: [
        BasicEmbed(
          client,
          "Modmail Error",
          "Tried to send an empty message.\n\nStickers are not supported in modmail at this time. Sending a message with a sticker will strip the sticker and send the message without it."
        ),
      ],
    });
    deleteMessage(botmessage, 15000);
  }

  if (allContent.length > characterLimit) {
    await message.react("❌");
    const botmessage = await message.reply({
      content: "",
      embeds: [
        BasicEmbed(
          client,
          "Modmail Error",
          `Your message is too long to send. Please keep your messages under ${characterLimit} characters.\n\nThis error can also occur if you somehow managed to send a message with no content.`
        ),
      ],
    });
    deleteMessage(botmessage, 15000);
    return null;
  }
  return allContent;
}

export async function deleteMessage(message: Message, timeout = 0) {
  try {
    if (!timeout) return message.delete();
    await sleep(timeout);
    return message.delete();
  } catch (error) {
    log.error(
      `Failed to delete message: ${message.id} in ${message.channel.id} it may have already been deleted.`
    );
    log.error(error as string);
  }
}

// KOTV Stuff
export async function fetchApiReturnCharacter(name: string) {
  debugMsg(`Fetching ${name} from census API`);
  const startTime = Date.now();
  const data = await fetchApiUrl(name);
  const endTime = Date.now();
  debugMsg(`Census API took ${endTime - startTime}ms to respond`);
  if (data.returned < 1) {
    return null;
  }
  try {
    return data.character_list[0];
  } catch (error) {
    log.info("The api broke. Returning null.");
    return null;
  }
}

export async function fetchApiUrl(name: string, url?: string) {
  const defaultUrl = `https://census.daybreakgames.com/s:${
    env.CENSUS_KEY
  }/json/get/ps2:v2/character/?name.first_lower=${name.toLowerCase()}&c:join=outfit_member`;

  if (!url) url = defaultUrl;

  const response = await fetch(url);

  return response.json();
}

export async function modalTimedOutFollowUp(interaction: CommandInteraction, client: Client<true>) {
  interaction.followUp({
    content: "",
    embeds: [
      BasicEmbed(
        client,
        "Modal Timed Out",
        "Hey!\nYou took too long, slowpoke!\nThe modal you were interacting with has timed out and you forced me here. I don't like it here. It's cold and dark without your modal content to warm my heart. Try better next time yeah?"
      ),
    ],
    ephemeral: true,
  });
}

export async function pastebinUrlToJson(url: URL): Promise<JSON> {
  // Check if valid url
  if (url.hostname !== "pastebin.com" && url.hostname !== "shrt.zip") return {} as JSON;

  if (url.hostname === "shrt.zip") {
    url = replaceInUrl(url, "/u/", "/r/");
    url = replaceInUrl(url, "/code/", "/r/");

    const json = await (await fetch(url.href)).json();
    return json;
  }

  if (url.pathname.startsWith("/raw")) return await (await fetch(url.href)).json();

  return await (await fetch(`${url.origin}/raw${url.pathname}`)).json();
}

export function getValidUrl(urlString: string) {
  try {
    return new URL(urlString);
  } catch (error) {
    return null;
  }
}

export function replaceInUrl(url: URL, oldString: string, newString: string) {
  var urlString = url.toString();
  urlString = urlString.replace(oldString, newString);

  return new URL(urlString);
}

export async function fetchRealtime(planetmanId: string) {
  debugMsg("Fetching from realtime API");
  const url = `${env.REALTIME_API}/character/${planetmanId}/honu-data/`;
  debugMsg(`Fetching from ${url}`);
  const response = await fetch(url);
  debugMsg("Fetched from realtime API");
  if (response.status !== 200) {
    debugMsg("Realtime API returned non-200 status code");
    return null;
  }

  return response.json();
}

export function getTimeMessage(time: ParsedTime, id: Snowflake, ephemeral = false) {
  const buttons = ButtonWrapper([
    new ButtonBuilder()
      .setCustomId("deleteMe-" + id)
      .setLabel("Delete Me")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️"),
    new ButtonBuilder()
      .setURL("https://hammertime.cyou/en-GB?t=" + time.seconds)
      .setLabel("Edit this timestamp")
      .setStyle(ButtonStyle.Link),
  ]);

  const content = `Converted to timestamp: ⏰ <t:${time.seconds}:F>\nUsing the timezone: \`${
    time.tz
  }\`\n\nUse this in your own message: \`\`\`<t:${time.seconds}:F>\`\`\`${
    ephemeral ? "\n\nYou don't have permission to send public timestamps on other's messages." : ""
  }`;

  return { content, components: ephemeral ? [] : buttons, ephemeral };
}

export async function isStaff(member: GuildMember) {
  const getter = new ThingGetter(member.client);
  const role = await getter.getRole(member.guild, KOTV_PREACHER_ROLE);
  if (!role) {
    log.error("Failed to get KOTV Preacher role");
    return false;
  }

  return member.roles.cache.has(role.id);
}
