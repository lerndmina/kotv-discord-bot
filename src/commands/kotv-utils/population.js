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
    .setDescription("Get the current miller world pop from fisu")
    .addBooleanOption((option) =>
      option.setName("miller").setDescription("Get population for Miller")
    )
    .addBooleanOption((option) =>
      option.setName("cobalt").setDescription("Get population for Cobalt")
    )
    .addBooleanOption((option) =>
      option.setName("emerald").setDescription("Get population for Emerald")
    )
    .addBooleanOption((option) =>
      option.setName("connery").setDescription("Get population for Connery")
    )
    .addBooleanOption((option) =>
      option.setName("soltech").setDescription("Get population for SolTech")
    ),
  options: {
    devOnly: false,
    deleted: false,
    guildOnly: true,
  },
  run: async ({ interaction, client, handler }) => {
    const COOLDOWN_ID = `${COMMAND_NAME}`;
    const serverNumObj = {
      Miller: 10,
      Cobalt: 13,
      Emerald: 17,
      Connery: 1,
      SolTech: 40,
    };

    var serverNumList;
    var requestingForString;

    const millerOption = interaction.options.getBoolean("miller");
    const cobaltOption = interaction.options.getBoolean("cobalt");
    const emeraldOption = interaction.options.getBoolean("emerald");
    const conneryOption = interaction.options.getBoolean("connery");
    const solTechOption = interaction.options.getBoolean("soltech");

    if (!millerOption && !cobaltOption && !emeraldOption && !conneryOption && !solTechOption) {
      interaction.reply({
        embeds: [
          BasicEmbed(
            client,
            "Population Info",
            "You must select at least one server to get the population for.",
            "Red"
          ),
        ],
        ephemeral: true,
      });
    }

    if (millerOption) {
      serverNumList = `${serverNumObj.Miller}`;
      requestingForString = "Miller";
    }
    if (cobaltOption) {
      if (serverNumList) {
        requestingForString += ", Cobalt";
        serverNumList = `${serverNumList},${serverNumObj.Cobalt}`;
      } else {
        requestingForString += "Cobalt";
        serverNumList = `${serverNumObj.Cobalt}`;
      }
    }
    if (emeraldOption) {
      if (serverNumList) {
        requestingForString += ", Emerald";
        serverNumList = `${serverNumList},${serverNumObj.Emerald}`;
      } else {
        requestingForString += "Emerald";
        serverNumList = `${serverNumObj.Emerald}`;
      }
    }
    if (conneryOption) {
      if (serverNumList) {
        requestingForString += ", Connery";
        serverNumList = `${serverNumList},${serverNumObj.Connery}`;
      } else {
        requestingForString += "Connery";
        serverNumList = `${serverNumObj.Connery}`;
      }
    }
    if (solTechOption) {
      if (serverNumList) {
        requestingForString += ", SolTech";
        serverNumList = `${serverNumList},${serverNumObj.SolTech}`;
      } else {
        requestingForString += "SolTech";
        serverNumList = `${serverNumObj.SolTech}`;
      }
    }

    addCommandCooldown(COOLDOWN_ID, 10_000);
    await interaction.reply({
      embeds: [
        BasicEmbed(
          client,
          "Fetching Data",
          `Fetching population data for ${requestingForString}...`,
          "Yellow"
        ),
      ],
      ephemeral: false,
    });

    const url = "https://ps2.fisu.pw/api/population/?world=" + serverNumList;

    log(
      `${interaction.user.username} is fetching ${requestingForString} population data from fisu...}`
    );

    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    const timeTaken = endTime - startTime;
    log(`Api took: ${timeTaken}ms to respond`);

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
    var result = data.result;
    var totalPlayers = 0;

    if (Array.isArray(result)) {
      // obj1 is an array, add to obj2
      result = { 1: result };
    }

    var finalMsg = "";

    for (const key in result) {
      result[key].forEach((i) => {
        const total = i.vs + i.nc + i.tr + i.ns;
        totalPlayers += total;
        const world = getKeyByValue(serverNumObj, i.worldId);

        const percentNC = ((i.nc / total) * 100).toFixed(0);
        const percentVS = ((i.vs / total) * 100).toFixed(0);
        const percentTR = ((i.tr / total) * 100).toFixed(0);
        const percentNS = ((i.ns / total) * 100).toFixed(0);

        finalMsg += `${world} has \`${total}\` players online.
        <:vanu:813469839485960222> VS: \`${i.vs}\` ${percentVS}%
        <:nc:813469147010170900> NC: \`${i.nc}\` ${percentNC}%
        <:tr:813469583515189259> TR: \`${i.tr}\` ${percentTR}%
        <:NSO:1165020512292978709> NSO: \`${i.ns}\` ${percentNS}%\n\n`;
      });
    }

    finalMsg += `\nYour request returned \`${totalPlayers}\` players.\nThis data is from [Fisu](https://ps2.fisu.pw/population/?world=${serverNumList})`;

    await interaction.editReply({
      embeds: [BasicEmbed(client, "Population Info", finalMsg)],
    });
  },
};

function getKeyByValue(object, value) {
  return Object.keys(object).find((key) => object[key] === value);
}
