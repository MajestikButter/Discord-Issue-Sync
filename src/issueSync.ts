import { Endpoints } from "@octokit/types";
import { Discord } from "./bot";
import { DataFile } from "./data";
import { GitHubApp, RepositoryInformation } from "./githubApp";
import { ForumChannel, ThreadChannel } from "discord.js";
import { getTaggedChannels } from "./repolink";

type GetListedIssueData =
  Endpoints["GET /repos/{owner}/{repo}/issues"]["response"]["data"][number];

export async function createIssue(
  issue: GetListedIssueData,
  forum: ForumChannel
) {
}
export async function editIssue(
  issue: GetListedIssueData,
  thread: ThreadChannel
) {}

export async function syncIssues(repoInfo: RepositoryInformation) {
  const issues = await GitHubApp.getIssues(repoInfo, DataFile.getLastUpdate());

  if (issues.length <= 0) return;

  await Promise.allSettled(
    issues.map((issue) => {
      const threadIds = DataFile.getThreadIds(issue.id);

      const forums = getTaggedChannels(
        issue.labels.map((v) => (typeof v == "string" ? v : v.name ?? ""))
      );
      if (!threadId) {
        return createIssue(issue);
      } else return editIssue(issue);
    })
  );
  DataFile.data.lastGitUpdate = new Date().toISOString();
}
