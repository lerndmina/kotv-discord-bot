const {
  SlashCommandBuilder,
  BaseInteraction,
  Client,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const log = require("fancy-log");
const {
  OUTFIT_ID,
  KOTV_LOG_CHANNEL,
  setCommandCooldown,
  getCommandCooldown,
  KOTV_VOID_SERVANT_ROLE,
  KOTV_GUEST_ROLE,
} = require("../../Bot");
const BasicEmbed = require("../../utils/BasicEmbed");
const { channel } = require("diagnostics_channel");
const ButtonWrapper = require("../../utils/ButtonWrapper");
const COMMAND_NAME = "post-vs-message";

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("lookup a character with the daybreak census api")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to post the message in")
        .setRequired(true)
    ),
  options: {
    devOnly: true,
    deleted: false,
    guildOnly: true,
    botPermissions: ["ManageRoles"],
  },
  /**
   *
   * @param {BaseInteraction} interaction
   * @param {Client} client
   */
  run: async ({ interaction, client, handler }) => {
    /**
     * @type {import("discord.js").GuildTextChannelType}
     */
    const channel = interaction.options.getChannel("channel");

    const buttons = [
      new ButtonBuilder()
        .setCustomId("kotv-link")
        .setLabel("Link Accounts")
        .setStyle(ButtonStyle.Primary),
    ];

    const embed = BasicEmbed(
      client,
      "Get your role!",
      `Hello recruit! Click the button below and link your planetside 2 account if you are in KOTV you will be given the role of <@&${KOTV_VOID_SERVANT_ROLE}> role.\n\nGuests are welcome too! If you are a guest, link your account and you will be given the <@&${KOTV_GUEST_ROLE}> role.`
    );

    channel.send({ embeds: [embed], components: ButtonWrapper(buttons) });

    interaction.reply({
      embeds: [BasicEmbed(client, "Success!", "Message sent!")],
      ephemeral: true,
    });
  },
};
