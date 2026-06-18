import { useState, type DragEvent, type FormEvent } from 'react';
import type { Bookmark } from '@/shared/schemas';
import { MAX_BOOKMARK_TITLE_LENGTH } from '@/shared/constants';

interface Props {
  bookmarks: Bookmark[];
  disabled: boolean;
  onAdd: (url: string, title: string) => Promise<void>;
  onDelete: (bookmarkId: string) => Promise<void>;
  onReorder: (bookmarkIds: string[]) => Promise<void>;
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function BookmarkList({
  bookmarks,
  disabled,
  onAdd,
  onDelete,
  onReorder,
}: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    const trimmedTitle = title.trim();
    if (!trimmedUrl || !trimmedTitle || disabled || busy) return;

    setBusy(true);
    await onAdd(normalizeUrl(trimmedUrl), trimmedTitle);
    setUrl('');
    setTitle('');
    setBusy(false);
  };

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId || disabled || busy) return;
    const ids = bookmarks.map((b) => b.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;

    const reordered = [...ids];
    reordered.splice(from, 1);
    reordered.splice(to, 0, dragId);

    setBusy(true);
    await onReorder(reordered);
    setBusy(false);
    setDragId(null);
  };

  const onDragStart = (e: DragEvent, bookmarkId: string) => {
    if (disabled || busy) {
      e.preventDefault();
      return;
    }
    setDragId(bookmarkId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <section className="panel" aria-labelledby="bookmarks-heading">
      <h2 id="bookmarks-heading">ブックマーク</h2>

      <form className="bookmark-form" onSubmit={(e) => void handleSubmit(e)}>
        <input
          type="url"
          className="bookmark-input"
          placeholder="URL"
          value={url}
          disabled={disabled || busy}
          aria-label="ブックマーク URL"
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          type="text"
          className="bookmark-input"
          placeholder="タイトル"
          value={title}
          maxLength={MAX_BOOKMARK_TITLE_LENGTH}
          disabled={disabled || busy}
          aria-label="ブックマークタイトル"
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-secondary"
          disabled={disabled || busy || !url.trim() || !title.trim()}
          aria-label="ブックマークを追加"
        >
          追加
        </button>
      </form>

      {bookmarks.length === 0 ? (
        <p className="empty">ブックマークがありません。</p>
      ) : (
        <ul className="bookmark-list" aria-label="ブックマーク一覧">
          {bookmarks.map((bookmark) => (
            <li
              key={bookmark.id}
              className={`bookmark-item${dragId === bookmark.id ? ' dragging' : ''}`}
              draggable={!disabled && !busy}
              onDragStart={(e) => onDragStart(e, bookmark.id)}
              onDragOver={onDragOver}
              onDrop={() => void handleDrop(bookmark.id)}
              onDragEnd={() => setDragId(null)}
            >
              <span className="drag-handle" aria-hidden="true" title="ドラッグして並び替え">
                ⠿
              </span>
              <a
                href={bookmark.url}
                className="bookmark-link"
                draggable={false}
                aria-label={`${bookmark.title} を開く`}
              >
                {bookmark.title}
              </a>
              <button
                type="button"
                className="btn-icon"
                disabled={disabled || busy}
                aria-label={`${bookmark.title} を削除`}
                onClick={() => void onDelete(bookmark.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
