const { SlashCommandBuilder } = require("discord.js");
const log = require("fancy-log");
const fetchAPIReturnCharacter = require("../../utils/fetchAPIReturnCharacter");
const linkUserSchema = require("../../models/linkUserSchema");
const { debugMsg } = require("../../utils/debugMsg");
const BasicEmbed = require("../../utils/BasicEmbed");
const {
  OUTFIT_ID,
  getCommandCooldown,
  setCommandCooldown,
  addCommandCooldown,
} = require("../../Bot");
const COMMAND_NAME = "population";

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("Get the current miller world pop from fisu"),
  options: {
    devOnly: false,
    deleted: false,
    guildOnly: true,
  },
  run: async ({ interaction, client, handler }) => {
    const COOLDOWN_ID = `${COMMAND_NAME}${interaction.user.id}`;

    addCommandCooldown(COOLDOWN_ID, 10_000);
    await interaction.reply({
      embeds: [
        BasicEmbed(
          client,
          "Population Info",
          "This shouldn't take longer than 5 seconds. If it does, the API is probably down.",
          "Yellow"
        ),
      ],
      ephemeral: false,
    });
    const response = await fetch("https://ps2.fisu.pw/api/population/?world=10");

    // If non 200 status code
    if (response.status !== 200) {
      log(`API returned non-200 status code: ${response.status}`);
      return interaction.editReply({
        embeds: [
          BasicEmbed(
            client,
            "API Error",
            "The API returned a non-200 status code. This means it's probably down. Try again later.",
            "Red"
          ),
        ],
        ephemeral: true,
      });
    }

    const data = await response.json();
    const pop = data.result[0];

    await interaction.editReply({
      embeds: [
        BasicEmbed(
          client,
          "Population Info",
          `Miller has \`${
            pop.vs + pop.nc + pop.tr + pop.ns
          }\` players online.\n<:vanu:813469839485960222> VS: \`${
            pop.vs
          }\` - <:nc:813469147010170900> NC: \`${pop.nc}\` - <:tr:813469583515189259> TR: \`${
            pop.tr
          }\` - NS: \`${
            pop.ns
          }\`\n\nThis data is from [Fisu](https://ps2.fisu.pw/population/?world=10)`
        ),
      ],
    });
  },
};
