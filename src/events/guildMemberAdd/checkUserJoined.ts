import { Client, GuildMember } from "discord.js";
import linkUserSchema from "../../models/linkUserSchema";
import updateCharacter from "../../utils/kotv/updateCharacter";
import log from "../../utils/log";

/**
 *
 * @param {GuildMember} member
 * @param {Client} client
 */
export default async (member: GuildMember, client: Client<true>) => {
  const user = await linkUserSchema.findOne({ discordId: member.id });
  if (!user)
    return log.info(`${member.user.tag} joined the server. They were not linked to an account.`);

  log.info(`User has joined the server. Fetching their data now.`);

  updateCharacter(member, member.user, user, true);
};
