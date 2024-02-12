import {
  MessageType,
  MessageFlags,
  ActivityType,
  Message,
  Client,
  ChannelType,
  ThreadChannel,
} from "discord.js";
import log from "fancy-log";
import syncCommands from "../../utils/unregister-commands";
import BasicEmbed from "../../utils/BasicEmbed";
import FetchEnvs from "../../utils/FetchEnvs";
import { isVoiceMessage } from "../../utils/TinyUtils";

const env = FetchEnvs();

const BANNED_GUILDS = ["856937743543304203"];

/**
 *
 * @param {Message} message
 * @param {Client} client
 * @returns
 */
export default async function (message: Message, client: Client<true>) {
  if (message.author.bot) return;
  if (message.channel.type == ChannelType.DM) return;
  // We don't return true here because we want to continue to the next event

  // Send reactions for transcriptions
  if (isVoiceMessage(message) && message.channel! instanceof ThreadChannel) {
    if (message.reactions.cache.size > 0) return;
    message.react("✍️").then(() => message.react("❌"));
    return true; // Stop the event loop we've delt with this message
  }

  // Make message of type Message<true>
  message = message as Message<true>;
  if (message.guildId && BANNED_GUILDS.includes(message.guildId)) return;

  if (message.content.startsWith(`${env.PREFIX}embedtest`)) {
    if (!env.OWNER_IDS.includes(message.author.id)) return;

    message.reply({
      embeds: [
        BasicEmbed(
          client,
          "Title",
          "Description",
          [
            {
              name: "Fields",
              value: '```js\n[{ name: "Hello", value: "World", inline: true }]```',
              inline: true,
            },
          ],
          "Random"
        ),
      ],
    });
  }

  // Unync commmand
  if (message.content.startsWith(`${env.PREFIX}unsync`)) {
    if (!env.OWNER_IDS.includes(message.author.id)) return;
    if (message.content.includes("global")) {
      syncCommands(client, message, undefined, true);
      return true;
    } else if (message.guildId) {
      syncCommands(client, message, message.guildId, false);
      return true;
    }
  }

  // Reboot command
  if (message.content.startsWith(`${env.PREFIX}reboot`)) {
    if (!env.OWNER_IDS.includes(message.author.id)) return;
    if (message.content == `${env.PREFIX}reboot hard`) {
      await message.reply({
        content: "https://media1.tenor.com/m/8knHdqV3MTkAAAAC/king-of-the-hill-hank.gif",
      });
      process.exit(0);
    }

    await message.reply({
      content: "https://tenor.com/view/bye-bourne-gif-22698046",
    });
    log("Rebooting...");

    // Set offline
    client.user.setActivity("my own death.", { type: ActivityType.Watching });
    client.user.setStatus("dnd");

    // Cleanly log out of Discord
    client.destroy();

    // Log out of MongoDB
    const mongoose = require("mongoose");
    await mongoose.disconnect();

    // Log out of Redis
    const { redisClient } = require("../../Bot");
    await redisClient.disconnect();

    // Log back in
    const { Start } = require("../../Bot");

    await Start();
  }
}
