const log = require("fancy-log");
const { getCommandCooldown, KOTV_PREACHER_ROLE } = require("../Bot");
const BasicEmbed = require("../utils/BasicEmbed");
const env = require("../utils/FetchEnvs")();

const COMMAND_NAMES = ["lookup", "post-vs-message", "poll"];

module.exports = ({ interaction, commandObj, handler }) => {
  const name = commandObj.data.name;

  if (!COMMAND_NAMES.includes(name)) return;

  const member = interaction.member;

  /**
   * @type {string[]}
   */
  const roleIds = member.roles.cache.map((role) => role.id);

  // env.OWNER_IDS.includes(interaction.user.id) ||

  if (roleIds.includes(KOTV_PREACHER_ROLE)) return;

  interaction.reply({
    embeds: [
      BasicEmbed(
        interaction.client,
        "No Permission!",
        `You do not have permission to use the command \`${name}\``
      ),
    ],
    ephemeral: true,
  });

  return true;
};
