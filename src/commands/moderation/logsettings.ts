import { CommandOptions, SlashCommandProps } from "commandkit";
import {
  MessageComponentInteraction,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { waitingEmoji } from "../../Bot";
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "@discordjs/builders";
import BasicEmbed from "../../utils/BasicEmbed";
import log from "fancy-log";

export enum LogTypes {
  MESSAGE_DELETED = "Message Deleted",
  MESSAGE_BULK_DELETED = "Messages Bulk Deleted",
  MESSAGE_UPDATED = "Message Edited",
  MEMBER_JOINED = "Member Joined",
  MEMBER_LEFT = "Member Left",
}

export const data = new SlashCommandBuilder()
  .setName("logsettings")
  .setDescription("Set up logging for your server, run this in your logging channel.")
  .setDMPermission(false);

export const options: CommandOptions = {
  devOnly: true,
  deleted: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  const reply = await interaction.reply({
    content: waitingEmoji,
    ephemeral: true,
    fetchReply: true,
  });

  const options: StringSelectMenuOptionBuilder[] = Object.values(LogTypes).map((value) => {
    return new StringSelectMenuOptionBuilder()
      .setLabel(value)
      .setValue(`${value}-${interaction.id}`);
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("stringselectmenu")
    .setPlaceholder("Select a log type")
    .setMinValues(0)
    .setMaxValues(options.length)
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.editReply({
    embeds: [BasicEmbed(client, "String Select Menu", "Select a log type.")],
    components: [row as any],
    content: null,
  });

  const collectorFilter = (i: MessageComponentInteraction) => i.user.id === interaction.user.id;
  const collector = reply.createMessageComponentCollector({
    filter: collectorFilter,
    time: 10 * 1000,
  });
  collector.on("collect", async (i: StringSelectMenuInteraction) => {
    i.reply(`You selected ${i.values.join(", ")}`);
  });

  collector.on("end", async (collected) => {
    try {
      interaction.editReply({
        components: [],
        embeds: [
          BasicEmbed(client, "String Select Menu", `Collected ${collected.size} interactions.`),
        ],
      });
    } catch (error) {
      log.error(error as any);
    }
  });
}
