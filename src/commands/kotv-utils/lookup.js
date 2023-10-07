const { SlashCommandBuilder, CommandInteraction, User } = require("discord.js");
const log = require("fancy-log");
const BasicEmbed = require("../../utils/BasicEmbed");
const linkUserSchema = require("../../models/linkUserSchema");
const { client } = require("tenorjs");
const COMMAND_NAME = "lookup";

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("lookup a character with the daybreak census api")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to lookup").setRequired(true)
    ),
  options: {
    devOnly: false,
    deleted: false,
    guildOnly: true,
  },
  run: async ({ interaction, client, handler }) => {
    // TODO: Make this use the database instead of the API

    /** @type {User} */
    const user = interaction.options.getUser("user");

    await interaction.reply({
      embeds: [
        BasicEmbed(
          client,
          "<a:waiting:1160317632420003900> Fetching data",
          `Feching data for user <@${user.id}>`
        ),
      ],
      ephemeral: true,
    });
    await handleUserLookup(interaction, user);
  },
};

/**
 *
 * @param {CommandInteraction} interaction
 * @param {User} user
 */
async function handleUserLookup(interaction, user) {
  const fetchedUser = await linkUserSchema.findOne({ discordId: user.id });

  if (!fetchedUser) {
    return interaction.editReply({
      embeds: [
        BasicEmbed(
          interaction.client,
          "User not found",
          `User <@${user.id}> \`${user.id}\` is not linked to a Planetside 2 character.`
        ),
      ],
      ephemeral: true,
    });
  }

  return interaction.editReply({
    embeds: [
      BasicEmbed(
        interaction.client,
        "User found",
        `User <@${user.id}> \`${user.id}\` is linked to a Planetside 2 character.`,
        [
          { name: "Character", value: `\`${fetchedUser.ps2Name}\``, inline: false },
          { name: "Character ID", value: `\`${fetchedUser.ps2Id}\``, inline: false },
          { name: "Is in KOTV", value: `\`${fetchedUser.isInKOTV}\``, inline: false },
          { name: "KOTV Rank", value: `\`${fetchedUser.kotvRank}\``, inline: false },
        ]
      ),
    ],
  });
}
