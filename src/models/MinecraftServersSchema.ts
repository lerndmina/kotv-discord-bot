import { randomUUID } from "crypto";
import { InferSchemaType, Schema, model } from "mongoose";

const ServerSchema = new Schema({
  serverName: {
    type: String,
    required: true,
  },
  serverIp: {
    type: String,
    required: true,
  },
  serverPort: {
    type: Number,
    required: true,
  },
});

const MinecraftServersSchema = new Schema({
  servers: Array,
  guildId: {
    type: String,
    required: true,
  },
});

export default model("MinecraftServers", MinecraftServersSchema);

export type MinecraftServersType = InferSchemaType<typeof MinecraftServersSchema>;

export type SingleServerType = InferSchemaType<typeof ServerSchema>;
