const { SlashCommandBuilder, ApplicationCommand, Snowflake, Collection } = require("discord.js");
const log = require("fancy-log");
const { getCommandKit } = require("../../Bot");
const GetAllFiles = require("../../utils/GetAllFiles");
const path = require("path");
const BasicEmbed = require("../../utils/BasicEmbed");

module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("Shows help!"),
  options: {
    devOnly: false,
    deleted: false,
    guildOnly: true,
  },
  run: async ({ interaction, client, handler }) => {
    await interaction.deferReply();

    const localCommands = GetAllFiles(path.join(__dirname, "../"));

    /**
     * @type {Promise<Collection<Snowflake, ApplicationCommand>>}
     */
    const result = await client.application.commands.fetch();

    const commands = {};

    // Get all commands into a format [categoryName, {commandName: string}]
    for (const command of localCommands) {
      var commandCategory = command.category;
      const commandName = command.name;

      if (!commandCategory) {
        log.warn(
          `Command ${commandName.toUpperCase()} does not have a category! Spooky! Skipping...`
        );
        continue;
      }

      // if command category does not exist in commands object, create it
      if (!commands[command.category]) {
        commands[commandCategory] = [];
      }

      /**
       * @type {ApplicationCommand}
       */
      const resultCommand = await result.find((cmd) => cmd.name === commandName);
      if (!resultCommand) continue;

      var commandDescription;

      if (resultCommand.description.length > 64) {
        commandDescription = resultCommand.description.slice(0, 61) + "...";
      } else commandDescription = resultCommand.description;

      commands[commandCategory].push({
        id: resultCommand.id,
        name: commandName,
        description: commandDescription,
        subcommands: resultCommand.options,
      });
    }

    var fields = []; // {name: category, value: "command1: description\ncommand2: description"}

    // Clean up and make it pesentable
    for (const category in commands) {
      if (commands[category].length === 0) {
        delete commands[category];
      } else {
        commands[category] = commands[category].sort((a, b) => (a.name > b.name ? 1 : -1));

        var name = category.charAt(0).toUpperCase() + category.slice(1);

        var value = "";

        for (const command of commands[category]) {
          if (!command.subcommands) {
            value += standardHelpMsg(command);
            log("We found a command without a subcommand, wtf?");
            break;
          }
          for (const subcommand of command.subcommands) {
            if (subcommand.type == 1) {
              value += subcommandHelpMsg(subcommand, command);
            } else {
              // Runs once per command so we only get one entry.
              value += standardHelpMsg(command);
              break;
            }
          }
        }

        fields.push({
          name: name,
          value: value,
        });
      }
    }

    const embed = BasicEmbed(client, "Help", "To run commands, use `/(command-Name)`\n", fields);

    interaction.editReply({
      embeds: [embed],
    });
  },
};

function standardHelpMsg(command) {
  return `</${command.name}:${command.id}>: ${command.description}\n`;
}

function subcommandHelpMsg(subcommand, command) {
  var commandDescription;

  if (subcommand.description.length > 64) {
    commandDescription = subcommand.description.slice(0, 61) + "...";
  } else commandDescription = subcommand.description;

  return `</${command.name} ${subcommand.name}:${command.id}>: ${commandDescription}\n`;
}
