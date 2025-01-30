import type { SlashCommandProps, CommandOptions } from "commandkit";
import {
  ChatInputCommandInteraction,
  Guild,
  PermissionResolvable,
  SlashCommandBuilder,
} from "discord.js";
import log from "../../utils/log";
import { globalCooldownKey, KOTV_PREACHER_ROLE, setCommandCooldown, waitingEmoji } from "../../Bot";
import Database from "../../utils/data/database";
import BibiChannels from "../../models/BibiChannels";
import { ThingGetter } from "../../utils/TinyUtils";

export const data = new SlashCommandBuilder()
  .setName("bibichannels")
  .setDescription("List of channels where Bibi reacts to messages.")
  .addStringOption((option) =>
    option
      .setName("action")
      .setDescription("Action to perform.")
      .setRequired(true)
      .addChoices(
        { name: "Add", value: "add" },
        { name: "Remove", value: "remove" },
        { name: "List", value: "list" },
        { name: "Clear", value: "clear" }
      )
  )
  .addChannelOption((option) =>
    option.setName("channel").setDescription("Channel to add/remove.").setRequired(false)
  )
  .setDMPermission(false);

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
};
const requiredBotPermissions: PermissionResolvable[] = [
  "AddReactions",
  "ReadMessageHistory",
  "ViewChannel",
];

export async function run({ interaction, client, handler }: SlashCommandProps) {
  const validchoices = ["add", "remove", "list", "clear"];
  const channel = interaction.options.getChannel("channel");
  const choice = interaction.options.getString("action");

  if (!interaction.guild) {
    // Technically this should never happen, but just in case.
    return interaction.reply({
      content: "This command can only be used in a server.",
      ephemeral: true,
    });
  }
  const getter = new ThingGetter(client);
  const member = await getter.getMember(interaction.guild, interaction.user.id);
  const role = await getter.getRole(interaction.guild, KOTV_PREACHER_ROLE);
  if (!role) {
    log.error("Preacher role not found.");
    return interaction.reply({
      content: "Preacher role not found.",
      ephemeral: true,
    });
  }

  // Check if the user has the required permissions.
  if (!member?.roles.cache.has(role.id)) {
    return interaction.reply({
      content: "You do not have the required role to use this command.",
      ephemeral: true,
    });
  }

  const db = new Database();

  switch (choice) {
    case "add": {
      addChannel(channel, interaction, db);
      break;
    }
    case "remove": {
      removeChannel(channel, interaction, db);
      break;
    }
    case "list": {
      listChannels(interaction, db);
      break;
    }
    case "clear": {
      clearChannels(interaction, db);
      break;
    }
    default: {
      return interaction.reply({
        content: `Invalid choice. Valid choices: ${validchoices.join(", ")}`,
        ephemeral: true,
      });
    }
  }
}

async function addChannel(channel: any, interaction: ChatInputCommandInteraction, db: Database) {
  if (!channel) {
    return interaction.reply({
      content: "Please provide a channel to add.",
      ephemeral: true,
    });
  }
  if (!interaction.guild) return;

  // Check if the bot has the required permissions for the channel.
  if (!channel.permissionsFor(interaction.guild.members.me!)?.has(requiredBotPermissions)) {
    return interaction.reply({
      content: `I need the following permissions in the channel: ${requiredBotPermissions.join(
        ", "
      )}`,
      ephemeral: true,
    });
  }

  const data = await db.findOne(BibiChannels, { guildID: interaction.guild.id });
  const channels = data?.channelIDs || [];

  if (channels.includes(channel.id)) {
    return interaction.reply({
      content: "This channel is already in the list.",
      ephemeral: true,
    });
  }

  channels.push(channel.id);
  await db.findOneAndUpdate(
    BibiChannels,
    { guildID: interaction.guild.id },
    { channelIDs: channels }
  );
  db.cleanCache(db.getCacheKeys(BibiChannels, interaction.guild.id));
  return interaction.reply({
    content: `Channel <#${channel.id}> has been added to the list.`,
    ephemeral: true,
  });
}

async function removeChannel(channel: any, interaction: ChatInputCommandInteraction, db: Database) {
  if (!channel) {
    return interaction.reply({
      content: "Please provide a channel to remove.",
      ephemeral: true,
    });
  }
  if (!interaction.guild) return;

  const data = await db.findOne(BibiChannels, { guildID: interaction.guild.id });
  const channels = data?.channelIDs || [];

  if (!channels.includes(channel.id)) {
    return interaction.reply({
      content: "This channel is not in the list.",
      ephemeral: true,
    });
  }

  const newChannels = channels.filter((id: string) => id !== channel.id);
  await db.findOneAndUpdate(
    BibiChannels,
    { guildID: interaction.guild.id },
    { channelIDs: newChannels }
  );
  db.cleanCache(db.getCacheKeys(BibiChannels, interaction.guild.id));
  return interaction.reply({
    content: `Channel <#${channel.id}> has been removed from the list.`,
    ephemeral: true,
  });
}

async function listChannels(interaction: ChatInputCommandInteraction, db: Database) {
  if (!interaction.guild) return;

  const data = await db.findOne(BibiChannels, { guildID: interaction.guild.id });
  const channels = data?.channelIDs || [];

  if (channels.length === 0) {
    return interaction.reply({
      content: "There are no channels in the list.",
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: `Channels: ${channels.map((id: string) => `<#${id}>`).join(", ")}`,
    ephemeral: true,
  });
}

async function clearChannels(interaction: ChatInputCommandInteraction, db: Database) {
  if (!interaction.guild) return;

  await db.findOneAndDelete(BibiChannels, { guildID: interaction.guild.id });
  db.cleanCache(db.getCacheKeys(BibiChannels, interaction.guild.id));
  return interaction.reply({
    content: "Channels list has been cleared.",
    ephemeral: true,
  });
}
