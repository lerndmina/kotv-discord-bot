const {
  BaseInteraction,
  Client,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
} = require("discord.js");
const log = require("fancy-log");
const linkUser = require("../../models/linkUserSchema");
const {
  getApiUrl,
  fetchAPlanetman,
  setCommandCooldown,
  OUTFIT_ID,
  KOTV_LOG_CHANNEL,
  getCommandCooldown,
  KOTV_VOID_SERVANT_ROLE,
} = require("../../Bot");
const BasicEmbed = require("../../utils/BasicEmbed");
const FetchEnvs = require("../../utils/FetchEnvs")();

const INTERACTION_LINK_USER = "kotv-link";

/**
 * @param {BaseInteraction} interaction
 * @param {Client} client
 */
module.exports = async (interaction, client) => {
  if (interaction.customId == INTERACTION_LINK_USER)
    handleLinkInteraction(interaction, client)
      .then(() => {
        return true;
      })
      .catch((err) => {
        log.error(
          "Error handling link interaction for user " +
            interaction.user.username +
            " (" +
            interaction.user.id
        );
        log.error(err);
        return false;
      });
};

/**
 * @param {Client} client
 * @param {ButtonInteraction} interaction
 */
async function handleLinkInteraction(interaction, client) {
  const user = await linkUser.findOne({ discordId: interaction.user.id });
  const MODAL_ID = "kotv-link-modal";
  const MODAL_INPUT = MODAL_ID + "-input";

  if (user) {
    interaction.reply({
      content: `You are already linked to a planetman! \nEventually you'll be able to link multiple characters but this is not implemented yet. Please contact <@${FetchEnvs.OWNER_IDS[0]}> if you need to change your linked character.`,
      ephemeral: true,
    });
    return;
  }

  // modal to get user input

  const modal = new ModalBuilder().setCustomId(MODAL_ID).setTitle("Link your account");

  const languageInput = new TextInputBuilder()
    .setCustomId(MODAL_INPUT)
    .setLabel("Enter your character name")
    .setMinLength(1)
    .setMaxLength(100)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("CrazyVoidServant");

  const actionRow = new ActionRowBuilder().addComponents(languageInput);

  modal.addComponents(actionRow);

  await interaction.showModal(modal);

  const filter = (interaction) => interaction.customId == MODAL_ID;

  /**
   * @param {ModalSubmitInteraction} i
   */
  interaction.awaitModalSubmit({ filter: filter, time: 300000 }).then(async (i) => {
    const name = i.fields.getTextInputValue(MODAL_INPUT);

    await i.reply({
      content: `Fetching data for ${name}`,
      ephemeral: true,
    });

    setCommandCooldown(getCommandCooldown().set("link", Date.now() + 10000));

    const data = await fetchAPlanetman(name);

    const character = data.character_list[0];
    const id = character.character_id;
    const fetchedName = character.name.first;
    const lastLogin = character.times.last_login;
    const isInKOTV = character.character_id_join_outfit_member.outfit_id === OUTFIT_ID;

    if (data.returned == 0) {
      i.editReply({
        content: `Character ${name} does not exist!`,
        ephemeral: true,
      });
      return;
    }

    if (!isInKOTV) {
      i.editReply({
        content: "",
        embeds: [
          BasicEmbed(
            client,
            "Success!",
            `Character ${name} is not in KOTV!\nYou will be assigned a guest role.\n\n**NOT IMPLEMENTED YET, NO CHANGES HAVE BEEN MADE**`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const lastLoginDate = new Date(lastLogin * 1000);
    const now = new Date();
    const hoursSinceLastLogin = Math.abs(now - lastLoginDate) / 36e5;

    if (hoursSinceLastLogin > 24) {
      i.editReply({
        content: "",
        embeds: [
          BasicEmbed(
            client,
            "Failed!",
            `Character ${name} last logged in <t:${lastLogin}:R>\nPlease log into your Planetside2 character, wait a few minutes, and try again. You must have been online within the last 24 hours to link your account.`,
            "Red"
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const link = new linkUser({
      discordId: i.user.id,
      planetmen: [{ name: fetchedName, characterId: id, outfitId: OUTFIT_ID, inOutfit: isInKOTV }],
    });

    await link.save();

    i.guild.roles
      .fetch(KOTV_VOID_SERVANT_ROLE)
      .then((role) => {
        i.member.roles.add(role);
      })
      .catch((err) => {
        log.error(
          `Error adding role ${KOTV_VOID_SERVANT_ROLE} to user ${i.user.username} (${i.user.id})`
        );
        log.error(err);

        i.editReply({
          content: "",
          embeds: [
            BasicEmbed(
              client,
              "Error!",
              `Character ${name} was linked, but there was an error adding you to the void servant role. Please contact <@${FetchEnvs.OWNER_IDS[0]}>`,
              "Red"
            ),
          ],
          ephemeral: true,
        });
      });

    i.editReply({
      content: "",
      embeds: [
        BasicEmbed(
          client,
          "Success!",
          `Linked account ${fetchedName} to discord user <@${i.user.id}> \`${i.user.id}\`\nWelcome to the void!`
        ),
      ],
    });

    await client.channels.fetch(KOTV_LOG_CHANNEL).then((channel) => {
      const characterJson = JSON.stringify(character, null, 2);

      channel.send({
        embeds: [
          BasicEmbed(
            client,
            "We've got a live one!",
            `Planetside character ${fetchedName} \`${id}\` is in KOTV! And has been linked with discord user <@${interaction.user.id}> \`${interaction.user.id}\` \n Last login: <t:${lastLogin}:R>\n\`\`\`json\n${characterJson}\`\`\``
          ),
        ],
      });
    });
  });
}
