/**
 * DARLEK CANN ARCHITECTURAL HEADER
 * File: src/utils/github.ts
 * Role: Core system component participating in autonomous cognitive evolution cycles.
 * Architecture: Type-safe modular unit with resilient state interfaces.
 */

export const b64ToUtf8 = (str: string): string => {
  try {
    return decodeURIComponent(
      atob(str.replace(/\s/g, ''))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    try {
      return atob(str);
    } catch {
      return str;
    }
  }
};

export const utf8ToB64 = (str: string): string => {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(Number('0x' + p1))
      )
    );
  } catch {
    return btoa(str);
  }
};

export interface GitHubFileItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubRepoInfo {
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
  stargazers_count: number;
}

export interface GitHubUserRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

async function parseJsonResponse<T = any>(res: Response, fallbackError: string): Promise<T> {
  const raw = await res.text();
  if (!raw || !raw.trim()) {
    if (!res.ok) {
      throw new Error(`${fallbackError} (HTTP ${res.status})`);
    }
    return {} as T;
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
    if (!res.ok) {
      throw new Error(`GitHub/Server returned HTML error page (HTTP ${res.status}): ${res.statusText || 'Unavailable'}`);
    }
    throw new Error('Received HTML response instead of JSON. Check repository URL and connection.');
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (err: any) {
    if (!res.ok) {
      throw new Error(`${fallbackError} (HTTP ${res.status}): ${trimmed.slice(0, 120)}`);
    }
    throw new Error(`Invalid response format from GitHub API: ${trimmed.slice(0, 100)}`);
  }
}

export async function fetchUserRepositories(token: string): Promise<GitHubUserRepo[]> {
  if (!token || !token.trim()) {
    return [];
  }
  const cleanToken = token.trim();
  
  // Try client-side direct request first with fallback to server proxy
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${cleanToken}`,
    };

    const res = await fetch(
      'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
      { headers }
    );

    if (res.ok) {
      return await parseJsonResponse<GitHubUserRepo[]>(res, 'Failed to fetch user repositories');
    }
    
    if (res.status === 401) {
      throw new Error('GitHub Authorization Failed: Invalid token or expired.');
    }
    if (res.status === 403) {
      throw new Error('GitHub Authorization Error: Rate limit or missing "repo" scope.');
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('Authorization') || err.message.includes('Rate limit'))) {
      throw err;
    }
  }

  // Server proxy fallback
  try {
    const proxyRes = await fetch('/api/github/user-repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken }),
    });
    return await parseJsonResponse<GitHubUserRepo[]>(proxyRes, 'GitHub repository handshake failed');
  } catch (proxyErr: any) {
    throw new Error(proxyErr.message || 'Unable to fetch GitHub repositories.');
  }
}

export async function fetchRepoDetails(repo: string, token: string): Promise<GitHubRepoInfo> {
  const cleanRepo = repo.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  // Try direct GitHub API call
  try {
    const res = await fetch(`https://api.github.com/repos/${cleanRepo}`, { headers });
    if (res.ok) {
      return await parseJsonResponse<GitHubRepoInfo>(res, `Failed to retrieve repository ${cleanRepo}`);
    }
    if (res.status === 404) throw new Error(`Repository "${cleanRepo}" not found (check name or token scope).`);
    if (res.status === 401) throw new Error('GitHub Authorization Failed: Invalid token.');
    if (res.status === 403) throw new Error('GitHub Rate Limit exceeded or insufficient repo permissions.');
  } catch (err: any) {
    if (err.message && (err.message.includes('not found') || err.message.includes('Authorization') || err.message.includes('Rate Limit'))) {
      throw err;
    }
  }

  // Fallback to server proxy
  const proxyRes = await fetch('/api/github/repo-details', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo: cleanRepo, token: token || undefined }),
  });
  return await parseJsonResponse<GitHubRepoInfo>(proxyRes, `Repository handshake failed for ${cleanRepo}`);
}

export async function fetchRepoTree(repo: string, branch: string, token: string): Promise<GitHubFileItem[]> {
  const cleanRepo = repo.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  let rawData: { tree?: GitHubFileItem[] } | null = null;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${cleanRepo}/git/trees/${branch}?recursive=1`,
      { headers }
    );
    if (res.ok) {
      rawData = await parseJsonResponse<{ tree?: GitHubFileItem[] }>(res, `Failed to fetch file tree for ${branch}`);
    }
  } catch {
    // Proxy fallback below
  }

  if (!rawData) {
    const proxyRes = await fetch('/api/github/repo-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: cleanRepo, branch, token: token || undefined }),
    });
    rawData = await parseJsonResponse<{ tree?: GitHubFileItem[] }>(proxyRes, `Failed to fetch file tree for ${branch}`);
  }

  return (rawData.tree || []).filter(
    (item: GitHubFileItem) =>
      item.type === 'blob' &&
      (/\.(js|jsx|ts|tsx|py|html|css|json|rs|go|c|cpp|h|md|markdown|mdx|txt)$/i.test(item.path) ||
        /readme(\.|$)/i.test(item.path)) &&
      !item.path.includes('node_modules/') &&
      !item.path.includes('dist/') &&
      !item.path.includes('.git/') &&
      !item.path.includes('package-lock.json') &&
      !item.path.includes('bun.lock') &&
      !item.path.includes('yarn.lock')
  );
}

export async function fetchFileContent(
  repo: string,
  filePath: string,
  token: string
): Promise<{ content: string; sha: string }> {
  const cleanRepo = repo.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  let data: any = null;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${cleanRepo}/contents/${filePath}`,
      { headers }
    );
    if (res.ok) {
      data = await parseJsonResponse(res, `Failed to retrieve file contents for ${filePath}`);
    }
  } catch {
    // Proxy fallback
  }

  if (!data) {
    const proxyRes = await fetch('/api/github/file-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: cleanRepo, filePath, token: token || undefined }),
    });
    data = await parseJsonResponse(proxyRes, `Failed to retrieve file ${filePath}`);
  }

  return {
    content: b64ToUtf8(data.content || ''),
    sha: data.sha,
  };
}

export async function commitFileUpdate(
  repo: string,
  filePath: string,
  content: string,
  sha: string,
  token: string,
  commitMessage: string
): Promise<{ commitSha: string }> {
  const cleanRepo = repo.trim().replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
  const body = {
    message: commitMessage,
    content: utf8ToB64(content),
    sha: sha,
  };

  // Try direct GitHub API call first
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.v3+json',
      Authorization: `Bearer ${token.trim()}`,
    };

    const res = await fetch(
      `https://api.github.com/repos/${cleanRepo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      }
    );

    if (res.ok) {
      const data = await parseJsonResponse(res, 'Failed to commit mutation');
      return { commitSha: data.commit?.sha || 'unknown' };
    }
  } catch {
    // Proxy fallback below
  }

  // Server proxy fallback
  const proxyRes = await fetch('/api/github/commit-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: cleanRepo,
      filePath,
      content: utf8ToB64(content),
      sha,
      token: token.trim(),
      commitMessage,
    }),
  });

  const data = await parseJsonResponse(proxyRes, 'Failed to commit mutation via backend proxy');
  return { commitSha: data.commit?.sha || 'unknown' };
}
