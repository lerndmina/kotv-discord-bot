import { SlashCommandProps } from "commandkit";
import { debugMsg, ThingGetter } from "../../utils/TinyUtils";
import logger from "fancy-log";
import { messageAttachmentProcessor } from "../../commands/utilities/message";
import { MessageEditOptions } from "discord.js";

export default async function ({ interaction, client, handler }: SlashCommandProps) {
  const urlString = interaction.options.getString("url", true);
  const url = new URL(urlString);
  const attachment = interaction.options.getAttachment("data", true);
  const removeComponents = interaction.options.getBoolean("remove-components", false);

  const getter = new ThingGetter(client);
  const message = await getter.getMessageFromUrl(url);
  if (!message) {
    throw new Error("Message not found.");
  }

  const newMessageContent = (await messageAttachmentProcessor(attachment)) as MessageEditOptions;

  if (removeComponents) {
    newMessageContent.components = [];
  } else {
    newMessageContent.components = message.components ? message.components : [];
  }

  if (!newMessageContent.embeds) newMessageContent.embeds = [];

  try {
    await message.edit(newMessageContent);
  } catch (error) {
    throw new Error(`Failed to edit message: ${error}`);
  }
  return interaction.editReply(`Edited message ${message.url}`);
}
