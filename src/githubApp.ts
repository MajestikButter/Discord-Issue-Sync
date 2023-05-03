import * as fs from "fs";

import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "octokit";

const pem = fs.readFileSync("private-key.pem");
export const githubApp = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: 327191,
    privateKey: `${pem}`,
    installationId: 37079650,
  },
});
