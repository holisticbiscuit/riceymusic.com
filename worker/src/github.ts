// The few GitHub calls the admin needs: store a file, read a file, and make one commit that
// adds, replaces or removes files. A commit to the deploy branch rebuilds the site.
export type Repo = { token: string; repo: string; branch: string }

const api = async <T>(r: Repo, path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`https://api.github.com/repos/${r.repo}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${r.token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'ricey-api',
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!res.ok) {
    const msg = ((await res.json().catch(() => null)) as { message?: string } | null)?.message
    throw new GitHubError(res.status, msg ?? `GitHub said ${res.status}`)
  }
  return res.json() as Promise<T>
}

export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// The body is passed straight through ({"content": base64, "encoding": "base64"}), so a few
// megabytes of audio cost the Worker almost no CPU.
export const createBlob = (r: Repo, body: ArrayBuffer) =>
  api<{ sha: string }>(r, '/git/blobs', { method: 'POST', body })

export async function readText(r: Repo, path: string): Promise<string | null> {
  const res = await fetch(`https://api.github.com/repos/${r.repo}/contents/${path}?ref=${r.branch}`, {
    headers: {
      authorization: `Bearer ${r.token}`,
      accept: 'application/vnd.github.raw+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'ricey-api',
    },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new GitHubError(res.status, `Couldn't read ${path} (${res.status})`)
  return res.text()
}

// Files to write (a blob sha, or text) or remove (null), committed on top of the branch.
export type Change = { path: string; sha: string } | { path: string; text: string } | { path: string; remove: true }

export async function commit(r: Repo, message: string, changes: Change[]) {
  for (let attempt = 0; ; attempt++) {
    const ref = await api<{ object: { sha: string } }>(r, `/git/ref/heads/${r.branch}`)
    const parent = await api<{ tree: { sha: string } }>(r, `/git/commits/${ref.object.sha}`)
    const tree = await api<{ sha: string }>(r, '/git/trees', {
      method: 'POST',
      body: JSON.stringify({
        base_tree: parent.tree.sha,
        tree: changes.map(c =>
          'remove' in c
            ? { path: c.path, mode: '100644', type: 'blob', sha: null }
            : 'sha' in c
              ? { path: c.path, mode: '100644', type: 'blob', sha: c.sha }
              : { path: c.path, mode: '100644', type: 'blob', content: c.text },
        ),
      }),
    })
    const made = await api<{ sha: string }>(r, '/git/commits', {
      method: 'POST',
      body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
    })
    try {
      await api(r, `/git/refs/heads/${r.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: made.sha }) })
      return made.sha
    } catch (e) {
      // Someone else pushed in between: start again from the new tip.
      if (e instanceof GitHubError && e.status === 422 && attempt < 2) continue
      throw e
    }
  }
}
