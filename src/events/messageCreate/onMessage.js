const { MessageType, MessageFlags, ActivityType, Message, Client } = require("discord.js");
var log = require("fancy-log");
const syncCommands = require("../../utils/unregister-commands");
const BasicEmbed = require("../../utils/BasicEmbed");

const env = require("../../utils/FetchEnvs")();

/**
 *
 * @param {Message} message
 * @param {Client} client
 * @returns
 */
module.exports = async (message, client) => {
  if (message.author.bot) return;

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
      syncCommands(client, message, message.guildId, true);
      return true;
    }
    syncCommands(client, message, message.guildId, false);
    return true;
  }

  // Reboot command
  if (message.content.startsWith(`${env.PREFIX}reboot`)) {
    if (!env.OWNER_IDS.includes(message.author.id)) return;
    if (message.content == `${env.PREFIX}reboot hard`) {
      await message.reply({ embeds: [BasicEmbed(client, "Reboot", "Killing the process...")] });

      process.exit(0);
    }

    await message.reply({
      embeds: [BasicEmbed(client, "Reboot", "Rebooting...")],
    });
    log("Rebooting...");

    // Set offline
    client.user.setActivity("my own death.", { type: ActivityType.Watching });
    client.user.setStatus("dnd");

    // Cleanly log out of Discord
    client.destroy();

    // Log back in
    const { Start } = require("../../Bot");

    await Start();
  }
};
