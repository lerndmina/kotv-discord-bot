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
      "Become a Void Servant!",
      "Hello recruit! Click the button below and link your planetside 2 account to become a Void Servant! Welcome to the void."
    );

    channel.send({ embeds: [embed], components: ButtonWrapper(buttons) });

    interaction.reply({
      embeds: [BasicEmbed(client, "Success!", "Message sent!")],
      ephemeral: true,
    });
  },
};
