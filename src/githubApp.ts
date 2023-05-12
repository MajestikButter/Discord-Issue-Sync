import * as fs from "fs";

import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "octokit";

const pem = fs.readFileSync("private-key.pem");
const githubApp = new Octokit({
  authStrategy: createAppAuth,
  auth: {
    appId: 327191,
    privateKey: `${pem}`,
    installationId: 37079650,
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
}
export type PartialIssueDetails = Partial<IssueDetails> & { title: string };

export namespace GitHubApp {
  export async function getIssues(
    repoInfo: RepositoryInformation,
    since?: string
  ) {
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

  export async function createIssue(
    repoInfo: RepositoryInformation,
    details: IssueDetails
  ) {
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

  export async function editIssue(
    repoInfo: RepositoryInformation,
    issue: number,
    details: PartialIssueDetails
  ) {
    const { owner, repo } = repoInfo;
    const { labels, title, body } = details;
    return (
      await githubApp.request("POST /repos/{owner}/{repo}/issues", {
        owner,
        repo,
        issue_number: issue,
        title,
        body,
        labels,
      })
    ).data;
  }

  export async function getIssue(
    repoInfo: RepositoryInformation,
    issue: number
  ) {
    const { owner, repo } = repoInfo;
    return (
      await githubApp.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}",
        { owner, repo, issue_number: issue }
      )
    ).data;
  }

  export async function setIssueLocked(
    repoInfo: RepositoryInformation,
    issue: number,
    locked = true
  ) {
    const { owner, repo } = repoInfo;
    return await githubApp.request(
      "PUT /repos/{owner}/{repo}/issues/{issue_number}/lock",
      {
        owner,
        repo,
        issue_number: issue,
        lock_reason: locked ? "resolved" : undefined,
      }
    );
  }

  export async function getIssueComments(
    repoInfo: RepositoryInformation,
    issue: number,
    since?: string
  ) {
    const { owner, repo } = repoInfo;
    return (
      await githubApp.request(
        "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
        { owner, repo, issue_number: issue, since }
      )
    ).data;
  }

  export async function createIssueComment(
    repoInfo: RepositoryInformation,
    issue: number,
    body: string
  ) {
    const { owner, repo } = repoInfo;
    await githubApp.request(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
      { owner, repo, issue_number: issue, body }
    );
  }

  export async function editIssueComment(
    repoInfo: RepositoryInformation,
    comment: number,
    body: string
  ) {
    const { owner, repo } = repoInfo;
    await githubApp.request(
      "PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}",
      { owner, repo, comment_id: comment, body }
    );
  }

  export async function deleteIssueComment(
    repoInfo: RepositoryInformation,
    comment: number
  ) {
    const { owner, repo } = repoInfo;
    await githubApp.request(
      "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}",
      { owner, repo, comment_id: comment }
    );
  }
}
