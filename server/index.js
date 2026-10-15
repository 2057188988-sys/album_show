import express from 'express';
import { db, hashPassword, verifyPassword, createToken, seed } from './db.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

seed();

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  const row = token ? db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token) : undefined;
  if (!row) return res.status(401).json({ error: '未登录' });
  req.userId = Number(row.user_id);
  next();
}

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, username: u.username, store_name: u.store_name, created_at: u.created_at };
}

// 分类映射：iTunes 英文分类 -> 爵士/嘻哈/流行/摇滚
function mapGenre(g) {
  g = String(g || '').toLowerCase();
  if (g.includes('jazz') || g.includes('blues')) return 'jazz';
  if (g.includes('hip-hop') || g.includes('rap')) return 'hiphop';
  if (g.includes('rock') || g.includes('metal') || g.includes('alternative') || g.includes('punk')) return 'rock';
  return 'pop';
}

// ---- 认证 ----
app.post('/api/auth/register', (req, res) => {
  const username = String((req.body || {}).username || '').trim();
  const password = String((req.body || {}).password || '');
  if (username.length < 2 || password.length < 4) {
    return res.status(400).json({ error: '用户名至少 2 字，密码至少 4 位' });
  }
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
    return res.status(409).json({ error: '这个用户名已被占用' });
  }
  const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, hashPassword(password));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(Number(info.lastInsertRowid));
  const token = createToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const username = String((req.body || {}).username || '').trim();
  const password = String((req.body || {}).password || '');
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const token = createToken();
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, user.id);
  res.json({ token, user: publicUser(user) });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.json({ user: publicUser(user) });
});

// ---- 我的店铺设置 ----
app.put('/api/me', auth, (req, res) => {
  const store_name = String((req.body || {}).store_name || '').trim() || 'fruityshop';
  db.prepare('UPDATE users SET store_name = ? WHERE id = ?').run(store_name, req.userId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  res.json({ user: publicUser(user) });
});

// ---- 用户主页（公开，含专辑列表）----
app.get('/api/users/:username', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: '找不到这个用户' });
  const albums = db.prepare('SELECT * FROM albums WHERE user_id = ? ORDER BY on_wall DESC, id DESC').all(user.id);
  res.json({ user: publicUser(user), albums });
});

// ---- 专辑 ----
app.get('/api/albums', auth, (req, res) => {
  const albums = db.prepare('SELECT * FROM albums WHERE user_id = ? ORDER BY on_wall DESC, id DESC').all(req.userId);
  res.json({ albums });
});

app.post('/api/albums', auth, (req, res) => {
  const b = req.body || {};
  const title = String(b.title || '').trim();
  const artist = String(b.artist || '').trim();
  if (!title || !artist) return res.status(400).json({ error: '标题和艺人必填' });
  const genre = ['jazz', 'hiphop', 'pop', 'rock'].includes(b.genre) ? b.genre : 'pop';
  const info = db.prepare(
    'INSERT INTO albums (user_id, title, artist, genre, cover_url, description, story, on_wall) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.userId, title, artist, genre, b.cover_url || '', b.description || '', b.story || '', b.on_wall ? 1 : 0);
  const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(Number(info.lastInsertRowid));
  res.json({ album });
});

app.put('/api/albums/:id', auth, (req, res) => {
  const album = db.prepare('SELECT * FROM albums WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.userId);
  if (!album) return res.status(404).json({ error: '专辑不存在' });
  const b = req.body || {};
  const story = b.story !== undefined ? String(b.story) : album.story;
  const description = b.description !== undefined ? String(b.description) : album.description;
  const on_wall = b.on_wall !== undefined ? (b.on_wall ? 1 : 0) : album.on_wall;
  const genre = ['jazz', 'hiphop', 'pop', 'rock'].includes(b.genre) ? b.genre : album.genre;
  db.prepare('UPDATE albums SET story = ?, description = ?, on_wall = ?, genre = ? WHERE id = ?')
    .run(story, description, on_wall, genre, album.id);
  res.json({ album: db.prepare('SELECT * FROM albums WHERE id = ?').get(album.id) });
});

app.delete('/api/albums/:id', auth, (req, res) => {
  const info = db.prepare('DELETE FROM albums WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.userId);
  if (Number(info.changes) === 0) return res.status(404).json({ error: '专辑不存在' });
  res.json({ ok: true });
});

// ---- iTunes 搜索代理 ----
app.get('/api/itunes/search', async (req, res) => {
  const term = String(req.query.term || '').trim();
  if (!term) return res.status(400).json({ error: '缺少搜索词' });
  try {
    const resp = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=12`
    );
    const data = await resp.json();
    const results = (data.results || []).map((r) => ({
      title: r.collectionName,
      artist: r.artistName,
      cover_url: String(r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
      genre: mapGenre(r.primaryGenreName),
      raw_genre: r.primaryGenreName,
      description: r.collectionName ? `${r.artistName} 的专辑《${r.collectionName}》` : '',
    }));
    res.json({ results });
  } catch (e) {
    res.status(502).json({ error: '搜索失败，请检查网络' });
  }
});

// 启动后异步填充种子专辑的封面（从 iTunes 拉真实封面）
async function fillSeedCovers() {
  const missing = db.prepare('SELECT id, title, artist FROM albums WHERE cover_url IS NULL OR cover_url = ?').all('');
  for (const a of missing) {
    try {
      const resp = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(a.artist + ' ' + a.title)}&entity=album&limit=1`
      );
      const data = await resp.json();
      const hit = (data.results || [])[0];
      if (hit && hit.artworkUrl100) {
        const url = String(hit.artworkUrl100).replace('100x100bb', '600x600bb');
        db.prepare('UPDATE albums SET cover_url = ? WHERE id = ?').run(url, a.id);
      }
    } catch (e) {
      // 网络失败则跳过，前端会显示占位封面
    }
  }
}
fillSeedCovers();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Album Show 后端已启动: http://localhost:${PORT}`));