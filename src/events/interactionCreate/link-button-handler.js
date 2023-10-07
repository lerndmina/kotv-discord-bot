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
  KOTV_GUEST_ROLE,
} = require("../../Bot");
const BasicEmbed = require("../../utils/BasicEmbed");
const FetchEnvs = require("../../utils/FetchEnvs")();

const INTERACTION_LINK_USER = "kotv-link";

/**
 * @param {BaseInteraction} interaction
 * @param {Client} client
 */
module.exports = async (interaction, client) => {
  if (interaction.customId == INTERACTION_LINK_USER) {
    await handleLinkInteraction(interaction, client)
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
        return true;
      });
  }
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
    await interaction.reply({
      content: `You are already linked to a planetman! \nEventually you'll be able to unlink but this is not implemented yet. Please contact <@${FetchEnvs.OWNER_IDS[0]}> if you need to change your linked character.`,
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
    await i.deferReply({ ephemeral: true });
    const name = i.fields.getTextInputValue(MODAL_INPUT).toLowerCase();

    const isCharacterLinkedToSomeone = await linkUser.findOne({ ps2Name: name });

    if (isCharacterLinkedToSomeone) {
      await i.editReply({
        content: `Character ${name} is already linked to someone else! You can't link a character that is already linked. Please contact <@${FetchEnvs.OWNER_IDS[0]}> if you own this character and someone else has linked it.`,
        ephemeral: true,
      });
      return;
    }

    setCommandCooldown(getCommandCooldown().set("link", Date.now() + 15000));

    // Collect all data for use later
    const data = await fetchAPlanetman(name);

    const character = data.character_list[0];
    const id = character.character_id;
    const fetchedName = character.name.first_lower;
    const lastLogin = character.times.last_login;
    const isInKOTV = character.character_id_join_outfit_member.outfit_id === OUTFIT_ID;
    var rank;
    const guestRole = i.guild.roles.cache.get(KOTV_GUEST_ROLE);
    const voidServantRole = i.guild.roles.cache.get(KOTV_VOID_SERVANT_ROLE);
    const guildMember = i.guild.members.cache.get(i.user.id);

    // The api nicely tells us how many objects were returned
    if (data.returned == 0) {
      await i.editReply({
        content: `Character ${name} does not exist!`,
        ephemeral: true,
      });
      return;
    }

    // User has not logged in within the last 24 hours
    const lastLoginDate = new Date(lastLogin * 1000);
    const now = new Date();
    const hoursSinceLastLogin = Math.abs(now - lastLoginDate) / 36e5;

    if (hoursSinceLastLogin > 120) {
      await i.editReply({
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

    // User is not in KOTV
    if (!isInKOTV) {
      await i.editReply({
        content: "",
        embeds: [
          BasicEmbed(
            client,
            "Success!",
            `Character \`${name}\` is not in KOTV!\nYou will be assigned a guest role.\nWelcome Guest!`
          ),
        ],
        ephemeral: true,
      });

      await guildMember.roles.add(guestRole);

      await client.channels.fetch(KOTV_LOG_CHANNEL).then((channel) => {
        channel.send({
          embeds: [
            BasicEmbed(
              client,
              "Guest role assigned!",
              `Planetside character ${fetchedName} \`${id}\` is not in KOTV!\n\nThey have been added to the database.`
            ),
          ],
        });
      });
      await saveData(name, id, isInKOTV, rank, user, i);

      return;
    }

    // User is in KOTV
    rank = character.character_id_join_outfit_member.rank;
    await guildMember.roles.add(voidServantRole);
    await saveData(name, id, isInKOTV, rank, user, i);

    await i.editReply({
      content: "",
      embeds: [
        BasicEmbed(
          client,
          "Success!",
          `Linked account \`${fetchedName}\` to discord user <@${i.user.id}>. Your role has been applied\nWelcome to the void!`
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

/**
 * @param {string} name
 * @param {string} id
 * @param {boolean} isInKOTV
 * @param {string} rank
 * @param {linkUser} user
 * @param {ModalSubmitInteraction} i
 */
async function saveData(name, id, isInKOTV, rank, user, i) {
  if (!rank) {
    rank = "Guest";
  }

  try {
    data = {
      discordId: i.user.id,
      ps2Id: id,
      ps2Name: name,
      isInKOTV: isInKOTV,
      kotvRank: rank,
    };

    if (user) {
      await linkUser.findOneAndUpdate({ discordId: i.user.id }, data);
      return true;
    }

    const link = new linkUser(data);

    await link.save();
    return true;
  } catch (error) {
    log.error(error);
    return false;
  }
}
