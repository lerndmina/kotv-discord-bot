import { Schema, model } from "mongoose";

/**
 * LinkUser Schema
 * @constructor LinkUser
 */
const linkUserSchema = new Schema({
  discordId: {
    // TODO make not unique allow multiple accounts to be linked, not using findOne
    type: String,
    required: true,
  },
  ps2Id: {
    type: String,
    required: true,
  },
  ps2Name: {
    type: String,
    required: true,
  },
  isInKOTV: {
    type: Boolean,
    required: true,
  },
  kotvRank: {
    type: String,
    required: false,
  },
  // ps2Characters: {
  //   type: [
  //     {
  //       id: { type: String, required: true },
  //       name: { type: String, required: true },
  //       lastLogin: { type: Number, required: true },
  //       isInKOTV: { type: Boolean, required: true },
  //     },
  //   ],
  //   required: true,
  // },
});

export default model("linkUser", linkUserSchema);
