import { ChatInputCommandInteraction, Client } from "discord.js";
import Database from "../../../utils/data/database";
import BasicEmbed from "../../../utils/BasicEmbed";
import MinecraftServersSchema, {
  MinecraftServersType,
  SingleServerType,
} from "../../../models/MinecraftServersSchema";

export default function (
  interaction: ChatInputCommandInteraction,
  client: Client<true>,
  db: Database,
  response: MinecraftServersType | null
) {
  const serverName = interaction.options.getString("server", true);
  const serverIp = interaction.options.getString("ip", true);
  const serverPort = interaction.options.getInteger("port");

  if (!serverName || !serverIp) {
    return BasicEmbed(client, "Please provide a server name and ip.");
  }

  if (
    response &&
    response.servers.length > 0 &&
    response.servers.find((server) => server.serverName.toLowerCase() === serverName.toLowerCase())
  ) {
    return BasicEmbed(client, "Server already exists.");
  }

  const newServer: SingleServerType = {
    serverName,
    serverIp,
    serverPort: serverPort || 25565,
  };

  if (!response || !response.servers) {
    response = {
      guildId: interaction.guildId!,
      servers: [newServer],
    };
  } else {
    response.servers.push(newServer);
  }

  db.findOneAndUpdate(MinecraftServersSchema, { guildId: interaction.guildId }, response);

  return BasicEmbed(client, "Server added successfully.");
}
