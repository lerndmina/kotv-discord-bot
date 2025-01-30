import type { SlashCommandProps, CommandOptions } from "commandkit";
import { ChatInputCommandInteraction, Guild, SlashCommandBuilder } from "discord.js";
import log from "../../utils/log";
import { globalCooldownKey, setCommandCooldown, waitingEmoji } from "../../Bot";
import Database from "../../utils/data/database";
import BibiChannels from "../../models/BibiChannels";

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
  devOnly: true,
  deleted: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  const requiredAdminPermissions = ["MANAGE_CHANNELS"];
  const requiredBotPermissions = ["ADD_REACTIONS", "READ_MESSAGE_HISTORY", "VIEW_CHANNEL"];
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
