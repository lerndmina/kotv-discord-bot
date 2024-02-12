import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  ButtonBuilder,
  ButtonStyle,
  Role,
  Emoji,
  EmojiResolvable,
} from "discord.js";

import log from "fancy-log";
import { json } from "stream/consumers";
import BasicEmbed from "../../utils/BasicEmbed";
import { debuglog } from "util";
import ButtonWrapper from "../../utils/ButtonWrapper";
import { randomUUID } from "crypto";
import RoleButtons from "../../models/RoleButtons";
import { ROLE_BUTTON_PREFIX, waitingEmoji } from "../../Bot";
import Database from "../../utils/cache/database";
import { CommandOptions, SlashCommandProps } from "commandkit";

export const data = new SlashCommandBuilder()
  .setName("createrolebutton")
  .setDescription("Creates a button that gives a role when clicked")
  .setDMPermission(false)
  .addRoleOption((option) =>
    option
      .setName("role1")
      .setDescription("The role to give when the button is clicked")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("button1").setDescription("The content of the button").setRequired(true)
  )
  .addStringOption((option) =>
    option.setName("emoji1").setDescription("The emoji to use for the button").setRequired(false)
  )
  .addRoleOption((option) =>
    option
      .setName("role2")
      .setDescription("The role to give when the button is clicked")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option.setName("button2").setDescription("The content of the button").setRequired(false)
  )
  .addStringOption((option) =>
    option.setName("emoji2").setDescription("The emoji to use for the button").setRequired(false)
  )
  .addRoleOption((option) =>
    option
      .setName("role3")
      .setDescription("The role to give when the button is clicked")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option.setName("button3").setDescription("The content of the button").setRequired(false)
  )
  .addStringOption((option) =>
    option.setName("emoji3").setDescription("The emoji to use for the button").setRequired(false)
  )
  .addRoleOption((option) =>
    option
      .setName("role4")
      .setDescription("The role to give when the button is clicked")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option.setName("button4").setDescription("The content of the button").setRequired(false)
  )
  .addStringOption((option) =>
    option.setName("emoji4").setDescription("The emoji to use for the button").setRequired(false)
  );

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
  userPermissions: ["Administrator"],
  botPermissions: ["Administrator"],
};

export async function run({ interaction, client, handler }: SlashCommandProps) {
  var roles: Role[] = [];
  var content: string[] = [];
  var emoji: string[] = [];
  interaction.options.data.forEach((option) => {
    if (option.name.startsWith("role")) {
      roles.push(option.role as Role);
    } else if (option.name.startsWith("button")) {
      content.push(option.value as string);
    } else if (option.name.startsWith("emoji")) {
      emoji.push(option.value as string);
    }
  });

  if (roles.length !== content.length) {
    return interaction.reply({
      embeds: [
        BasicEmbed(client, "‼️ Error", `You need to have the same amount of roles and buttons.`),
      ],
      ephemeral: true,
    });
  }

  log(`Roles: ${roles}`);
  log(`Content: ${content}`);
  log(`Emoji: ${emoji}`);

  const modalId = `modal-${interaction.id}`;
  const inputId = `input-${interaction.id}`;

  const modal = new ModalBuilder()
    .setCustomId(modalId)
    .setTitle("Type in your custom embed content");
  const jsonInput = new TextInputBuilder()
    .setCustomId(inputId)
    .setLabel("Enter shrt.zip link Here")
    .setMinLength(1)
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(`https://shrt.zip/u/AbCd.txt`);

  const firstActionRow = new ActionRowBuilder().addComponents(jsonInput);
  modal.addComponents(firstActionRow as any);

  await interaction.showModal(modal);
  const filter = (interaction: ModalSubmitInteraction) => interaction.customId === modalId;

  interaction
    .awaitModalSubmit({ filter, time: 120_000 })
    .then(async (modalInteraction) => {
      const i: ModalSubmitInteraction = modalInteraction;

      var raw = i.fields.getTextInputValue(inputId) as string | any;
      var json = null;
      log(`Url: ${raw}`);
      const urlRegex = /(https?:\/\/[^\s]+)/g;

      if (urlRegex.test(raw)) {
        log(`Looks like a url to me.`);

        // Go to the URL and get the raw text
        var url = raw.match(urlRegex)![0].replace("/u/", "/r/");
        url = url.replace("/code/", "/r/");
        var raw = null;
        if (url.startsWith("https://discohook.org/?data=")) {
          url = Buffer.from(url.split("=")[1], "base64").toString("utf-8").trim();
          raw = url;
        } else {
          const res = await fetch(url);
          raw = (await res.text()).trim();
        }
        log(`Fetched / Base64 Decoded`);

        // We have the json
        try {
          json = JSON.parse(raw);
          log(`Parsed`);
        } catch (error) {
          log.error(error);
          return i.reply({
            embeds: [
              BasicEmbed(
                client,
                "‼️ Error",
                `There was an error parsing the JSON.`,
                undefined,
                "Red"
              ),
            ],
            ephemeral: true,
          });
        }
      } else {
        return i.reply({
          embeds: [BasicEmbed(client, "‼️ Error", `You didn't give me a url`, undefined, "Red")],
          ephemeral: true,
        });
      }

      await i.reply({
        embeds: [],
        content: waitingEmoji,
        ephemeral: true,
      });

      const db = new Database();
      const buttons = [];
      for (let index = 0; index < roles.length; index++) {
        var uuid = randomUUID();
        const button = new ButtonBuilder()
          .setCustomId(ROLE_BUTTON_PREFIX + uuid)
          .setLabel(content[index])
          .setStyle(ButtonStyle.Primary);
        if (emoji[index]) {
          button.setEmoji(emoji[index]);
        }
        buttons.push(button);
        const role = roles[index];
        const data = {
          guildId: interaction.guild!.id,
          roleId: role.id,
          buttonId: uuid,
        };
        await db.findOneAndUpdate(RoleButtons, { buttonId: uuid }, data);
      }
      const components = ButtonWrapper(buttons);

      await i.channel!.send({
        content: json.messages ? json.messages[0].data.content : json.content || "",
        embeds: json.messages ? json.messages[0].data.embeds : json.embeds,
        components: components,
      });

      await i.editReply("Done!");
    })
    .catch((error) => {
      log.error(error);
      return interaction.followUp({
        embeds: [
          BasicEmbed(client, "Error", `The interaction timed out or failed.`, undefined, "Red"),
        ],
        ephemeral: true,
      });
    });
}
