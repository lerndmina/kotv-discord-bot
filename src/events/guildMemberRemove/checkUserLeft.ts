import { Client, GuildMember } from "discord.js";
import linkUserSchema from "../../models/linkUserSchema";
import updateCharacter from "../../utils/kotv/updateCharacter";
import log from "fancy-log";

/**
 *
 * @param {GuildMember} member
 * @param {Client} client
 */
export default async (member: GuildMember, client: Client) => {
  const planetManData = await linkUserSchema.findOne({ discordId: member.id });
  if (!planetManData) {
    log.info(`${member.user.username} left the server. They were not linked to an account.`);
    return;
  }

  log(`User has left the server. Fetching their data now.`);

  updateCharacter(member, member.user, planetManData, false);
};
