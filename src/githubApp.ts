import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "octokit";
import { Config } from "./config";

import * as fs from "fs";

if (!fs.existsSync("private-key.pem")) {
  throw new Error("no private-key.pem found");
}

const githubApp = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: Config.appId,
    privateKey: `${fs.readFileSync("private-key.pem")}`,
    installationId: Config.installationId,
  },
});

export interface RepositoryInformation {
  owner: string;
  repo: string;
}

export interface IssueDetails {
  title: string;
  body: string;
  labels: string[];
  state: "open" | "closed";
}
export type PartialIssueDetails = Partial<IssueDetails> & { title: string };

export namespace GitHubApp {
  export async function getIssues(repoInfo: RepositoryInformation, since?: string) {
    const { owner, repo } = repoInfo;
    return (
      await githubApp.request("GET /repos/{owner}/{repo}/issues", {
        owner,
        repo,
        since,
        sort: "updated",
        state: "all",
      })
    ).data;
  }

  export async function createIssue(repoInfo: RepositoryInformation, details: IssueDetails) {
    const { owner, repo } = repoInfo;
    const { labels, title, body } = details;
    return (
      await githubApp.request("POST /repos/{owner}/{repo}/issues", {
        owner,
        repo,
        title,
        body,
        labels,
      })
    ).data;
  }

  export async function editIssue(repoInfo: RepositoryInformation, issueNumber: number, details: PartialIssueDetails) {
    const { owner, repo } = repoInfo;
    const { labels, title, body, state } = details;
    return (
      await githubApp.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
        owner,
        repo,
        issue_number: issueNumber,
        title,
        body,
        labels,
        state,
      })
    ).data;
  }

  export async function getIssue(repoInfo: RepositoryInformation, issueNumber: number) {
    const { owner, repo } = repoInfo;
    return (
      await githubApp.request("GET /repos/{owner}/{repo}/issues/{issue_number}", {
        owner,
        repo,
        issue_number: issueNumber,
      })
    ).data;
  }

  export async function setIssueLocked(repoInfo: RepositoryInformation, issueNumber: number, locked = true) {
    const { owner, repo } = repoInfo;
    const method = locked ? "PUT" : "DELETE";
    await githubApp.request(method + " /repos/{owner}/{repo}/issues/{issue_number}/lock", {
      owner,
      repo,
      issue_number: issueNumber,
      lock_reason: locked ? "resolved" : undefined,
    });
  }

  export async function getIssueComments(repoInfo: RepositoryInformation, issueNumber: number, since?: string) {
    const { owner, repo } = repoInfo;
    return (
      await githubApp.request("GET /repos/{owner}/{repo}/issues/{issue_number}/comments", {
        owner,
        repo,
        issue_number: issueNumber,
        since,
      })
    ).data;
  }

  export async function createIssueComment(repoInfo: RepositoryInformation, issueNumber: number, body: string) {
    const { owner, repo } = repoInfo;
    return (
      await githubApp.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
        owner,
        repo,
        issue_number: issueNumber,
        body,
      })
    ).data;
  }

  export async function editIssueComment(repoInfo: RepositoryInformation, comment: number, body: string) {
    const { owner, repo } = repoInfo;
    await githubApp.request("PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}", {
      owner,
      repo,
      comment_id: comment,
      body,
    });
  }

  export async function deleteIssueComment(repoInfo: RepositoryInformation, comment: number) {
    const { owner, repo } = repoInfo;
    await githubApp.request("DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}", {
      owner,
      repo,
      comment_id: comment,
    });
  }
}
