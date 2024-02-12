import { BaseInteraction, Client, AutocompleteInteraction } from "discord.js";
import log from "fancy-log";
import TagSchema from "../../models/TagSchema";
import { upperCaseFirstLetter, getTagKey, getTagName, debugMsg } from "../../utils/TinyUtils";
import { redisClient } from "../../Bot";
import Database from "../../utils/cache/database";
const COMMAND_NAME = "tag";

export default async (interaction: AutocompleteInteraction, client: Client<true>) => {
  if (!interaction.isAutocomplete()) return;
  if (interaction.commandName !== COMMAND_NAME) return;
  if (!interaction.guild) return;

  const rawFocusedValue = interaction.options.getFocused();
  if (!rawFocusedValue) return interaction.respond([]);
  const focusedValue = rawFocusedValue ? rawFocusedValue.trim().toLowerCase() : "";

  debugMsg(`Autocomplete call for: ${focusedValue}`);

  const db = new Database();

  const tags = await db.find(TagSchema, { guildId: interaction.guild.id }, false, 15);

  const data = [];
  if (tags && tags.length > 0 && focusedValue) {
    for (const tag of tags) {
      const tagName = getTagName(tag.key);
      if (!tagName.includes(focusedValue)) continue;
      data.push({
        name: tagName,
        value: tagName,
      });
    }
  }

  try {
    await interaction.respond(data);
  } catch (error) {
    log.error("We hit an emergency try/catch, error sending autocomplete response", error);
  }
};
