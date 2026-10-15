import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import AlbumCard from '../components/AlbumCard.jsx';
import AlbumModal from '../components/AlbumModal.jsx';
import AddAlbumModal from '../components/AddAlbumModal.jsx';

const GENRES = [
  { key: 'all', label: '全部' },
  { key: 'jazz', label: '爵士' },
  { key: 'hiphop', label: '嘻哈' },
  { key: 'pop', label: '流行' },
  { key: 'rock', label: '摇滚' },
];

export default function Shop() {
  const { username } = useParams();
  const nav = useNavigate();
  const { user, logout } = useAuth();

  const isMe = username === 'me';
  const [owner, setOwner] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [view, setView] = useState('front');
  const [genre, setGenre] = useState('all');
  const [openAlbum, setOpenAlbum] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const editable = isMe;

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (isMe) {
        if (!user) {
          nav('/login');
          return;
        }
        const [me, my] = await Promise.all([api.me(), api.myAlbums()]);
        setOwner(me.user);
        setAlbums(my.albums);
      } else {
        const { user: u, albums: a } = await api.getUser(username);
        setOwner(u);
        setAlbums(a);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setView('front');
    setGenre('all');
    setOpenAlbum(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  if (loading) return <div className="loading-screen">正在开门…</div>;
  if (error && !owner) return <div className="loading-screen">{error}</div>;

  const filtered = genre === 'all' ? albums : albums.filter((a) => a.genre === genre);
  const wall = filtered.filter((a) => a.on_wall);
  const crates = filtered.filter((a) => !a.on_wall);

  return (
    <div className="shop">
      <TopBar
        isMe={isMe}
        user={user}
        owner={owner}
        view={view}
        onBack={() => setView('front')}
        onLogout={() => {
          logout();
          nav('/login');
        }}
      />

      {view === 'front' ? (
        <Storefront
          owner={owner}
          editable={editable}
          wall={albums.filter((a) => a.on_wall)}
          onEnter={() => setView('inside')}
          onSaved={() => load()}
        />
      ) : (
        <Interior
          owner={owner}
          editable={editable}
          genre={genre}
          setGenre={setGenre}
          wall={wall}
          crates={crates}
          onOpen={setOpenAlbum}
          onAdd={() => setShowAdd(true)}
        />
      )}

      {openAlbum && (
        <AlbumModal
          album={openAlbum}
          editable={editable}
          onClose={() => setOpenAlbum(null)}
          onChanged={() => {
            setOpenAlbum(null);
            load();
          }}
        />
      )}

      {showAdd && editable && (
        <AddAlbumModal onClose={() => setShowAdd(false)} onAdded={() => load()} />
      )}
    </div>
  );
}

function TopBar({ isMe, user, owner, view, onBack, onLogout }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');

  function search(e) {
    e.preventDefault();
    const name = q.trim();
    if (!name) return;
    nav(`/shop/${encodeURIComponent(name)}`);
    setQ('');
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        {view === 'inside' && (
          <button className="btn btn-ghost" onClick={onBack}>← 外立面</button>
        )}
        <button className="btn btn-ghost" onClick={() => nav(isMe ? '/shop/me' : '/login')}>
          我的店
        </button>
      </div>

      <form className="topbar-search" onSubmit={search}>
        <input
          placeholder="搜索别人的 ID 去逛店…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      <div className="topbar-right">
        {user ? (
          <>
            <span className="topbar-user">@{user.username}</span>
            <button className="btn btn-ghost" onClick={onLogout}>退出</button>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={() => nav('/login')}>登录</button>
        )}
      </div>
    </header>
  );
}

function Storefront({ owner, editable, wall, onEnter, onSaved }) {
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(owner.store_name);

  async function saveName() {
    const v = name.trim() || 'fruityshop';
    await api.updateMe(v);
    setEditName(false);
    onSaved();
  }

  return (
    <div className="storefront">
      <div className="rooftop" />

      <div className="signband">
        <span className="sign-lamp" />
        {editable && editName ? (
          <input
            className="store-name-input"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
          />
        ) : (
          <span
            className="store-name"
            onClick={() => editable && setEditName(true)}
            title={editable ? '点击改店名' : ''}
          >
            {owner.store_name || 'fruityshop'}
          </span>
        )}
      </div>

      <div className="facade">
        <div className="window-panel left">
          <img className="poster" src="/textures/poster.jpg" alt="" />
        </div>

        <button className="glass-door" onClick={onEnter}>
          <span className="door-handle left" />
          <span className="door-handle right" />
          <div className="door-label">推门进入</div>
        </button>

        <div className="window-panel right">
          <img className="poster" src="/textures/poster.jpg" alt="" />
        </div>
      </div>

      <div className="sidewalk" />
    </div>
  );
}

function Interior({ owner, editable, genre, setGenre, wall, crates, onOpen, onAdd }) {
  return (
    <div className="interior">
      <div className="genre-tabs">
        {GENRES.map((g) => (
          <button
            key={g.key}
            className={genre === g.key ? 'genre-tab active' : 'genre-tab'}
            onClick={() => setGenre(g.key)}
          >
            {g.label}
          </button>
        ))}
        {editable && (
          <button className="btn btn-primary add-btn" onClick={onAdd}>+ 添加专辑</button>
        )}
      </div>

      <section className="wall-section">
        <h3 className="section-title">墙上 · 我的精选</h3>
        {wall.length ? (
          <div className="wall-shelf">
            <div className="wall-cards">
              {wall.map((a) => (
                <div className="wall-item" key={a.id}>
                  <AlbumCard album={a} onOpen={onOpen} />
                </div>
              ))}
            </div>
            <div className="shelf-board" />
          </div>
        ) : (
          <p className="empty">这个分类下还没有上墙的唱片</p>
        )}
      </section>

      <section className="crate-section">
        <h3 className="section-title">箱子里 · 我的收藏</h3>
        {crates.length ? (
          <div className="crates">
            {crates.map((a) => (
              <div className="crate" key={a.id}>
                <div className="crate-box">
                  <div className="crate-face crate-back" />
                  <div className="crate-face crate-side left" />
                  <div className="crate-face crate-side right" />
                  <div className="crate-face crate-bottom" />
                  <div className="crate-lp">
                    <AlbumCard album={a} onOpen={onOpen} />
                  </div>
                  <div className="crate-face crate-front" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">箱子里还没有唱片{editable ? '，点右上角「添加专辑」开始收藏' : ''}</p>
        )}
      </section>

      <div className="interior-floor" />
    </div>
  );
}