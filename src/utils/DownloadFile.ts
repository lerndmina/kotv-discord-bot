import https from "https";
import { log } from "itsasht-logger";
import fs from "fs";
import { Url } from "url";

export default async function (url: Url, name: string, type: string) {
  return new Promise<void>((resolve, reject) => {
    https
      .get(url, (res) => {
        const path = `${name}.${type}`;
        const writeStream = fs.createWriteStream(path);

        res.pipe(writeStream);

        writeStream.on("finish", () => {
          writeStream.close();
          resolve();
        });
      })
      .on("error", (err) => {
        log.info("Download Failed");
        reject(err);
      });
  });
}
