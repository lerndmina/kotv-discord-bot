import https from "https";
import log from "fancy-log";
import fs from "fs";
import { URL } from "url";
import { debugMsg } from "./TinyUtils";

export default async function (url: URL, name: string, type: string) {
  return new Promise<boolean>((resolve, reject) => {
    https
      .get(url, (res) => {
        const path = `${name}.${type}`;
        const writeStream = fs.createWriteStream(path);

        res.pipe(writeStream);

        writeStream.on("finish", () => {
          writeStream.close();
          debugMsg(`Downloaded file to ${path}`);
          resolve(true);
        });
      })
      .on("error", (err) => {
        log("Download Failed");
        log(err);
        reject(false);
      });
  });
}
