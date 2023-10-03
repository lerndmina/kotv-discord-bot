const { Client, EmbedBuilder, Embed } = require("discord.js");
const { BOT_MESSAGES, BOT_URL } = require("../Bot");

/**
 *
 * @param {Client} client
 * @param {string} title
 * @param {string} description
 * @param {[{name: string, value: string, inline: boolean}]} fields
 * @param {string} color
 * @returns
 */

module.exports = (client, title, description, fields, color) => {
  if (color == undefined) color = "#de3b79";
  // if fields is a string,
  // then it's the color
  if (typeof fields === "string") {
    color = fields;
    fields = [];
  }

  if (description == "*") description = "‎"; // invisible character

  if (!color.includes("#")) {
    // Uppercase first letter and lowercase the rest to comply with EmbedBuilder
    color = color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
  }

  var embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setAuthor({
      name: client.user.username,
      iconURL: client.user.avatarURL(),
      url: BOT_URL,
    })
    .setTimestamp(Date.now())
    .setFooter({ text: BOT_MESSAGES[Math.floor(Math.random() * BOT_MESSAGES.length)] });

  if (fields != undefined) {
    fields.forEach((field) => {
      embed.addFields(field);
    });
  }

  return embed;
};
