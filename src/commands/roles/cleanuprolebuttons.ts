import { SlashCommandBuilder, Message, TextBasedChannel, ComponentType } from "discord.js";
import log from "fancy-log";
import { ROLE_BUTTON_PREFIX, waitingEmoji } from "../../Bot";
import RoleButtons from "../../models/RoleButtons";
import BasicEmbed from "../../utils/BasicEmbed";
import Database from "../../utils/cache/database";
import { debugMsg } from "../../utils/TinyUtils";
import { SlashCommandProps } from "commandkit";
import { UUID } from "crypto";
import { Channel } from "diagnostics_channel";

export const data = new SlashCommandBuilder()
  .setName("cleanuprolebuttons")
  .setDescription(
    "Cleans up all role buttons in this channel and deletes the associated database entries"
  )
  .setDMPermission(false)
  .addChannelOption((option) =>
    option
      .setName("channel")
      .setDescription("The channel to clean up the buttons from")
      .setRequired(false)
  );

export const options = {
  devOnly: false,
  deleted: false,
  userPermissions: ["Administrator"],
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  await interaction.reply({ content: waitingEmoji, ephemeral: true });
  var cleaned = 0;

  var channel = interaction.options.getChannel("channel") as TextBasedChannel | null;
  if (channel == null) channel = interaction.channel as TextBasedChannel;
  var errors = "";
  // Loop through all messages in the channel.
  // TODO: This is a bit of a mess, needs to be cleaned up.
  var messages = await channel.messages.fetch();
  messages.forEach(async (message) => {
    if (!(message.components.length > 0)) return;
    message.components.forEach(async (component) => {
      if (!component.components[0].customId) return;
      if (!component.components[0].customId.startsWith(ROLE_BUTTON_PREFIX)) return;
      component.components.forEach(async (button) => {
        if (!button.customId) return;
        if (!button.customId.startsWith(ROLE_BUTTON_PREFIX)) return;
        const uuid = button.customId.split("-").slice(1).join("-");
        log("Deleting button: " + uuid);
        cleaned++;
        await db.deleteOne(RoleButtons, { buttonId: uuid });
      });
    });
    try {
      await message.delete();
    } catch (error) {
      log("Error deleting message: " + message.id + " " + error);
      errors += `\nCan't delete message, it either doesn't exist or I don't have permission to delete it.`;
    }
  });

  if (cleaned == 0) {
    await interaction.editReply({
      content: "",
      embeds: [BasicEmbed(client, "Role Button Cleanup", "No buttons found to clean up.")],
    });
  } else {
    interaction.editReply({
      content: "Done!",
      embeds: [
        BasicEmbed(
          client,
          "Role Button Cleanup",
          `Deleted ${cleaned} button(s)${errors ? ` :\n\nErrors:${errors}` : ""}`
        ),
      ],
    });
  }
}

const db = new Database();
