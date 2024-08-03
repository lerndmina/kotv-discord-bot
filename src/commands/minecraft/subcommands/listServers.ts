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

  const servers = response.servers.map((server) => {
    return `**${server.serverName}** - \`${server.serverIp}:${server.serverPort}\``;
  });

  return BasicEmbed(client, servers.join("\n"));
}
