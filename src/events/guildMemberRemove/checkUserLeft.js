const { Client, GuildMember } = require("discord.js");
const logger = require("fancy-log");
const linkUserSchema = require("../../models/linkUserSchema");
const fetchAPIReturnCharacter = require("../../utils/fetchAPIReturnCharacter");
const updateCharacter = require("../../utils/updateCharacter");

/**
 *
 * @param {GuildMember} member
 * @param {Client} client
 */
module.exports = async (member, client) => {
  const user = await linkUserSchema.findOne({ discordId: member.id });
  if (!user) {
    logger.info(`${member.user.username} left the server. They were not linked to an account.`);
    return;
  }

  logger(`User has left the server. Fetching their data now.`);

  updateCharacter(member, member.user, user, false);
};
