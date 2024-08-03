import { BaseInteraction, Client, AutocompleteInteraction } from "discord.js";
import { log } from "itsasht-logger";
import TagSchema from "../../models/TagSchema";
import { redisClient } from "../../Bot";
import Database from "../../utils/data/database";
import { debugMsg } from "../../utils/TinyUtils";
import MinecraftServersSchema from "../../models/MinecraftServersSchema";
const COMMAND_NAME = "minecraft";

export default async (interaction: AutocompleteInteraction, client: Client<true>) => {
  if (!interaction.isAutocomplete()) return;
  if (interaction.commandName !== COMMAND_NAME) return;
  if (!interaction.guild) return;

  const rawFocusedValue = interaction.options.getFocused();
  if (!rawFocusedValue) return interaction.respond([]);
  const focusedValue = rawFocusedValue ? rawFocusedValue.trim().toLowerCase() : "";

  debugMsg(`Autocomplete call for: ${focusedValue} with command ${interaction.commandName}`);

  const db = new Database();

  const servers = (
    await db.find(MinecraftServersSchema, { guildId: interaction.guild.id }, false, 15)
  ).servers;

  const data: { name: string; value: string }[] = [];

  if (servers && servers.length > 0 && focusedValue) {
    for (const server of servers) {
      if (!server.serverName.toLowerCase().includes(focusedValue)) continue;
      data.push({
        name: server.serverName,
        value: server.serverName,
      });
    }
  }

  try {
    await interaction.respond(data);
  } catch (error) {
    log.error("We hit an emergency try/catch, error sending autocomplete response", error);
  }
};
