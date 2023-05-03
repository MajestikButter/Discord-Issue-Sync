import * as dotenv from "dotenv";
dotenv.config();

import { Events } from "discord.js";
import { DataFile } from "./data";
import { Discord } from "./bot";
import "./githubApp";
import "./issueSync";
import { IssueSync } from "./issueSync";

function minInterval(callback: () => Promise<void>, interval: number) {
  const loop = async () => {
    const began = new Date().getTime();
    await callback();
    const dif = new Date().getTime() - began;
    const rem = interval - dif;
    if (rem > 0) {
      setTimeout(loop, rem);
    } else loop();
  };
  setTimeout(loop, interval);
}

setInterval(DataFile.save, 15_000);
DataFile.watchChanges();

minInterval(IssueSync.syncFromLastGitHubUpdate, 6_000);

Discord.bot.on(Events.ClientReady, async (client) => {
  const user = client.user;
  console.log(`[Ready] ${user.username}#${user.discriminator}`);
});

Discord.bot.login(process.env.TOKEN);
