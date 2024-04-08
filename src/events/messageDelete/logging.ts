import { CommandKit } from "commandkit";
import { Client, Message } from "discord.js";
import logger from "fancy-log";
import { debugMsg } from "../../utils/TinyUtils";
import LoggingHandler from "../../utils/LoggingHandler";

export default async function (
  message: Message<boolean>,
  client: Client<true>,
  handler: CommandKit
) {
  new LoggingHandler(client).messageDeleted(message);
}
