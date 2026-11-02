/** The admin PAT is kept server-side in the hosting provider's environment. */
export function getAdminGitHubToken(): string {
  return process.env.GITHUB_TOKEN?.trim() ?? '';
}
