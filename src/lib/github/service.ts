import { githubClient } from './client';
import { githubConfigManager } from './config';

export class GitHubService {
  private static instance: GitHubService;

  private constructor() {}

  static getInstance(): GitHubService {
    if (!GitHubService.instance) {
      GitHubService.instance = new GitHubService();
    }
    return GitHubService.instance;
  }

  /**
   * Reads repository metadata.
   * Enforces boundary allowlist before making network calls.
   */
  async getRepository(owner: string, repo: string) {
    const fullName = `${owner}/${repo}`;
    githubConfigManager.assertRepoAllowed(fullName);

    const data = await githubClient.fetch(`/repos/${owner}/${repo}`);
    return data;
  }

  /**
   * Lists repository issues.
   * Enforces boundary allowlist before making network calls.
   */
  async listIssues(owner: string, repo: string, state: string = 'open', perPage: number = 30) {
    const fullName = `${owner}/${repo}`;
    githubConfigManager.assertRepoAllowed(fullName);

    const data = await githubClient.fetch(`/repos/${owner}/${repo}/issues?state=${state}&per_page=${perPage}`);
    return data;
  }

  // TODO: Groundwork for write/propose operations (e.g. create pull request)
  // These would require additional permission checks beyond just read boundary.
}

export const githubService = GitHubService.getInstance();
