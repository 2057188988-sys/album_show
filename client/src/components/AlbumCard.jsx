import { useState } from 'react';

export default function AlbumCard({ album, onOpen }) {
  const [imgFail, setImgFail] = useState(false);
  const hasCover = album.cover_url && !imgFail;

  return (
    <div className="album-card" onClick={() => onOpen(album)}>
      <div className="album-cover">
        {hasCover ? (
          <img
            src={album.cover_url}
            alt={`${album.artist} - ${album.title}`}
            loading="lazy"
            onError={() => setImgFail(true)}
          />
        ) : (
          <div className="album-cover-fallback">{(album.title || '?')[0]}</div>
        )}
      </div>
      <div className="album-meta">
        <div className="album-title">{album.title}</div>
        <div className="album-artist">{album.artist}</div>
      </div>
    </div>
  );
}