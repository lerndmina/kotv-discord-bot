import { SlashCommandBuilder, Client } from "discord.js";
import { Configuration, OpenAIApi } from "openai";
import BasicEmbed from "../../utils/BasicEmbed";
import log from "fancy-log";
import FetchEnvs from "../../utils/FetchEnvs";
import { CommandOptions, SlashCommandProps } from "commandkit";
import { setCommandCooldown, userCooldownKey } from "../../Bot";
const env = FetchEnvs();

export const data = new SlashCommandBuilder()
  .setName("whatis")
  .setDescription("Ask the AI about this object")
  .addStringOption((option) =>
    option
      .setName("object")
      .setDescription("The object for the AI to describe.")
      .setRequired(true)
      .setMaxLength(30)
  );

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  setCommandCooldown(userCooldownKey(interaction.user.id, "whatis"), 60);
  const requestMessage = interaction.options.getString("object");
  if (!requestMessage)
    return interaction.reply({ content: "You must specify an object.", ephemeral: true });

  const configuration = new Configuration({
    apiKey: env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(configuration);

  let conversation = [
    {
      role: "system",
      content:
        "You are an AI, you will be presented with a name or object. You must come up with a funny and incorrect description for the prompt. Please keep it short. You do not need to mention the object name in the response.",
    },
  ];

  conversation.push({
    role: "user",
    content: requestMessage,
  });

  // Tell discord to wait while we process the request
  await interaction.deferReply({ ephemeral: false });

  // Send the message to OpenAI to be processed
  const response = (await openai
    .createChatCompletion({
      model: "gpt-4",
      messages: conversation as any,
      // max_tokens: 256, // limit token usage
    })
    .catch((error) => {
      log.error(`OPENAI ERR: ${error}`);
      return interaction.editReply({
        content: "Something went wrong with the AI. Please try again.",
      });
    })) as any;

  const aiResponse = response.data.choices[0].message.content;

  // Send the response back to discord
  interaction.editReply({
    embeds: [BasicEmbed(client, `Object: ${requestMessage}`, `\`\`\`${aiResponse}\`\`\``)],
  });
}
