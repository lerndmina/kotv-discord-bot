import type { SlashCommandProps, CommandOptions } from "commandkit";
import {
  ActionRow,
  ActionRowBuilder,
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  SlashCommandBuilder,
} from "discord.js";
import log from "fancy-log";
import { globalCooldownKey, setCommandCooldown, userCooldownKey, waitingEmoji } from "../../Bot";
import generateHelpFields from "../../utils/data/static/generateHelpFields";
import Database from "../../utils/data/database";
import TicTacToeSchema, { TicTacToeSchemaType } from "../../models/TicTacToeSchema";
import { debugMsg } from "../../utils/TinyUtils";

const db = new Database();

export const EMOJI_X = "✖️";
export const EMOJI_O = "⭕";
export const EMOJI_BLANK = "⬜";

export const data = new SlashCommandBuilder()
  .setName("tictactoe")
  .setDescription("Play a game of Tic Tac Toe.")
  .addUserOption((option) =>
    option.setName("opponent").setDescription("The user to play against.").setRequired(true)
  )
  .addIntegerOption((option) =>
    option.setName("size").setDescription("The size of the board.").setRequired(false)
  )
  .setDMPermission(false);

export const options: CommandOptions = {
  devOnly: false,
  deleted: false,
  userPermissions: ["ManageMessages"], // For now so only moderators can initiate games.
  // TODO: Make this configurable.
};

const MIN_SIZE = 3;
const MAX_SIZE = 5;

export async function run({ interaction, client, handler }: SlashCommandProps) {
  setCommandCooldown(userCooldownKey(interaction.user.id, interaction.commandName), 60 * 1000);

  const size = interaction.options.getInteger("size", false) || 3;
  if (size < MIN_SIZE || size > MAX_SIZE) {
    interaction.reply({
      content: `The size of the board must be between ${MIN_SIZE} and ${MAX_SIZE}.`,
      ephemeral: true,
    });
    return;
  }

  const opponent = interaction.options.getUser("opponent", true);
  if (opponent.bot) {
    interaction.reply({
      content: "You cannot play against a bot.",
      ephemeral: true,
    });
    return;
  }
  if (opponent.id === interaction.user.id) {
    interaction.reply({
      content: "You cannot play against yourself.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `Setting up the game...`,
    ephemeral: true,
  });

  const { rows, gameState } = initiateGame(size, interaction);

  try {
    const message = await interaction.channel!.send({
      content: `**Tic Tac Toe** Hey <@${opponent.id}> you have been challenged by <@${interaction.user.id}>!`,
      components: rows,
    });

    const data: TicTacToeSchemaType = {
      guildId: interaction.guild!.id,
      messageId: message.id,
      channelId: interaction.channel!.id,
      initiatorId: interaction.user.id,
      opponentId: opponent.id,
      size,
      gameState,
      turn: interaction.user.id,
      gameOver: false,
      createdAt: new Date(),
    };

    await db.findOneAndUpdate(TicTacToeSchema, { messageId: data.messageId }, data);
    debugMsg(`Game set up for ${interaction.user.tag} and ${opponent.tag}`);
  } catch (error) {
    log.error(error);
    await interaction.reply({
      content: "An error occurred while setting up the game.",
      ephemeral: true,
    });

    await db.deleteOne(TicTacToeSchema, { initiatorId: interaction.user.id });
    return;
  }

  interaction.editReply({
    content: `Game has been set up.`,
  });
}
function initiateGame(size: number, interaction: BaseInteraction) {
  const gameState: Record<`${number}${number}`, string> = {};
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      gameState[`${x}${y}`] = EMOJI_BLANK;
    }
  }

  const rows = getButtonsForGameState(gameState, size, interaction);

  return { gameState, rows };
}

export function getButtonsForGameState(
  gameState: Record<`${number}${number}`, string>,
  size: number,
  interaction: BaseInteraction,
  disableAll: boolean = false
) {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];

  for (let x = 0; x < size; x++) {
    let buttons: ButtonBuilder[] = [];
    for (let y = 0; y < size; y++) {
      let buttonStyle: ButtonStyle;
      if (gameState[`${x}${y}`] === EMOJI_O) {
        buttonStyle = ButtonStyle.Success;
      } else if (gameState[`${x}${y}`] === EMOJI_X) {
        buttonStyle = ButtonStyle.Danger;
      } else {
        buttonStyle = ButtonStyle.Primary;
      }
      let button = new ButtonBuilder()
        .setCustomId(`tictactoe_${x}_${y}_${interaction.id}`)
        .setLabel(gameState[`${x}${y}`] || EMOJI_BLANK)
        .setStyle(buttonStyle)
        .setDisabled(disableAll);
      buttons.push(button);
    }
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));
  }

  return rows;
}
