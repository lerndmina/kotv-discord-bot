import {
  Base,
  BaseInteraction,
  ChannelType,
  Client,
  InteractionType,
  Message,
  MessageComponentInteraction,
  RepliableInteraction,
} from "discord.js";
import Database from "../../utils/data/database";
import TicTacToeSchema, { TicTacToeSchemaType } from "../../models/TicTacToeSchema";
import {
  EMOJI_BLANK,
  EMOJI_O,
  EMOJI_X,
  getButtonsForGameState,
} from "../../commands/fun/tictactoe";
import { debugMsg } from "../../utils/TinyUtils";
import FetchEnvs from "../../utils/FetchEnvs";
const db = new Database();
const env = FetchEnvs();

export default async (interaction: MessageComponentInteraction, client: Client<true>) => {
  if (interaction.type != InteractionType.MessageComponent) return;
  if (!interaction.channel || !interaction.channel.isTextBased()) return;
  if (!interaction.guild) return;

  const message = await interaction.channel.messages.fetch(interaction.message.id);
  if (!message)
    return interaction.reply({ content: "The message was not found.", ephemeral: true });

  let game = (await db.findOne(TicTacToeSchema, {
    messageId: interaction.message.id,
  })) as TicTacToeSchemaType;
  if (!game) return interaction.reply({ content: "The game was not found.", ephemeral: true });

  if (interaction.user.id !== game.initiatorId && interaction.user.id !== game.opponentId)
    return interaction.reply({ content: "You are not part of this game.", ephemeral: true });

  if (game.gameOver)
    return interaction.reply({ content: "The game is already over.", ephemeral: true });

  if (game.turn !== interaction.user.id)
    return interaction.reply({ content: "It's not your turn.", ephemeral: true });

  // prettier-ignore
  const clickedLocation = `${interaction.customId.split("_")[1]}${interaction.customId.split("_")[2]}`;

  if (game.gameState[clickedLocation] !== EMOJI_BLANK)
    return interaction.reply({ content: "This location is already taken.", ephemeral: true });

  game.gameState[clickedLocation] = game.turn === game.initiatorId ? EMOJI_X : EMOJI_O;

  const rows = getButtonsForGameState(game.gameState, game.size, interaction);

  // Set the turn to the opponent
  game.turn = game.turn === game.initiatorId ? game.opponentId : game.initiatorId;

  const winner = checkWin(game, game.size);
  if (winner) {
    endGame(game, message, interaction, winner);
    return;
  } else if (checkDraw(game, game.size)) {
    endGame(game, message, interaction, null);
    return;
  }

  debugGameState(game, game.size);
  await db.findOneAndUpdate(TicTacToeSchema, { messageId: game.messageId }, game);

  message.edit({
    components: rows,
  });

  interaction.deferUpdate();
};

function endGame(
  game: TicTacToeSchemaType,
  message: Message,
  interaction: MessageComponentInteraction,
  winner: string | null
) {
  interaction.deferUpdate();
  const rows = getButtonsForGameState(game.gameState, game.size, interaction, true);

  if (winner) {
    const winnerId = winner === EMOJI_X ? game.initiatorId : game.opponentId;
    message.edit({
      content: `The winner is <@${winnerId}>!`,
      components: rows,
    });
  } else {
    message.edit({
      content: `It's a draw!`,
      components: rows,
    });
  }

  game.gameOver = true;
  db.findOneAndUpdate(TicTacToeSchema, { messageId: game.messageId }, game);
  db.cleanCache(`${env.MONGODB_DATABASE}:${TicTacToeSchema.name}:messageId:${game.messageId}`);
}

function debugGameState(game: TicTacToeSchemaType, size: number) {
  const board = Array.from({ length: size }, () => Array(size).fill("⬜"));
  for (const [key, value] of Object.entries(game.gameState)) {
    const x = parseInt(key[0], 10);
    const y = parseInt(key[1], 10);
    board[x][y] = value;
  }

  // Print each row of the board
  for (const row of board) {
    console.log(row.join(" "));
  }
}

function checkWin(game: TicTacToeSchemaType, size: number): string | null {
  const gameState = game.gameState;
  const board = Array.from({ length: size }, () => Array(size).fill("⬜"));
  for (const [key, value] of Object.entries(gameState)) {
    const x = parseInt(key[0], 10);
    const y = parseInt(key[1], 10);
    board[x][y] = value;
  }

  // Check rows and columns
  for (let i = 0; i < size; i++) {
    if (board[i].every((value) => value === EMOJI_X)) {
      return EMOJI_X;
    }
    if (board[i].every((value) => value === EMOJI_O)) {
      return EMOJI_O;
    }
    if (board.every((row) => row[i] === EMOJI_X)) {
      return EMOJI_X;
    }
    if (board.every((row) => row[i] === EMOJI_O)) {
      return EMOJI_O;
    }
  }

  // Check diagonals
  if (board.every((row, i) => row[i] === EMOJI_X)) {
    return EMOJI_X;
  }
  if (board.every((row, i) => row[i] === EMOJI_O)) {
    return EMOJI_O;
  }
  if (board.every((row, i) => row[size - i - 1] === EMOJI_X)) {
    return EMOJI_X;
  }
  if (board.every((row, i) => row[size - i - 1] === EMOJI_O)) {
    return EMOJI_O;
  }

  return null;
}

function checkDraw(game: TicTacToeSchemaType, size: number): boolean {
  const gameState = game.gameState;
  const allCellsFilled = Object.values(gameState).every((value) => value !== EMOJI_BLANK);
  return allCellsFilled && !checkWin(game, size);
}
