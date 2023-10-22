const { SlashCommandBuilder, Role, Guild } = require("discord.js");
const log = require("fancy-log");
const { debugMsg } = require("../../utils/debugMsg");
const BasicEmbed = require("../../utils/BasicEmbed");
const { KOTV_PROMOTEME_ROLE } = require("../../Bot");
const COMMAND_NAME = "require-promotion";

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("Get users who have the promoteme role and have not been promoted yet."),
  options: {
    devOnly: true,
    deleted: false,
    guildOnly: true,
  },
  run: async ({ interaction, client, handler }) => {
    /**
     * @type {Guild}
     */
    const guild = interaction.guild;

    /**
     * @type {Role}
     */
    const role = guild.roles.cache.get(KOTV_PROMOTEME_ROLE);
    const members = role.members;

    var fields = [];

    members.forEach((member) => {
      fields.push({
        name: member.user.username,
        value: `<@${member.user.id}>`,
        inline: true,
      });
    });

    const embed = BasicEmbed(
      client,
      "Promoteme List",
      `${
        fields.length > 0
          ? `Here are the users who have the <@&${KOTV_PROMOTEME_ROLE}> role.`
          : `No users found for promotion.`
      }`,
      fields.length > 0 ? fields : "Green"
    );

    interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
