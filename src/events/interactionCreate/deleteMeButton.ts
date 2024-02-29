import { Client, InteractionType, MessageComponentInteraction } from "discord.js";
import { waitingEmoji } from "../../Bot";

export default async (interaction: MessageComponentInteraction, client: Client<true>) => {
  if (!interaction.customId.startsWith("deleteMe-")) return;
  if (interaction.type !== InteractionType.MessageComponent) return;
  if (!interaction.isButton()) return;
  if (!interaction.guild) return;
  if (!interaction.message.author.bot) return;
  if (interaction.message.author.id !== client.user?.id) return;
  await interaction.reply({ content: waitingEmoji, ephemeral: true });
  try {
    await interaction.message.delete();
  } catch (error) {
    await interaction.editReply({
      content: "I don't have permission to delete that message or it is already gone.",
    });
  }
  await interaction.editReply({ content: "Deleted!" });
  return;
};
