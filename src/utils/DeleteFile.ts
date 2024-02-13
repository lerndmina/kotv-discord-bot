import fs from "fs";
import { log } from "itsasht-logger";

export default function (name: string, type: string) {
  const filename = `${name}.${type}`;
  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  } else {
    log.info(`File ${filename} does not exist.`);
  }
}
