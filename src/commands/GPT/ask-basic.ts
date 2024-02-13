import { SlashCommandBuilder, Client } from "discord.js";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import BasicEmbed from "../../utils/BasicEmbed";
import { log } from "itsasht-logger";
import FetchEnvs from "../../utils/FetchEnvs";
import { CommandOptions, SlashCommandProps } from "commandkit";
import { globalCooldownKey, setCommandCooldown, userCooldownKey } from "../../Bot";
const env = FetchEnvs();

const configuration = new Configuration({
  apiKey: env.OPENAI_API_KEY,
});

export const data = new SlashCommandBuilder()
  .setName("ask-basic")
  .setDescription("Ask the AI without previous chat messages. And no system prompt. Go wild!")
  .addStringOption((option) =>
    option.setName("message").setDescription("The message to send to the AI.").setRequired(true)
  );

export const options: CommandOptions = {
  devOnly: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  await setCommandCooldown(globalCooldownKey(interaction.commandName), 60);
  const requestMessage = interaction.options.getString("message") as string;

  const configuration = new Configuration({
    apiKey: env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(configuration);

  let conversation = [
    {
      role: "system",
      content: "You are a helpful assistant, interacting with your humans through Discord.",
    },
  ];

  conversation.push({
    role: "user",
    content: requestMessage,
  });

  // Tell discord to wait while we process the request
  await interaction.deferReply({ ephemeral: false });
  var response;
  try {
    // Send the message to OpenAI to be processed
    response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: conversation as any,
      // max_tokens: 256, // limit token usage
    });
  } catch (error: unknown) {
    log.error(`OpenAI Error:`);
    log.error(error);
  }

  if (!response || !response.data.choices || !response.data.choices[0].message) {
    interaction.editReply({
      content: "Sorry, I couldn't get a response from the AI. Please try again later.",
    });
    return;
  }

  const aiResponse = response.data.choices[0].message.content as string;

  if (aiResponse.length > 2000) {
    var responses: string[] = [];
    var tempResponse = "";
    for (let i = 0; i < aiResponse.length; i++) {
      if (tempResponse.length > 1900) {
        responses.push(tempResponse);
        tempResponse = "";
      }
      tempResponse += aiResponse[i];
    }

    for (let i = 0; i < responses.length; i++) {
      await interaction.followUp({ content: responses[i] });
    }
    return;
  }

  // Send the response back to discord
  interaction.editReply({ content: aiResponse });
}
