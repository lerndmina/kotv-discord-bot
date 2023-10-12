const { Client, GuildMember } = require("discord.js");
const logger = require("fancy-log");
const linkUserSchema = require("../../models/linkUserSchema");
const updateCharacter = require("../../utils/updateCharacter");

/**
 *
 * @param {GuildMember} member
 * @param {Client} client
 */
module.exports = async (member, client) => {
  const user = await linkUserSchema.findOne({ discordId: member.id });
  if (!user)
    return logger.info(`${member.user.tag} joined the server. They were not linked to an account.`);

  logger(`User has joined the server. Fetching their data now.`);

  updateCharacter(member, member.user, user, true);
};
