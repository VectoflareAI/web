interface Env {
  ADMIN_PASSWORD: string;
  GITHUB_TOKEN: string;
  SESSION_SECRET: string;
  admin_store: KVNamespace;
}

const GITHUB_OWNER = 'VectoflareAI';
const GITHUB_REPO = 'web';
const GITHUB_BRANCH = 'main';
const POSTS_DIR = 'src/data/post';
const SESSION_TTL = 86400;
const COOKIE_NAME = 'admin_session';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/admin/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }
    if (path === '/admin/logout') {
      return handleLogout();
    }
    if (path === '/admin/change-password' && request.method === 'POST') {
      return handleChangePassword(request, env);
    }

    const session = await getSession(request, env);
    if (!session) {
      if (path === '/admin' || path.startsWith('/admin/')) {
        return serveLoginPage();
      }
    }

    if (path === '/admin' || path === '/admin/dashboard') {
      return serveDashboard(env);
    }
    if (path === '/admin/edit') {
      return serveEditor(url, env);
    }
    if (path === '/admin/save' && request.method === 'POST') {
      return handleSave(request, env);
    }
    if (path === '/admin/delete' && request.method === 'POST') {
      return handleDelete(request, env);
    }
    if (path === '/admin/new') {
      return serveNewPost();
    }
    if (path === '/admin/change-password') {
      return serveChangePasswordPage();
    }

    return new Response('Not Found', { status: 404 });
  },
};

function serveLoginPage(error?: string): Response {
  return htmlResponse(`
    <!doctype html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin Login</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh}
      .login{background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);width:360px}
      h1{font-size:22px;margin-bottom:24px;color:#111}
      label{display:block;font-size:14px;font-weight:500;margin-bottom:6px;color:#333}
      input{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:15px;margin-bottom:16px}
      input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
      button{width:100%;padding:11px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:15px;font-weight:500;cursor:pointer}
      button:hover{background:#1d4ed8}
      .error{background:#fef2f2;color:#dc2626;padding:10px;border-radius:6px;font-size:14px;margin-bottom:16px}
    </style>
    </head>
    <body>
      <div class="login">
        <h1>Vectoflare Admin</h1>
        ${error ? `<div class="error">${error}</div>` : ''}
        <form method="post" action="/admin/login">
          <label>Username</label>
          <input type="text" name="username" required autocomplete="username">
          <label>Password</label>
          <input type="password" name="password" required autocomplete="current-password">
          <button type="submit">Login</button>
        </form>
      </div>
    </body>
    </html>
  `);
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const username = form.get('username')?.toString();
  const password = form.get('password')?.toString();

  if (!username || !password) {
    return serveLoginPage('Please enter username and password');
  }

  const storedHash = await env.admin_store.get('password_hash');
  const validPassword = storedHash
    ? await verifyHash(password, storedHash)
    : password === env.ADMIN_PASSWORD;

  if (!validPassword || username !== 'admin') {
    return serveLoginPage('Invalid username or password');
  }

  if (!storedHash) {
    const hash = await hashPassword(password);
    await env.admin_store.put('password_hash', hash);
  }

  const sessionId = crypto.randomUUID();
  const payload = JSON.stringify({ u: username, e: Date.now() + SESSION_TTL * 1000 });
  const sig = await hmac(payload, env.SESSION_SECRET);
  const token = btoa(JSON.stringify({ p: payload, s: sig }));

  await env.admin_store.put(`session:${sessionId}`, token, { expirationTtl: SESSION_TTL });

  const response = new Response(null, { status: 302, headers: { Location: '/admin' } });
  response.headers.set('Set-Cookie', `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL}`);
  return response;
}

