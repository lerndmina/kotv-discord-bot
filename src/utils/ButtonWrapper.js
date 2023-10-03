const { ActionRowBuilder, ButtonComponent } = require("discord.js");

module.exports = (buttons) => {
  const components = [];
  var actionRow = new ActionRowBuilder();

  for (var a = 0; a < buttons.length && a < 25; a++) {
    if (a % 5 == 0 && a > 0) {
      components.push(actionRow);
      actionRow = new ActionRowBuilder();
    }
    actionRow.addComponents(buttons[a]);
  }

  if (actionRow.components.length > 0) components.push(actionRow);

  return components;
};
