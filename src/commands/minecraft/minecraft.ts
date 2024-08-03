import type { SlashCommandProps, CommandOptions } from "commandkit";
import { Embed, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { log } from "itsasht-logger";
import { globalCooldownKey, setCommandCooldown, waitingEmoji } from "../../Bot";
import Database from "../../utils/data/database";
import { returnMessage } from "../../utils/TinyUtils";
import pingServer from "./subcommands/pingServer";
import listServers from "./subcommands/listServers";
import addServer from "./subcommands/addServer";
import MinecraftServersSchema from "../../models/MinecraftServersSchema";

export const data = new SlashCommandBuilder()
  .setName("minecraft")
  .setDescription("Ping a minecraft server.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("ping")
      .setDescription("Ping a minecraft server.")
      .addStringOption((option) =>
        option
          .setName("server")
          .setAutocomplete(true)
          .setDescription("The server to ping.")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("list").setDescription("List all added minecraft servers.")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Add a minecraft server.")
      .addStringOption((option) =>
        option.setName("server").setDescription("The server name.").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("ip").setDescription("The server ip.").setRequired(true)
      )
      .addIntegerOption((option) =>
        option.setName("port").setDescription("The server port.").setRequired(false)
      )
  )
  .setDMPermission(false);

export const options: CommandOptions = {
  devOnly: true,
  deleted: true,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  if (!interaction.guildId)
    return returnMessage(
      interaction,
      client,
      "GuildOnly",
      "This command can only be used in a server.",
      { ephemeral: true, firstMsg: true, error: true }
    );

  await interaction.reply({ content: waitingEmoji, ephemeral: false });
  setCommandCooldown(globalCooldownKey(interaction.commandName), 60);

  const db = new Database();
  const response = await db.findOne(MinecraftServersSchema, { guildId: interaction.guildId });
  log.info(response);
  const subcommand = interaction.options.getSubcommand();
  let userResponseEmbed: EmbedBuilder;
  if (subcommand === "ping") {
    userResponseEmbed = pingServer(interaction, client, db, response);
  } else if (subcommand === "list") {
    userResponseEmbed = listServers(interaction, client, db, response);
  } else if (subcommand === "add") {
    userResponseEmbed = addServer(interaction, client, db, response);
  } else {
    return returnMessage(interaction, client, "Error", "Invalid subcommand.", {
      ephemeral: true,
      firstMsg: true,
      error: true,
    });
  }

  await interaction.editReply({ embeds: [userResponseEmbed], content: null });
}
