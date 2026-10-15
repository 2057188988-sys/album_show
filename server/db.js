import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'album_show.db');

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    store_name TEXT DEFAULT 'fruityshop',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    genre TEXT NOT NULL DEFAULT 'pop',
    cover_url TEXT,
    description TEXT,
    story TEXT,
    on_wall INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const test = scryptSync(password, salt, 64).toString('hex');
  return test === hash;
}

export function createToken() {
  return randomBytes(32).toString('hex');
}

// 种子数据：一个演示用户 + 若干经典专辑（封面启动后异步从 iTunes 填充）
export function seed() {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get('demo');
  if (exists) return;

  const info = db.prepare('INSERT INTO users (username, password_hash, store_name) VALUES (?, ?, ?)')
    .run('demo', hashPassword('demo123'), 'fruityshop');
  const uid = Number(info.lastInsertRowid);

  const albums = [
    ['Kind of Blue', 'Miles Davis', 'jazz', '调式爵士的开山之作，即兴的巅峰。', '大学第一次失眠，循环这张到天亮。'],
    ['A Love Supreme', 'John Coltrane', 'jazz', '柯川的宗教性四乐章巅峰。', ''],
    ['To Pimp a Butterfly', 'Kendrick Lamar', 'hiphop', '融合爵士、放克与口白的黑人史诗。', ''],
    ['The Miseducation of Lauryn Hill', 'Lauryn Hill', 'hiphop', '定义了 90 年代灵魂嘻哈的一张经典。', ''],
    ['Thriller', 'Michael Jackson', 'pop', '史上最畅销专辑之一。', ''],
    ['1989', 'Taylor Swift', 'pop', '从乡村转向流行乐的标志之作。', ''],
    ['The Dark Side of the Moon', 'Pink Floyd', 'rock', '拥有史上最经典的专辑封面之一。', ''],
    ['Nevermind', 'Nirvana', 'rock', '定义了 Grunge 时代。', ''],
  ];

  const insert = db.prepare(
    'INSERT INTO albums (user_id, title, artist, genre, description, story, on_wall) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  albums.forEach(([title, artist, genre, description, story], i) => {
    // 前 4 张放到墙上展示，其余放箱子
    insert.run(uid, title, artist, genre, description, story, i < 4 ? 1 : 0);
  });
}