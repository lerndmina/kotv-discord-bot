const {
  SlashCommandBuilder,
  EmbedBuilder,
  BaseInteraction,
  Client,
  AttachmentBuilder,
} = require("discord.js");
const log = require("fancy-log");
const {
  OUTFIT_ID,
  KOTV_LOG_CHANNEL,
  setCommandCooldown,
  getCommandCooldown,
} = require("../../Bot");
const BasicEmbed = require("../../utils/BasicEmbed");
const COMMAND_NAME = "lookup";

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription("lookup a character with the daybreak census api")
    .addStringOption((option) =>
      option.setName("name").setDescription("The name of the character to lookup").setRequired(true)
    ),
  options: {
    devOnly: true,
    deleted: false,
  },
  run: async ({ interaction, client, handler }) => {
    const ps2Name = interaction.options.getString("name");

    const url = `https://census.daybreakgames.com/s:example/json/get/ps2:v2/character/?name.first_lower=${ps2Name.toLowerCase()}&c:join=outfit_member`;

    const message = await interaction.reply({
      embeds: [BasicEmbed(client, "fetching data", "Feching data for user " + ps2Name)],
      ephemeral: true,
    });

    const response = await fetch(url);

    setCommandCooldown(getCommandCooldown().set(COMMAND_NAME, Date.now() + 10000));

    handleApiResponse(interaction, client, response, ps2Name, message);
  },
};

/**
 * @param {BaseInteraction} interaction
 * @param {Client} client
 * @param {any} response
 * @param {string} ps2Name
 */
async function handleApiResponse(interaction, client, response, ps2Name, message) {
  const data = await response.json();

  const characterExists = data.returned > 0;

  if (!characterExists) {
    interaction.editReply({ content: `Character ${ps2Name} does not exist!`, ephemeral: true });
    return;
  }

  const character = data.character_list[0];
  const id = character.character_id;
  const name = character.name.first;
  const lastLogin = character.times.last_login;
  const isInKOTV = character.character_id_join_outfit_member.outfit_id === OUTFIT_ID;

  log(`Details about ${name} (${id}): lastLogin = ${lastLogin}, isInKOTV = ${isInKOTV}`);

  interaction.editReply({
    embeds: [BasicEmbed(client, name, `Last login: <t:${lastLogin}:R>\nIs in KOTV: ${isInKOTV}`)],
  });

  if (!isInKOTV) return;

  await client.channels.fetch(KOTV_LOG_CHANNEL).then((channel) => {
    const characterJson = JSON.stringify(character, null, 2);

    channel.send({
      embeds: [
        BasicEmbed(
          client,
          "We've got a live one!",
          `Planetside character ${name} \`${id}\` is in KOTV! And will be linked with discord user <@${interaction.user.id}> \`${interaction.user.id}\` \n Last login: <t:${lastLogin}:R>\n\`\`\`json\n${characterJson}\`\`\``
        ),
      ],
    });
  });
}
