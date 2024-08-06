import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageComponentInteraction,
  Client,
  TextChannel,
  ModalSubmitInteraction,
  BaseGuildTextChannel,
  TextBasedChannel,
  User,
} from "discord.js";
import { log } from "itsasht-logger";
import linkUser from "../../models/linkUserSchema";
import {
  setCommandCooldown,
  OUTFIT_ID,
  KOTV_LOG_CHANNEL,
  KOTV_VOID_SERVANT_ROLE,
  KOTV_GUEST_ROLE,
} from "../../Bot";
import BasicEmbed from "../../utils/BasicEmbed";
import { fetchRealtime, fetchApiUrl, debugMsg, ThingGetter } from "../../utils/TinyUtils";

import FetchEnvs from "../../utils/FetchEnvs";
import Database from "../../utils/data/database";
import CensusStatus, { CensusStatusType } from "../../models/CensusStatus";
const env = FetchEnvs();
const db = new Database();

const INTERACTION_LINK_USER = "kotv-link";
const INTERACTION_LINK_GUEST = "kotv-link-guest";

/**
 * @param {BaseInteraction} interaction
 * @param {Client} client
 */
export default async (interaction: MessageComponentInteraction, client: Client<true>) => {
  if (
    interaction.customId == INTERACTION_LINK_USER ||
    interaction.customId == INTERACTION_LINK_GUEST
  ) {
    try {
      const censusStatusData = (await db.findOne(CensusStatus, { id: 1 })) as CensusStatusType;
      if (censusStatusData?.isOffline) {
        interaction.reply({
          content:
            "The bot has detected that the census API is offline. Please try again later, please notify a preacher if you think this is a mistake.",
          ephemeral: true,
        });
        return;
      }
      await handleLinkInteraction(interaction, client);
    } catch (error) {
      console.error(error);
      await interaction.user.send({
        content: `An error occured while processing your request. I have notified a developer. You do not need to do anything else. You can try again later if you wish.`,
      });
      await client.channels.fetch(KOTV_LOG_CHANNEL).then((chnl) => {
        if (!chnl?.isTextBased) return log.error(`Could not find channel ${KOTV_LOG_CHANNEL}`);
        const channel = chnl as TextChannel;
        channel.send({
          content: `ALERT <@${env.OWNER_IDS[0]}> !!!`,
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
async function handleLinkInteraction(
  interaction: MessageComponentInteraction,
  client: Client<true>
) {
  const getter = new ThingGetter(client);
  const user = await linkUser.findOne({ discordId: interaction.user.id });
  const MODAL_ID = "kotv-link-modal" + "-" + interaction.user.id + "-" + Date.now();
  const MODAL_INPUT = MODAL_ID + "-input";

  var alreadyLinkedMsg = "";

  if (user) {
    alreadyLinkedMsg = `\n\nYou were previously already linked to a character, this has been updated to your new character.`;

    if (!user.isInKOTV) {
      await interaction.reply({
        embeds: [
          BasicEmbed(
            client,
            "Manual Intervention Required",
            `Upgrading from Guest to Void Servant is not currently supported. Please contact <@${env.OWNER_IDS[0]}> to get your role updated.`
          ),
        ],
        ephemeral: true,
      });
      // stop the function
      return;
    }
  }

  const modal = new ModalBuilder().setCustomId(MODAL_ID).setTitle("Link your account");

  if (!interaction.guildId)
    return log.error(
      "FATAL: This interaction does not have a guildId, this should never happen. " +
        `User: ${interaction.user.username} ${interaction.user.id}`
    );
  const guild = await getter.getGuild(interaction.guildId);
  if (!guild) throw new Error("Guild not found while processing link interaction.");
  const guildMember = await getter.getMember(guild, interaction.user.id);
  if (!guildMember) throw new Error("Guild member not found while processing link interaction.");

  var placeholderName: string;
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

  modal.addComponents(actionRow as any);

  // This is an interaction reply
  await interaction.showModal(modal);

  const filter = (interaction: ModalSubmitInteraction) => interaction.customId == MODAL_ID;

  //! Collect interaction
  await interaction
    .awaitModalSubmit({ filter: filter, time: 300_000 })
    .then(async (i: ModalSubmitInteraction) => {
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
        });
        return;
      }

      log.info(`Got modal submit interaction for user ${i.user.username} with value ${name}`);

      const isCharacterLinkedToSomeone = await linkUser.findOne({ ps2Name: name });

      if (isCharacterLinkedToSomeone && isCharacterLinkedToSomeone.discordId != i.user.id) {
        await i.editReply({
          content: `Character ${name} is already linked to someone else! You can't link a character that is already linked. Please contact <@${env.OWNER_IDS[0]}> if you own this character and someone else has linked it.`,
        });
        return;
      } else if (isCharacterLinkedToSomeone && isCharacterLinkedToSomeone.discordId == i.user.id) {
        await i.editReply({
          content: `Character ${name} is already linked to you! You can't link a character that is already linked to you.`,
        });
        return;
      }

      // setCommandCooldown(getCommandCooldown().set("link", Date.now() + 5_000));
      // TODO: add cooldowns using redis

      // Collect all data for use later
      debugMsg(`Fetching data from census API`);
      const startTime = Date.now();
      const data = await fetchApiUrl(name);
      const endTime = Date.now();
      debugMsg(`Census API took ${endTime - startTime}ms to respond`);

      // The api nicely tells us how many objects were returned
      if (data.returned == 0) {
        await i.editReply({
          content: `Character ${name} does not exist!`,
        });
        return;
      }

      var character: any;
      if (data.character_list[0]) {
        character = data.character_list[0];
      } else {
        debugMsg(`Census API returned malformed data. Operation aborted.`);
        return i.editReply({
          content: `Census API returned malformed data. Please try again later.`,
        });
      }
      const id = character.character_id;
      const fetchedNamePretty = character.name.first;
      var lastLogin: number;
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

      if (!i.guild)
        return log.error(
          "FATAL: This interaction does not have a guild, this should never happen. " +
            `User: ${i.user.username} ${i.user.id}`
        );

      const guestRole = i.guild.roles.cache.get(KOTV_GUEST_ROLE);
      if (!guestRole) {
        // This should never happen, but I want to make typescript happy
        log.error(`Could not find guest role in the guild! ${i.guild.name} ${KOTV_GUEST_ROLE} `);
        return;
      }

      const voidServantRole = i.guild.roles.cache.get(KOTV_VOID_SERVANT_ROLE);
      if (!voidServantRole) {
        // This should never happen, but I want to make typescript happy
        log.error(
          `Could not find void servant role in the guild! ${i.guild.name} ${KOTV_VOID_SERVANT_ROLE} `
        );
        return;
      }

      const guildMember = await getter.getMember(i.guild, i.user.id);
      if (!guildMember)
        throw new Error("Guild member not found while processing link interaction.");

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
              undefined,
              "Red"
            ),
          ],
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
        });

        await guildMember.roles.add(guestRole);

        await client.channels.fetch(KOTV_LOG_CHANNEL).then((chnl) => {
          if (chnl?.isTextBased) return log.error(`Could not find channel ${KOTV_LOG_CHANNEL}`);
          const channel = chnl as TextBasedChannel;
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
        await saveData(name, id, isInKOTV, user, i, rank);

        return;
      }

      // User is in KOTV
      rank = character.character_id_join_outfit_member.rank;
      await guildMember.roles.add(voidServantRole);
      await saveData(name, id, isInKOTV, user, i, rank);

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

      await client.channels.fetch(KOTV_LOG_CHANNEL).then((chnl) => {
        if (!chnl?.isTextBased) return log.error(`Could not find channel ${KOTV_LOG_CHANNEL}`);
        const channel = chnl as TextChannel;

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

async function saveData(
  name: string,
  id: string,
  isInKOTV: boolean,
  user: any,
  i: ModalSubmitInteraction,
  rank?: string
) {
  if (!rank) {
    rank = "Guest";
  }

  var data = {};

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
    log.error(error as string);
    return false;
  }
}
