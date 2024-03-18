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

export const data = new SlashCommandBuilder().setName("help").setDescription("Shows help!");
export const options = {
  devOnly: false,
  deleted: false,
};
export async function run({ interaction, client, handler }: SlashCommandProps) {
  await interaction.deferReply();

  const localCommands = GetAllFiles(path.join(__dirname, "../"));

  const result = await client.application.commands.fetch();

  const commands = {} as {
    [key: string]: { id: Snowflake; name: string; description: string; subcommands: any }[];
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

    /**
     * @type {ApplicationCommand}
     */
    const resultCommand = await result.find((cmd) => cmd.name === commandName);
    if (!resultCommand) continue;

    var commandDescription;

    const MAX_LENGTH = 64;
    if (resultCommand.description.length > MAX_LENGTH) {
      commandDescription = resultCommand.description.slice(0, MAX_LENGTH - 3) + "...";
    } else commandDescription = resultCommand.description;

    commands[commandCategory].push({
      id: resultCommand.id,
      name: commandName,
      description: commandDescription,
      subcommands: resultCommand.options,
    });
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
        debugMsg(`Command: ${command.name} - ${command.id}`);
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

      if (!value || !name) continue;

      fields.push({
        name: name,
        value: value,
        inline: false,
      });
    }
  }

  const embed = BasicEmbed(
    client,
    "Help",
    "To run commands, use `/(command-Name)`\n",
    fields,
    undefined
  );

  interaction.editReply({
    embeds: [embed],
  });
}

function standardHelpMsg(command: any) {
  return `</${command.name}:${command.id}>: ${command.description}\n`;
}

function subcommandHelpMsg(subcommand: any, command: any) {
  var commandDescription;

  if (subcommand.description.length > 64) {
    commandDescription = subcommand.description.slice(0, 61) + "...";
  } else commandDescription = subcommand.description;

  return `</${command.name} ${subcommand.name}:${command.id}>: ${commandDescription}\n`;
}
