import { useState, useEffect } from 'react';
import { api } from '../api.js';

const GENRE_LABEL = { jazz: '爵士', hiphop: '嘻哈', pop: '流行', rock: '摇滚' };

export default function AlbumModal({ album, editable, onClose, onChanged }) {
  const [story, setStory] = useState(album.story || '');
  const [onWall, setOnWall] = useState(!!album.on_wall);
  const [genre, setGenre] = useState(album.genre || 'pop');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setStory(album.story || '');
    setOnWall(!!album.on_wall);
    setGenre(album.genre || 'pop');
  }, [album]);

  async function save() {
    setBusy(true);
    setMsg('');
    try {
      await api.updateAlbum(album.id, { story, on_wall: onWall, genre });
      setMsg('已保存');
      if (onChanged) onChanged();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`确定删除《${album.title}》吗？`)) return;
    setBusy(true);
    try {
      await api.deleteAlbum(album.id);
      onClose();
      if (onChanged) onChanged();
    } catch (e) {
      setMsg(e.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-body">
          <div className="modal-cover-wrap">
            <AlbumCover album={album} />
          </div>
          <div className="modal-info">
            <div className="modal-title">{album.title}</div>
            <div className="modal-artist">{album.artist}</div>
            {editable ? (
              <select className="field" value={genre} onChange={(e) => setGenre(e.target.value)}>
                {Object.entries(GENRE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            ) : (
              <span className="genre-tag">{GENRE_LABEL[album.genre] || '流行'}</span>
            )}

            {album.description && <p className="modal-desc">{album.description}</p>}

            <div className="modal-story-label">
              {editable ? '你和这张专辑的故事' : `${album.artist} 的故事`}
            </div>
            {editable ? (
              <textarea
                className="field story-input"
                rows={4}
                placeholder="写一段你和这张专辑的故事……"
                value={story}
                onChange={(e) => setStory(e.target.value)}
              />
            ) : (
              <p className="modal-story">{album.story || '（还没有写故事）'}</p>
            )}

            {editable && (
              <>
                <label className="wall-toggle">
                  <input type="checkbox" checked={onWall} onChange={(e) => setOnWall(e.target.checked)} />
                  挂到墙上展示
                </label>
                <div className="modal-actions">
                  <button className="btn btn-primary" disabled={busy} onClick={save}>保存</button>
                  <button className="btn btn-danger" disabled={busy} onClick={remove}>删除</button>
                </div>
                {msg && <div className="form-error">{msg}</div>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlbumCover({ album }) {
  const [imgFail, setImgFail] = useState(false);
  if (album.cover_url && !imgFail) {
    return <img className="modal-cover" src={album.cover_url} alt={album.title} onError={() => setImgFail(true)} />;
  }
  return <div className="album-cover-fallback big">{(album.title || '?')[0]}</div>;
}