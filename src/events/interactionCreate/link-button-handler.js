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
  fetchRealtime,
} = require("../../Bot");
const BasicEmbed = require("../../utils/BasicEmbed");
const { env } = require("process");
const { debugMsg } = require("../../utils/debugMsg");
const FetchEnvs = require("../../utils/FetchEnvs")();

const INTERACTION_LINK_USER = "kotv-link";
const INTERACTION_LINK_GUEST = "kotv-link-guest";

/**
 * @param {BaseInteraction} interaction
 * @param {Client} client
 */
module.exports = async (interaction, client) => {
  if (
    interaction.customId == INTERACTION_LINK_USER ||
    interaction.customId == INTERACTION_LINK_GUEST
  ) {
    try {
      if (getCommandCooldown().get("link") > Date.now()) {
        // <t:${Math.floor(getCommandCooldown().get("link") / 1000)}:R>.
        await interaction.reply({
          content: `This command has a rate limit, you will be able to use this command again in 5 seconds.`,
          ephemeral: true,
        });
        return;
      }
      await handleLinkInteraction(interaction, client);
    } catch (error) {
      log.error(error);
      await interaction.user.send({
        content: `An error occured while processing your request. I have notified a developer. You do not need to do anything else. You can try again later if you wish.`,
      });
      await client.channels.fetch(KOTV_LOG_CHANNEL).then((channel) => {
        channel.send({
          content: `ALERT <@${FetchEnvs.OWNER_IDS[0]}> !!!`,
          embeds: [
            BasicEmbed(
              client,
              "Error!",
              `An error occured while processing a link request for user ${interaction.user.username} \`${interaction.user.id}\`\n\`\`\`${error}\`\`\``
            ),
          ],
        });
      });
    }
  }
};

/**
 * @param {Client} client
 * @param {ButtonInteraction} interaction
 */
