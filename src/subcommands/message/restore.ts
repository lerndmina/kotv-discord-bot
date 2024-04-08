import { SlashCommandProps } from "commandkit";
import { ThingGetter } from "../../utils/TinyUtils";
import BasicEmbed from "../../utils/BasicEmbed";
import { postToZiplineInstance } from "../../commands/utilities/message";
import { Client, Message } from "discord.js";
import log from "fancy-log";

export default async function ({ interaction, client, handler }: SlashCommandProps) {
  const url = new URL(interaction.options.getString("url", true));
  const getter = new ThingGetter(client);
  const message = await getter.getMessageFromUrl(url);
  if (!message) {
    throw new Error("Message not found.");
  }
  const embed = await getRestoreEmbed(message, client);
  return interaction.editReply({ embeds: [embed], content: "" });
}

export async function getRestoreEmbed(message: Message, client: Client<true>) {
  const discoHookObject = JSON.stringify({
    messages: [
      {
        data: {
          content: message.content || undefined,
          embeds: message.embeds.length === 0 ? undefined : message.embeds,
        },
        reference: message.url,
      },
    ],
  });

  const encodedData = Buffer.from(discoHookObject, "utf-8").toString("base64url");

  const discoHookUrl = `https://discohook.org/?data=${encodedData}`;

  const response = await fetch("https://share.discohook.app/create", {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: discoHookUrl }),
  });

  try {
    let short: { expires: any; url: string; id: string } = await response.json();
    short.expires = Math.floor(new Date(short.expires).getTime() / 1000);

    const embed = BasicEmbed(
      client,
      "Message restored to Discohook",
      `Click [here](${short.url}) to view the message in Discohook.\n\n**Note:** This link will expire <t:${short.expires}:R>`
    );
    return embed;
  } catch (error) {
    log.error(error);
    return BasicEmbed(client, "Error", "An error occurred while trying to restore the message.");
  }
}
