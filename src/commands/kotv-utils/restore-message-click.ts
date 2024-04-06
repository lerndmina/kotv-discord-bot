import { MessageContextMenuCommandProps } from "commandkit";
import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
import { getRestoreEmbed } from "../../subcommands/message/restore";

export const data = new ContextMenuCommandBuilder()
  .setName("Restore to Discohook")
  .setType(ApplicationCommandType.Message)
  .setDMPermission(false);

export const options = {
  devOnly: false,
};

export async function run({ interaction, client, handler }: MessageContextMenuCommandProps) {
  if (!interaction.targetMessage.guildId) {
    await interaction.reply({
      content: "This command can only be used in a guild.",
      ephemeral: true,
    });
    return;
  }

  const embed = await getRestoreEmbed(interaction.targetMessage, client);
  return interaction.reply({ embeds: [embed], content: "", ephemeral: true });
}
