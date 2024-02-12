import { GuildMember, User } from "discord.js";
import logger from "fancy-log";
import { OUTFIT_ID, KOTV_GUEST_ROLE, KOTV_VOID_SERVANT_ROLE } from "../../Bot";
import linkUserSchema from "../../models/linkUserSchema";
import { debugMsg, fetchApiReturnCharacter } from "../TinyUtils";

/**
 * @param {GuildMember} guildMember
 * @param {User} discordUser
 * @param {object} planetmanData
 * @param {Boolean} isInServer
 */
export default async function (
  guildMember: GuildMember,
  discordUser: User,
  planetmanData: any,
  isInServer: boolean
) {
  const character = await fetchApiReturnCharacter(planetmanData.ps2Name);
  if (!character) {
    debugMsg(
      `${discordUser.username} left/joined the server, the character they were linked to does not exist so they were removed from the database.`
    );
    await linkUserSchema.deleteOne({ discordId: guildMember.id }).catch((err) => {
      logger.error(
        `Error deleting user ${discordUser.username} (${discordUser.id}) from the database: ${err}`
      );
    });
    return;
  }

  const dataIsInKotv = character.character_id_join_outfit_member.outfit_id === OUTFIT_ID;
  var kotvMemberShipChanged = planetmanData.isInKOTV !== dataIsInKotv;
  var kotvRankChanged = false;
  const fetchedKOTVRank = character.character_id_join_outfit_member.rank;
  if (dataIsInKotv) {
    kotvRankChanged = planetmanData.kotvRank !== fetchedKOTVRank;
  }

  const leftOrJoined = isInServer ? "joined" : "left";
  const wasOrWasNot = planetmanData.isInKOTV ? "" : "not ";

  debugMsg(
    `User ${discordUser.username} ${leftOrJoined} the server. They were linked to the account ${planetmanData.ps2Name} (${planetmanData.ps2Id}). They were ${wasOrWasNot}in KOTV. Their rank was ${planetmanData.kotvRank}. Their kotv membership changed: ${kotvMemberShipChanged}. Their rank changed: ${kotvRankChanged}.`
  );

  if (kotvMemberShipChanged || kotvRankChanged) {
    const update = {
      isInKOTV: dataIsInKotv,
      kotvRank: dataIsInKotv ? fetchedKOTVRank : "Guest",
    };
    await linkUserSchema.findOneAndUpdate({ discordId: discordUser.id }, update);
    logger.info(`Updated user ${discordUser.username} (${discordUser.id})`);
  }

  if (isInServer) {
    const guestRole = guildMember.guild.roles.cache.get(KOTV_GUEST_ROLE);
    const voidServantRole = guildMember.guild.roles.cache.get(KOTV_VOID_SERVANT_ROLE);
    if (!guestRole || !voidServantRole) {
      logger.error(`Could not find guest or void servant role in the guild!`);
      return;
    }

    debugMsg(`Adding roles to ${discordUser.username} (${discordUser.id})`);

    if (dataIsInKotv) {
      guildMember.roles.add(voidServantRole);
    } else {
      guildMember.roles.add(guestRole);
    }
  }
}
