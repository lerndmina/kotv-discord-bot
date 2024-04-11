import { CommandOptions, SlashCommandProps } from "commandkit";
import {
  MessageComponentInteraction,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
  channelMention,
} from "discord.js";
import { globalCooldownKey, setCommandCooldown, waitingEmoji } from "../../Bot";
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "@discordjs/builders";
import BasicEmbed from "../../utils/BasicEmbed";
import log from "fancy-log";
import Database from "../../utils/data/database";
import LogSchema, { LogSchemaType } from "../../models/LogSchema";
import FetchEnvs from "../../utils/FetchEnvs";
const env = FetchEnvs();

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
  setCommandCooldown(globalCooldownKey(interaction.command!.name), 60 * 1000);

  const db = new Database();
  const loggingData = (await db.findOne(LogSchema, {
    guildId: interaction.guildId,
  })) as LogSchemaType;
  let enabledOptions: string[] = [];
  if (loggingData && loggingData.enabledLogs) enabledOptions = loggingData.enabledLogs;

  const options: StringSelectMenuOptionBuilder[] = Object.values(LogTypes).map((value) => {
    return new StringSelectMenuOptionBuilder()
      .setLabel(value)
      .setDefault(enabledOptions.includes(value))
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
    time: 60 * 1000,
  });
  collector.on("collect", async (i: StringSelectMenuInteraction) => {
    const enabledOptions = i.values.map((value) => value.split("-")[0]);
    const savedMessage =
      (enabledOptions.length === 0 ? "Disabled all logging." : "Enabled logging for ") +
      channelMention(interaction.channelId);
    if (enabledOptions.length === 0) {
      try {
        db.findOneAndDelete(LogSchema, { guildId: interaction.guildId });
        db.cleanCache(`${env.MONGODB_DATABASE}:${LogSchema.name}:${interaction.guildId}`);
      } catch (error) {
        log.error(error as any);
        // prettier-ignore
        interaction.editReply({embeds: [BasicEmbed(client, "String Select Menu", "An error occurred while updating the database, please contact the bot developer.", [{name: "Error", value: `\`\`\`${error}\`\`\``, inline: false}])], components: []});
      }
      i.reply({
        content: savedMessage,
        ephemeral: true,
      });
      return;
    }
    try {
      db.findOneAndUpdate(
        LogSchema,
        { guildId: interaction.guildId },
        { enabledLogs: enabledOptions, channelId: interaction.channelId }
      );
      db.cleanCache(`${env.MONGODB_DATABASE}:${LogSchema.name}:${interaction.guildId}`);
    } catch (error) {
      log.error(error as any);
      // prettier-ignore
      interaction.editReply({embeds: [BasicEmbed(client, "String Select Menu", "An error occurred while updating the database, please contact the bot developer.", [{name: "Error", value: `\`\`\`${error}\`\`\``, inline: false}])], components: []});
    }
    i.reply({
      content: savedMessage,
      ephemeral: true,
    });
    return;
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
