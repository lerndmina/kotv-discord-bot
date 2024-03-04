import { Message } from "discord.js";
import * as chrono from "chrono-node";
import moment from "moment-timezone";
import { parse } from "path";
import { debugMsg } from "./TinyUtils";

export default function (message: Message | string):
  | {
      success: true;
      message: string;
      date: Date;
      seconds: number;
    }
  | {
      success: false;
      message: string;
      date: null;
      seconds: null;
    } {
  if (typeof message !== "string") message = message.content;

  let parsed = chrono.uk.parse(message)[0];

  console.log(parsed);

  if (!parsed)
    return {
      success: false,
      message: "I couldn't parse a date from that message.",
      date: null,
      seconds: null,
    };

  const CETOffset = moment.tz("Europe/Paris").utcOffset() * -1;

  let date = moment.utc(parsed.start.date());

  // @ts-ignore
  if (parsed.start.knownValues.timezoneOffset === undefined) {
    console.log("No timezone offset found, assuming CET");
    date = date.add(CETOffset, "minutes");
    // @ts-ignore
    parsed.start.knownValues.timezoneOffset = CETOffset;
  }

  return {
    success: true,
    message: parsed.text,
    date: date.toDate(),
    seconds: Math.round(date.valueOf() / 1000),
  };
}
