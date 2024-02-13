import { CommandOptions, SlashCommandProps } from "commandkit";
import { EmbedField, SlashCommandBuilder } from "discord.js";
import BasicEmbed from "../../utils/BasicEmbed";
import { globalCooldownKey, setCommandCooldown } from "../../Bot";
import { log } from "itsasht-logger";

const COMMAND_NAME = "population";

export const data = new SlashCommandBuilder()
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
  );

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
};
function getKeyByValue(object: any, value: any) {
  return Object.keys(object).find((key) => object[key] === value);
}

export async function run({ interaction, client, handler }: SlashCommandProps) {
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
    await interaction.reply({
      embeds: [
        BasicEmbed(
          client,
          "Population Info",
          "You must select at least one server to get the population for.",
          undefined,
          "Red"
        ),
      ],
      ephemeral: true,
    });
    return;
  }

  // Set cooldown now that we are about to start doing work
  setCommandCooldown(globalCooldownKey(COOLDOWN_ID), 10);

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

  await interaction.reply({
    embeds: [
      BasicEmbed(
        client,
        "Fetching Data",
        `Fetching population data for ${requestingForString}...`,
        undefined,
        "Yellow"
      ),
    ],
    ephemeral: false,
  });

  const url = "https://ps2.fisu.pw/api/population/?world=" + serverNumList;

  log.info(
    `${interaction.user.username} is fetching ${requestingForString} population data from fisu...`
  );

  const startTime = Date.now();
  const response = await fetch(url);
  const endTime = Date.now();
  const timeTaken = endTime - startTime;
  log.info(`Api took: ${timeTaken}ms to respond`);

  // If non 200 status code
  if (response.status !== 200) {
    log.info(`API returned non-200 status code: ${response.status}`);
    return interaction.editReply({
      embeds: [
        BasicEmbed(
          client,
          "API Error",
          "The API returned a non-200 status code. This means it's probably down. Try again later.",
          undefined,
          "Red"
        ),
      ],
    });
  }

  const data = await response.json();
  var result = data.result;
  var totalPlayers = 0;

  // When the api returns only one server, it returns it as an array
  // We need an object for the for in loop below
  if (Array.isArray(result)) {
    result = { 1: result };
  }

  var fields: EmbedField[] = [];

  for (const key in result) {
    result[key].forEach((i: any) => {
      const total = i.vs + i.nc + i.tr + i.ns;
      totalPlayers += total;
      const world = getKeyByValue(serverNumObj, i.worldId);

      const percentNC = ((i.nc / total) * 100).toFixed(0);
      const percentVS = ((i.vs / total) * 100).toFixed(0);
      const percentTR = ((i.tr / total) * 100).toFixed(0);
      const percentNS = ((i.ns / total) * 100).toFixed(0);

      fields.push({
        name: `${world} has \`${total}\` players online.`,
        value: `<:vanu:813469839485960222> VS: \`${i.vs}\` ${percentVS}%\n<:nc:813469147010170900> NC: \`${i.nc}\` ${percentNC}%\n<:tr:813469583515189259> TR: \`${i.tr}\` ${percentTR}%\n<:NSO:1165020512292978709> NSO: \`${i.ns}\` ${percentNS}%\n`,
        inline: true,
      });
    });
  }

  await interaction.editReply({
    embeds: [
      BasicEmbed(
        client,
        "Population Info",
        `Your request returned \`${totalPlayers}\` players\nThe below data was taken from [Fisu](https://ps2.fisu.pw/)`,
        fields
      ),
    ],
  });
}
