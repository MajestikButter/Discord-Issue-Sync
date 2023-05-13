import * as fs from "fs";

if (!fs.existsSync("./config.json")) throw new Error("No config.json file found");
const config = JSON.parse(`${fs.readFileSync("./config.json")}`);

const ghConf = config.gitHub;
if (!ghConf) throw new Error("Missing gitHub config property");
if (!ghConf.appId) throw new Error("Missing gitHub.appId config property");
if (!ghConf.installationId) throw new Error("Missing gitHub.installationId config property");

export namespace Config {
  export const appId: number = ghConf.appId;
  export const installationId: number = ghConf.installationId;
  export const syncInterval: number = ghConf.syncInterval ?? 7_000;
}
