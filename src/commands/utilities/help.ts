import {
  SlashCommandBuilder,
  ApplicationCommand,
  Snowflake,
  Collection,
  Embed,
  EmbedField,
} from "discord.js";
import log from "fancy-log";
import GetAllFiles from "../../utils/GetAllFiles";
import path from "path";
import BasicEmbed from "../../utils/BasicEmbed";
import { SlashCommandProps } from "commandkit";
import { debugMsg } from "../../utils/TinyUtils";
import { debug } from "console";
import { waitingEmoji } from "../../Bot";

const COMMAND_HELP_MAX_LENGTH = 128;

export const data = new SlashCommandBuilder().setName("help").setDescription("Shows help!");
export const options = {
  devOnly: false,
  deleted: false,
};
export async function run({ interaction, client, handler }: SlashCommandProps) {
  await interaction.reply({ content: waitingEmoji });

  const localCommands = GetAllFiles(path.join(__dirname, "../"));

  const result = await client.application.commands.fetch();

  const commands = {} as {
    [category: string]: { id: Snowflake; name: string; description: string; subcommands: any }[];
  };

  debugMsg("Building command map");
  for (const command of localCommands) {
    debugMsg(command); // Logs the command object
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

    const resultCommand = result.find((cmd) => cmd.name === commandName);
    if (!resultCommand) continue;

    var commandDescription: string;

    if (resultCommand.description.length > COMMAND_HELP_MAX_LENGTH) {
      commandDescription = resultCommand.description.slice(0, COMMAND_HELP_MAX_LENGTH - 3) + "...";
    } else commandDescription = resultCommand.description;

    const commandObject = {
      id: resultCommand.id,
      name: commandName,
      description: commandDescription,
      subcommands: resultCommand.options,
    };

    commands[commandCategory].push(commandObject);
  }

  var fields: EmbedField[] = []; // {name: category, value: "command1: description\ncommand2: description"}

  // Clean up and make it pesentable
  for (const category in commands) {
    if (commands[category].length === 0) {
      delete commands[category];
    } else {
      commands[category] = commands[category].sort((a, b) => (a.name > b.name ? 1 : -1));

      var name = category.charAt(0).toUpperCase() + category.slice(1);

      var value = "";

      for (const command of commands[category]) {
        debugMsg(`Processing command: ${command.name}`);
        if (!command.subcommands || command.subcommands.length === 0) {
          value += standardHelpMsg(command);
          // This command has no subcommands, so we can skip the rest of the loop.
          continue;
        }
        for (const subcommand of command.subcommands) {
          if (subcommand.type == 1) {
            value += subcommandHelpMsg(subcommand, command);
          } else {
            // This is a standard command as a subcommand. Weird.
            value += standardHelpMsg(command);
            break;
          }
        }
      }

      if (!value || !name) {
        debugMsg(`Skipping category ${category} because it has no value or name`);
        continue;
      }

      const field = {
        name: name,
        value: value,
        inline: true,
      };

      fields.push(field);
    }
  }

  // Sort fields by value length
  fields = fields.sort((a, b) => (a.value.length < b.value.length ? 1 : -1));

  const embed = BasicEmbed(
    client,
    "Help",
    "To run commands, use `/(command-Name)`\n",
    fields,
    undefined
  );

  interaction.editReply({
    embeds: [embed],
    content: "",
  });
}

const endingNewline = "\n";

function standardHelpMsg(command: any) {
  return `</${command.name}:${command.id}>\n${command.description}${endingNewline}`;
}

function subcommandHelpMsg(subcommand: any, command: any) {
  var commandDescription: string;

  if (subcommand.description.length > COMMAND_HELP_MAX_LENGTH) {
    commandDescription = subcommand.description.slice(0, COMMAND_HELP_MAX_LENGTH - 3) + "...";
  } else commandDescription = subcommand.description;

  return `</${command.name} ${subcommand.name}:${command.id}>\n${commandDescription}${endingNewline}`;
}
