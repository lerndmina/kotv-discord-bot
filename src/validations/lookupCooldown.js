const log = require("fancy-log");
const { getCommandCooldown } = require("../Bot");
const BasicEmbed = require("../utils/BasicEmbed");

module.exports = ({ interaction, commandObj, handler }) => {
  const name = commandObj.data.name;

  cooldown = getCommandCooldown();

  if (cooldown.has(name)) {
    const time = cooldown.get(name);

    if (Date.now() < time) {
      const timeLeft = Math.floor(time / 1000);
      return hasCooldownMessage(interaction, timeLeft);
    }
  } else if (cooldown.has(`${name}-${interaction.user.id}`)) {
    const time = cooldown.get(`${name}-${interaction.user.id}`);

    if (Date.now() < time) {
      const timeLeft = Math.floor(time / 1000);
      return hasCooldownMessage(interaction, timeLeft);
    }
  }
};

function hasCooldownMessage(interaction, timeLeft) {
  return interaction.reply({
    embeds: [
      BasicEmbed(
        interaction.client,
        "Cooldown",
        `This command has a rate limit, you will be able to use this command <t:${timeLeft}:R>.`,
        "Red"
      ),
    ],
    ephemeral: true,
  });
}
