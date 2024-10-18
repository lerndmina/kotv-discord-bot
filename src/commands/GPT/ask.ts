import { SlashCommandBuilder, Client } from "discord.js";
import OpenAI from "openai";
import BasicEmbed from "../../utils/BasicEmbed";
import { log } from "itsasht-logger";
import FetchEnvs from "../../utils/FetchEnvs";
import { SlashCommandProps } from "commandkit";
import systemPrompt from "../../utils/SystemPrompt";
import ResponsePlugins from "../../utils/ResponsePlugins";
import { returnMessage } from "../../utils/TinyUtils";
import { globalCooldownKey, setCommandCooldown, userCooldownKey } from "../../Bot";
const env = FetchEnvs();

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export const data = new SlashCommandBuilder()
  .setName("ask")
  .setDescription("Ask the AI")
  .addStringOption((option) =>
    option.setName("message").setDescription("The message to send to the AI.").setRequired(true)
  );

export const options = {
  devOnly: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  await setCommandCooldown(globalCooldownKey(interaction.commandName), 60);
  const requestMessage = interaction.options.getString("message");

  let conversation = [{ role: "system", content: systemPrompt }];

  conversation.push({
    role: "user",
    content: requestMessage as string,
  });

  // Tell discord to wait while we process the request
  await interaction.deferReply({ ephemeral: false });

  // Send the message to OpenAI to be processed
  const response = await openai.chat.completions
    .create({
      model: "gpt-4o-mini",
      messages: conversation as any,
      // max_tokens: 256, // limit token usage
    })
    .catch((error) => {
      log.error(`OPENAI ERR: ${error}`);
    });

  if (!response || !response.choices[0] || !response.choices[0].message.content) {
    return returnMessage(
      interaction,
      client,
      "Error",
      "Something went wrong with the AI. Please try again.",
      { error: true }
    );
  }

  const aiResponse = await ResponsePlugins(response.choices[0].message.content);

  // Send the response back to discord
  interaction.editReply({ content: aiResponse });
}