function handleLogout(): Response {
  const response = new Response(null, { status: 302, headers: { Location: '/admin' } });
  response.headers.set('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}

async function getSession(request: Request, env: Env): Promise<{ username: string } | null> {
  const cookie = parseCookie(request.headers.get('Cookie') || '', COOKIE_NAME);
  if (!cookie) return null;

  const raw = await env.admin_store.get(`session:${cookie}`);
  if (!raw) return null;

  try {
    const { p: payload, s: sig } = JSON.parse(atob(raw));
    const expected = await hmac(payload, env.SESSION_SECRET);
    if (sig !== expected) return null;
    const { u: username, e: expiry } = JSON.parse(payload);
    if (Date.now() > expiry) return null;
    return { username };
  } catch {
    return null;
  }
}

function parseCookie(cookie: string, name: string): string | null {
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

async function serveDashboard(env: Env): Promise<Response> {
  const posts = await listPosts(env);
  return htmlResponse(`
    <!doctype html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dashboard</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5}
      .header{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;align-items:center;justify-content:space-between}
      .header h1{font-size:18px;color:#111}
      .header a{color:#6b7280;text-decoration:none;font-size:14px;margin-left:16px}
      .header a:hover{color:#111}
      .container{max-width:960px;margin:32px auto;padding:0 16px}
      .actions{margin-bottom:24px}
      .actions a{display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500}
      .actions a:hover{background:#1d4ed8}
      table{width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)}
      th,td{padding:12px 16px;text-align:left;font-size:14px;border-bottom:1px solid #f3f4f6}
      th{background:#f9fafb;color:#6b7280;font-weight:500;font-size:13px;text-transform:uppercase;letter-spacing:.05em}
      td{color:#374151}
      tr:hover td{background:#f9fafb}
      .post-title{color:#2563eb;text-decoration:none;font-weight:500}
      .post-title:hover{text-decoration:underline}
      .empty{padding:48px;text-align:center;color:#9ca3af;font-size:15px}
      .badge{padding:2px 8px;border-radius:9999px;font-size:12px;background:#dbeafe;color:#1d4ed8}
      .del-btn{color:#dc2626;background:none;border:none;font-size:13px;cursor:pointer;padding:2px 6px;border-radius:4px}
      .del-btn:hover{background:#fef2f2}
    </style>
    </head>
    <body>
      <div class="header">
        <h1>Vectoflare Admin</h1>
        <div>
          <a href="/admin/change-password">Change Password</a>
          <a href="/admin/logout">Logout</a>
        </div>
      </div>
      <div class="container">
        <div class="actions"><a href="/admin/new">+ New Post</a></div>
        ${posts.length === 0 ? '<div class="empty">No posts yet. Create your first post!</div>' : `
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Date</th><th></th></tr></thead>
          <tbody>
            ${posts.map(p => `
              <tr>
                <td><a href="/admin/edit?slug=${encodeURIComponent(p.slug)}" class="post-title">${escHtml(p.title)}</a></td>
                <td>${p.category ? `<span class="badge">${escHtml(p.category)}</span>` : '-'}</td>
                <td>${p.date || '-'}</td>
                <td>
                  <form method="post" action="/admin/delete" onsubmit="return confirm('Delete this post?')" style="display:inline">
                    <input type="hidden" name="slug" value="${encodeURIComponent(p.slug)}">
                    <input type="hidden" name="sha" value="${p.sha || ''}">
                    <button type="submit" class="del-btn">Delete</button>
                  </form>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`}
      </div>
    </body>
    </html>
  `);
}

interface PostMeta {
  slug: string;
  title: string;
  category: string;
  date: string;
  sha: string;
}

interface PostData extends PostMeta {
  body: string;
  excerpt?: string;
  tags?: string;
  author?: string;
  image?: string;
  publishDate?: string;
  updateDate?: string;
  draft?: string;
}

async function listPosts(env: Env): Promise<PostMeta[]> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_DIR}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'admin-worker' },
  });
  if (!res.ok) return [];
  const files: any[] = await res.json();
  const posts: PostMeta[] = [];

  for (const file of files) {
    if (!file.name.endsWith('.md') && !file.name.endsWith('.mdx')) continue;
    const slug = file.name.replace(/\.(md|mdx)$/, '');
    const contentRes = await fetch(file.url, {
      headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'admin-worker' },
    });
    if (!contentRes.ok) continue;
    const data: any = await contentRes.json();
    const decoded = base64ToUTF8(data.content);
    const meta = parseFrontmatter(decoded);
    posts.push({
      slug,
      title: meta.title || slug,
      category: meta.category || '',
      date: meta.publishDate ? meta.publishDate.slice(0, 10) : '',
      sha: data.sha,
    });
  }
  return posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

async function getPost(slug: string, env: Env): Promise<PostData | null> {
  const filename = `${POSTS_DIR}/${slug}.md`;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'admin-worker' },
  });
  if (res.status === 404) {
    const mdxUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_DIR}/${slug}.mdx`;
    const mdxRes = await fetch(mdxUrl, {
      headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'admin-worker' },
    });
    if (!mdxRes.ok) return null;
    const data: any = await mdxRes.json();
    const decoded = base64ToUTF8(data.content);
    return { slug, sha: data.sha, ...parsePost(decoded) };
  }
  if (!res.ok) return null;
  const data: any = await res.json();
  const decoded = base64ToUTF8(data.content);
  return { slug, sha: data.sha, ...parsePost(decoded) };
}

function parsePost(raw: string) {
  const meta = parseFrontmatter(raw);
  const body = raw.replace(/^---[\s\S]*?---\s*/, '');
  return {
    title: meta.title || '',
    excerpt: meta.excerpt || '',
    category: meta.category || '',
    tags: Array.isArray(meta.tags) ? meta.tags.join(', ') : '',
    image: meta.image || '',
    publishDate: meta.publishDate || '',
    updateDate: meta.updateDate || '',
    draft: meta.draft ? 'true' : '',
    author: meta.author || '',
    body: body.trim(),
  };
}

function parseFrontmatter(raw: string): Record<string, any> {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result: Record<string, any> = {};
  let currentKey = '';
  let currentValue: any = '';
  let inList = false;
  let listItems: string[] = [];

  for (const line of yaml.split('\n')) {
    if (inList) {
      const listMatch = line.match(/^\s+-\s+(.+)/);
      if (listMatch) {
        listItems.push(listMatch[1].trim());
        continue;
      } else {
        result[currentKey] = listItems;
        inList = false;
        listItems = [];
      }
    }
    const keyMatch = line.match(/^(\w+):\s*(.*)/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      let val = keyMatch[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      currentValue = val;
      if (val === '') {
        inList = true;
        listItems = [];
        continue;
      }
      result[currentKey] = val;
    }
  }
  if (inList) result[currentKey] = listItems;
  return result;
}

function buildFrontmatter(data: Record<string, string>): string {
  const lines: string[] = ['---'];
  const fields = ['title', 'publishDate', 'updateDate', 'draft', 'excerpt', 'image', 'category', 'tags', 'author'];
  for (const f of fields) {
    const val = data[f];
    if (!val) continue;
    if (f === 'tags') {
      const tags = val.split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        lines.push('tags:');
        tags.forEach(t => lines.push(`  - ${t}`));
      }
    } else if (f === 'draft') {
      if (val === 'true') lines.push('draft: true');
    } else if (f === 'publishDate' || f === 'updateDate') {
      if (val) lines.push(`${f}: ${val}`);
    } else {
      lines.push(`${f}: ${val}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

async function serveEditor(url: URL, env: Env): Promise<Response> {
  const slug = url.searchParams.get('slug');
  if (!slug) return new Response('Missing slug', { status: 400 });

  const post = await getPost(slug, env);
  if (!post) return new Response('Post not found', { status: 404 });

  return htmlResponse(editorPage(post, false));
}

function serveNewPost(): Response {
  return htmlResponse(editorPage(null, true));
}

function editorPage(post: PostData | null, isNew: boolean): string {
  const p = post || { slug: '', title: '', excerpt: '', category: '', tags: '', image: '', publishDate: '', updateDate: '', draft: '', author: '', body: '', sha: '' };
  const action = isNew ? '/admin/save' : '/admin/save';
  return `
    <!doctype html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${isNew ? 'New Post' : 'Edit Post'}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5}
      .header{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;align-items:center;justify-content:space-between}
      .header h1{font-size:18px;color:#111}
      .header a{color:#6b7280;text-decoration:none;font-size:14px}
      .header a:hover{color:#111}
      .container{max-width:860px;margin:24px auto;padding:0 16px}
      .card{background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
      .row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      label{display:block;font-size:13px;font-weight:500;margin-bottom:4px;color:#374151}
      input,textarea,select{padding:9px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;width:100%;margin-bottom:16px}
      input:focus,textarea:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
      textarea{font-family:ui-monospace,monospace;resize:vertical;min-height:400px;line-height:1.6}
      .btn-row{display:flex;gap:12px;margin-top:8px}
      .btn-primary{padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer}
      .btn-primary:hover{background:#1d4ed8}
      .btn-secondary{padding:10px 24px;background:#f3f4f6;color:#374151;text-decoration:none;border-radius:6px;font-size:14px;display:inline-block}
      .btn-secondary:hover{background:#e5e7eb}
      .hint{color:#9ca3af;font-size:12px;margin-top:-12px;margin-bottom:16px}
    </style>
    </head>
    <body>
      <div class="header">
        <h1>${isNew ? 'New Post' : 'Edit Post'}</h1>
        <a href="/admin">Back to Dashboard</a>
      </div>
      <div class="container">
        <div class="card">
          <form method="post" action="${action}">
            ${p.sha ? `<input type="hidden" name="sha" value="${p.sha}">` : ''}
            ${!isNew ? `<input type="hidden" name="slug" value="${p.slug}">` : ''}
            <label>Title *</label>
            <input type="text" name="title" value="${escHtml(p.title)}" required ${isNew ? 'oninput="this.form.slug.value=this.value.toLowerCase().replace(/[^a-z0-9]+/g,\\'\\'-\\'\\').replace(/^-|-$/g,\\'\\'\\')"' : ''}>
            <label>Slug (filename)</label>
            <input type="text" name="slug" value="${p.slug}" required ${isNew ? '' : 'readonly style="background:#f9fafb;color:#6b7280"'}>
            <div class="row">
              <div><label>Publish Date</label><input type="datetime-local" name="publishDate" value="${p.publishDate ? p.publishDate.slice(0, 16) : ''}"></div>
              <div><label>Update Date</label><input type="datetime-local" name="updateDate" value="${p.updateDate ? p.updateDate.slice(0, 16) : ''}"></div>
            </div>
            <div class="row">
              <div><label>Category</label><input type="text" name="category" value="${escHtml(p.category)}" placeholder="e.g. Tutorials"></div>
              <div><label>Tags (comma separated)</label><input type="text" name="tags" value="${escHtml(p.tags)}" placeholder="astro, tailwind css"></div>
            </div>
            <div class="row">
              <div><label>Author</label><input type="text" name="author" value="${escHtml(p.author)}"></div>
              <div><label>Draft</label>
                <select name="draft">
                  <option value="">Published</option>
                  <option value="true" ${p.draft === 'true' ? 'selected' : ''}>Draft</option>
                </select>
              </div>
            </div>
            <label>Image URL</label>
            <input type="text" name="image" value="${escHtml(p.image)}" placeholder="https://...">
            <label>Excerpt</label>
            <input type="text" name="excerpt" value="${escHtml(p.excerpt)}">
            <label>Content (Markdown) *</label>
            <textarea name="body" required>${escHtml(p.body)}</textarea>
            <div class="hint">Write your post content in Markdown format.</div>
            <div class="btn-row">
              <button type="submit" class="btn-primary">Save & Publish</button>
              <a href="/admin" class="btn-secondary">Cancel</a>
            </div>
          </form>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function handleSave(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const slug = form.get('slug')?.toString() || crypto.randomUUID();
  const title = form.get('title')?.toString() || 'Untitled';
  const sha = form.get('sha')?.toString() || undefined;
  const publishDate = form.get('publishDate')?.toString() || new Date().toISOString().replace('Z', 'Z') || '';
  const updateDate = form.get('updateDate')?.toString() || '';
  const draft = form.get('draft')?.toString() || '';
  const excerpt = form.get('excerpt')?.toString() || '';
  const image = form.get('image')?.toString() || '';
  const category = form.get('category')?.toString() || '';
  const tags = form.get('tags')?.toString() || '';
  const author = form.get('author')?.toString() || '';
  const body = form.get('body')?.toString() || '';

  const fm = buildFrontmatter({ title, publishDate, updateDate, draft, excerpt, image, category, tags, author });
  const content = fm + '\n\n' + body;
  const encoded = utf8ToBase64(content);

  const path = `${POSTS_DIR}/${slug}.md`;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const bodyData: any = {
    message: `Update post: ${title}`,
    content: encoded,
    branch: GITHUB_BRANCH,
  };
  if (sha) bodyData.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'admin-worker', 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    const err = await res.text();
    return htmlResponse(`<html><body><h1>Save failed</h1><pre>${escHtml(err)}</pre><a href="/admin">Back</a></body></html>`);
  }

  return new Response(null, { status: 302, headers: { Location: '/admin' } });
}

async function handleDelete(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const slug = form.get('slug')?.toString();
  const sha = form.get('sha')?.toString();
  if (!slug || !sha) return new Response('Missing params', { status: 400 });

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${POSTS_DIR}/${slug}.md`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'admin-worker',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: `Delete post: ${slug}`, sha, branch: GITHUB_BRANCH }),
  });

  return new Response(null, { status: 302, headers: { Location: '/admin' } });
}

function serveChangePasswordPage(): Response {
  return htmlResponse(`
    <!doctype html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Change Password</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh}
      .card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);width:400px}
      h1{font-size:20px;margin-bottom:24px;color:#111}
      label{display:block;font-size:14px;font-weight:500;margin-bottom:6px;color:#333}
      input{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:15px;margin-bottom:16px}
      input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
      .btn-row{display:flex;gap:12px;margin-top:4px}
      button{padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer}
      button:hover{background:#1d4ed8}
      .btn-secondary{padding:10px 24px;background:#f3f4f6;color:#374151;text-decoration:none;border-radius:6px;font-size:14px}
      .btn-secondary:hover{background:#e5e7eb}
      .error{background:#fef2f2;color:#dc2626;padding:10px;border-radius:6px;font-size:14px;margin-bottom:16px}
      .success{background:#f0fdf4;color:#16a34a;padding:10px;border-radius:6px;font-size:14px;margin-bottom:16px}
    </style>
    </head>
    <body>
      <div class="card">
        <h1>Change Password</h1>
        <form method="post" action="/admin/change-password">
          <label>Current Password</label>
          <input type="password" name="current" required>
          <label>New Password</label>
          <input type="password" name="new" required minlength="6">
          <label>Confirm New Password</label>
          <input type="password" name="confirm" required minlength="6">
          <div class="btn-row">
            <button type="submit">Change Password</button>
            <a href="/admin" class="btn-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </body>
    </html>
  `);
}

async function handleChangePassword(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const current = form.get('current')?.toString() || '';
  const newPw = form.get('new')?.toString() || '';
  const confirm = form.get('confirm')?.toString() || '';

  if (newPw !== confirm) {
    return serveChangePasswordPageWithMessage('New passwords do not match', 'error');
  }
  if (newPw.length < 6) {
    return serveChangePasswordPageWithMessage('Password must be at least 6 characters', 'error');
  }

  const storedHash = await env.admin_store.get('password_hash');
  const valid = storedHash
    ? await verifyHash(current, storedHash)
    : current === env.ADMIN_PASSWORD;

  if (!valid) {
    return serveChangePasswordPageWithMessage('Current password is incorrect', 'error');
  }

  const hash = await hashPassword(newPw);
  await env.admin_store.put('password_hash', hash);
  return serveChangePasswordPageWithMessage('Password changed successfully!', 'success');
}

function serveChangePasswordPageWithMessage(message: string, type: 'error' | 'success'): Response {
  return htmlResponse(`
    <!doctype html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Change Password</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh}
      .card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);width:400px}
      h1{font-size:20px;margin-bottom:24px;color:#111}
      label{display:block;font-size:14px;font-weight:500;margin-bottom:6px;color:#333}
      input{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:15px;margin-bottom:16px}
      input:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.1)}
      .btn-row{display:flex;gap:12px;margin-top:4px}
      button{padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer}
      button:hover{background:#1d4ed8}
      .btn-secondary{padding:10px 24px;background:#f3f4f6;color:#374151;text-decoration:none;border-radius:6px;font-size:14px}
      .btn-secondary:hover{background:#e5e7eb}
      .error{background:#fef2f2;color:#dc2626;padding:10px;border-radius:6px;font-size:14px;margin-bottom:16px}
      .success{background:#f0fdf4;color:#16a34a;padding:10px;border-radius:6px;font-size:14px;margin-bottom:16px}
    </style>
    </head>
    <body>
      <div class="card">
        <h1>Change Password</h1>
        ${type === 'error' ? `<div class="error">${message}</div>` : `<div class="success">${message}</div>`}
        ${type === 'success' ? `<p style="margin-bottom:16px;color:#6b7280;font-size:14px"><a href="/admin" style="color:#2563eb">Return to Dashboard</a></p>` : `
        <form method="post" action="/admin/change-password">
          <label>Current Password</label>
          <input type="password" name="current" required>
          <label>New Password</label>
          <input type="password" name="new" required minlength="6">
          <label>Confirm New Password</label>
          <input type="password" name="confirm" required minlength="6">
          <div class="btn-row">
            <button type="submit">Change Password</button>
            <a href="/admin" class="btn-secondary">Cancel</a>
          </div>
        </form>`}
      </div>
    </body>
    </html>
  `);
}

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(password));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyHash(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

async function hmac(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function htmlResponse(html: string): Response {
  return new Response(html, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });
}

function base64ToUTF8(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
