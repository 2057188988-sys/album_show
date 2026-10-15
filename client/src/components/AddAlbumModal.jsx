import { useState } from 'react';
import { api } from '../api.js';

const GENRE_LABEL = { jazz: '爵士', hiphop: '嘻哈', pop: '流行', rock: '摇滚' };

export default function AddAlbumModal({ onClose, onAdded }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [genre, setGenre] = useState('pop');
  const [story, setStory] = useState('');
  const [onWall, setOnWall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function search(e) {
    e.preventDefault();
    if (!term.trim()) return;
    setSearching(true);
    setError('');
    setSelected(null);
    try {
      const data = await api.itunesSearch(term.trim());
      setResults(data.results);
      if (data.results.length === 0) setError('没搜到，换个关键词（专辑名或艺人）试试');
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function pick(r) {
    setSelected(r);
    setGenre(r.genre || 'pop');
    setStory('');
  }

  async function add() {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await api.addAlbum({
        title: selected.title,
        artist: selected.artist,
        genre,
        cover_url: selected.cover_url,
        description: selected.description,
        story,
        on_wall: onWall,
      });
      if (onAdded) onAdded();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal add-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3 className="modal-heading">添加专辑（从 iTunes 搜索）</h3>

        <form className="search-row" onSubmit={search}>
          <input
            className="field"
            placeholder="搜专辑名或艺人，如 Miles Davis"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <button className="btn btn-primary" disabled={searching}>
            {searching ? '搜索中…' : '搜索'}
          </button>
        </form>

        {error && <div className="form-error">{error}</div>}

        {!selected && results.length > 0 && (
          <div className="search-results">
            {results.map((r, i) => (
              <div className="search-item" key={i} onClick={() => pick(r)}>
                <img
                  className="search-thumb"
                  src={r.cover_url}
                  alt={r.title}
                  loading="lazy"
                  onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
                />
                <div className="search-meta">
                  <div className="search-title">{r.title}</div>
                  <div className="search-artist">{r.artist}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selected && (
          <div className="add-form">
            <div className="add-picked">
              <img className="search-thumb big" src={selected.cover_url} alt={selected.title} />
              <div>
                <div className="search-title">{selected.title}</div>
                <div className="search-artist">{selected.artist}</div>
              </div>
            </div>

            <select className="field" value={genre} onChange={(e) => setGenre(e.target.value)}>
              {Object.entries(GENRE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            <textarea
              className="field story-input"
              rows={3}
              placeholder="（可选）写一段你和这张专辑的故事"
              value={story}
              onChange={(e) => setStory(e.target.value)}
            />

            <label className="wall-toggle">
              <input type="checkbox" checked={onWall} onChange={(e) => setOnWall(e.target.checked)} />
              挂到墙上展示（精选）
            </label>

            <div className="modal-actions">
              <button className="btn" onClick={() => setSelected(null)}>返回</button>
              <button className="btn btn-primary" disabled={busy} onClick={add}>
                {busy ? '添加中…' : '添加到我的店'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}