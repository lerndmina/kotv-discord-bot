import { SlashCommandBuilder, Client } from "discord.js";
import { Configuration, OpenAIApi } from "openai";
import BasicEmbed from "../../utils/BasicEmbed";
import log from "fancy-log";
import FetchEnvs from "../../utils/FetchEnvs";
import { SlashCommandProps } from "commandkit";
import systemPrompt from "../../utils/SystemPrompt";
import ResponsePlugins from "../../utils/ResponsePlugins";
import { returnMessage } from "../../utils/TinyUtils";
import { globalCooldownKey, setCommandCooldown, userCooldownKey } from "../../Bot";
const env = FetchEnvs();

const configuration = new Configuration({
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

  const configuration = new Configuration({
    apiKey: env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(configuration);

  let conversation = [{ role: "system", content: systemPrompt }];

  conversation.push({
    role: "user",
    content: requestMessage as string,
  });

  // Tell discord to wait while we process the request
  await interaction.deferReply({ ephemeral: false });

  // Send the message to OpenAI to be processed
  const response = await openai
    .createChatCompletion({
      model: "gpt-4",
      messages: conversation as any,
      // max_tokens: 256, // limit token usage
    })
    .catch((error) => {
      log.error(`OPENAI ERR: ${error}`);
    });

  if (!response || !response.data.choices[0] || !response.data.choices[0].message) {
    return returnMessage(
      interaction,
      client,
      "Error",
      "Something went wrong with the AI. Please try again.",
      { error: true }
    );
  }

  const aiResponse = await ResponsePlugins(response.data.choices[0].message.content!);

  // Send the response back to discord
  interaction.editReply({ content: aiResponse });
}
