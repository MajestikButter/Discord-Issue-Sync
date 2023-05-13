import { Endpoints } from "@octokit/types";

export type GetListedIssueData = Endpoints["GET /repos/{owner}/{repo}/issues"]["response"]["data"][number];