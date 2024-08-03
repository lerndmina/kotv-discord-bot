import { ChatInputCommandInteraction, Client } from "discord.js";
import Database from "../../../utils/data/database";
import BasicEmbed from "../../../utils/BasicEmbed";
import { MinecraftServersType } from "../../../models/MinecraftServersSchema";

export default function (
  interaction: ChatInputCommandInteraction,
  client: Client<true>,
  db: Database,
  response: MinecraftServersType
) {
  if (!response || !response.servers.length) {
    return BasicEmbed(client, "No servers added yet.");
  }
  const serverSearch = interaction.options.getString("server", true);
  if (!serverSearch) {
    return BasicEmbed(client, "Please provide a server name.");
  }
  const serverData = response.servers.find(
    (server) => server.serverName.toLowerCase() === serverSearch.toLowerCase()
  );
  if (!serverData) {
    return BasicEmbed(client, "Server `" + serverSearch + "` not found.");
  }

  return BasicEmbed(
    client,
    `**${serverData.serverName}** - \`${serverData.serverIp}:${serverData.serverPort}\``
  );
}