async function handleLinkInteraction(interaction, client) {
  const user = await linkUser.findOne({ discordId: interaction.user.id });
  const MODAL_ID = "kotv-link-modal" + "-" + interaction.user.id + "-" + Date.now();
  const MODAL_INPUT = MODAL_ID + "-input";

  var alreadyLinkedMsg;

  if (user) {
    alreadyLinkedMsg = `\n\nYou were previously already linked to a character, this has been updated to your new character.`;

    if (!user.isInKOTV) {
      await interaction.reply({
        embeds: [
          BasicEmbed(
            client,
            "Manual Intervention Required",
            `Upgrading from Guest to Void Servant is not currently supported. Please contact <@${FetchEnvs.OWNER_IDS[0]}> to get your role updated.`
          ),
        ],
        ephemeral: true,
      });
      // stop the function
      return;
    }
  } else {
    alreadyLinkedMsg = "";
  }

  const modal = new ModalBuilder().setCustomId(MODAL_ID).setTitle("Link your account");

  const guildMember = interaction.guild.members.cache.get(interaction.user.id);

  var placeholderName;
  if (guildMember.nickname) {
    placeholderName = guildMember.nickname;
  } else {
    placeholderName = interaction.user.username.toLowerCase().replace(/\./g, "");
  }
  const languageInput = new TextInputBuilder()
    .setCustomId(MODAL_INPUT)
    .setLabel("Enter your character name")
    .setMinLength(1)
    .setMaxLength(50)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(placeholderName);

  const actionRow = new ActionRowBuilder().addComponents(languageInput);

  modal.addComponents(actionRow);

  // This is an interaction reply
  await interaction.showModal(modal);

  const filter = (interaction) => interaction.customId == MODAL_ID;

  /**
   * @param {ModalSubmitInteraction} i
   */

  //! Collect interaction
  await interaction
    .awaitModalSubmit({ filter: filter, time: 300_000 })
    .then(async (i) => {
      await i.reply({
        content:
          "Processing... If this is taking longer than 30 seconds, dismiss the message and try again later.",
        ephemeral: true,
      });
      const name = i.fields.getTextInputValue(MODAL_INPUT).toLowerCase();

      const matcher = /^\w+$/;

      if (!matcher.test(name)) {
        await i.editReply({
          content: `Character name \`${name}\` is invalid! Please try again.`,
          ephemeral: true,
        });
        return;
      }

      log(`Got modal submit interaction for user ${i.user.username} with value ${name}`);

      const isCharacterLinkedToSomeone = await linkUser.findOne({ ps2Name: name });

      if (isCharacterLinkedToSomeone && isCharacterLinkedToSomeone.discordId != i.user.id) {
        await i.editReply({
          content: `Character ${name} is already linked to someone else! You can't link a character that is already linked. Please contact <@${FetchEnvs.OWNER_IDS[0]}> if you own this character and someone else has linked it.`,
          ephemeral: true,
        });
        return;
      } else if (isCharacterLinkedToSomeone && isCharacterLinkedToSomeone.discordId == i.user.id) {
        await i.editReply({
          content: `Character ${name} is already linked to you! You can't link a character that is already linked to you.`,
          ephemeral: true,
        });
        return;
      }

      setCommandCooldown(getCommandCooldown().set("link", Date.now() + 5_000));

      // Collect all data for use later
      debugMsg(`Fetching data from census API`);
      const startTime = Date.now();
      const data = await fetchAPlanetman(name);
      const endTime = Date.now();
      debugMsg(`Census API took ${endTime - startTime}ms to respond`);

      // The api nicely tells us how many objects were returned
      if (data.returned == 0) {
        await i.editReply({
          content: `Character ${name} does not exist!`,
          ephemeral: true,
        });
        return;
      }

      var character;
      if (data.character_list[0]) {
        character = data.character_list[0];
      } else {
        debugMsg(`Census API returned malformed data. Operation aborted.`);
        return i.editReply({
          content: `Census API returned malformed data. Please try again later.`,
          ephemeral: true,
        });
      }
      const id = character.character_id;
      const fetchedNamePretty = character.name.first;
      var lastLogin;
      var realtimeData;
      realtimeData = await fetchRealtime(id);
      if (realtimeData) {
        lastLogin = Math.floor(Date.parse(realtimeData.lastLogin) / 1000);

        debugMsg(`Request for realtime data succeeded. ${name} ${id}`);
      } else {
        lastLogin = Math.floor(Date.parse(character.times.last_login_date) / 1000);
        debugMsg(`Request for realtime data failed, using census data instead. ${name} ${id}`);
      }

      debugMsg(`Last login: ${lastLogin}`);

      var isInKOTV;
      if (character.character_id_join_outfit_member) {
        isInKOTV = character.character_id_join_outfit_member.outfit_id === OUTFIT_ID;
      } else {
        isInKOTV = false;
      }

      var rank;
      const guestRole = i.guild.roles.cache.get(KOTV_GUEST_ROLE);
      const voidServantRole = i.guild.roles.cache.get(KOTV_VOID_SERVANT_ROLE);
      const guildMember = i.guild.members.cache.get(i.user.id);

      // User has not logged in within the last 24 hours
      const lastLoginDate = lastLogin * 1000;
      const now = new Date().getTime();

      const minsSinceLastLogin = Math.floor((now - lastLoginDate) / 1000 / 60);

      debugMsg(`Mins since last login: ${minsSinceLastLogin}`);

      if (minsSinceLastLogin > 60) {
        // 10 mins from now in seconds
        const time = Math.floor((now + 600_000) / 1000);

        await i.editReply({
          content: "",
          embeds: [
            BasicEmbed(
              client,
              "Failed!",
              `Character \`${fetchedNamePretty}\` last logged in <t:${lastLogin}:R>\n You must have been online within the last hour to link your account. Please log in and try again.`,
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
              `Character \`${fetchedNamePretty}\` is not in KOTV!\nYou will be assigned a guest role.\nWelcome Guest!${alreadyLinkedMsg}`
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
                `Planetside character \`${fetchedNamePretty}\` \`${id}\` is not in KOTV!\n\nThey have been added to the database.`
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
            `Linked account \`${fetchedNamePretty}\` to discord user <@${i.user.id}>. Your role has been applied\nWelcome to the void!${alreadyLinkedMsg}`
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
              `Planetside character \`${fetchedNamePretty}\` \`${id}\` is in KOTV! And has been linked with discord user <@${interaction.user.id}> \`${interaction.user.id}\` \n Last login: <t:${lastLogin}:R>\n\`\`\`json\n${characterJson}\`\`\``
            ),
          ],
        });
      });
    })
    .catch(async (error) => {
      log.error(
        `Modal interaction timed out for user ${interaction.user.username}, Census probably timed out.`
      );
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

    log.info(`Saved user ${name} to database`);

    return true;
  } catch (error) {
    log.error(error);
    return false;
  }
}
