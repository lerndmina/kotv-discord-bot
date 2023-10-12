const { Schema, model } = require("mongoose");

/**
 * LinkUser Schema
 * @constructor LinkUser
 */
const linkUserSchema = new Schema({
  discordId: {
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

module.exports = model("linkUser", linkUserSchema);
