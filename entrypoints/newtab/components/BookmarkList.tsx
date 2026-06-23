import { useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import type { Bookmark } from '@/shared/schemas';
import { MAX_BOOKMARK_TITLE_LENGTH } from '@/shared/constants';

interface Props {
  bookmarks: Bookmark[];
  disabled: boolean;
  onAdd: (url: string, title: string) => Promise<void>;
  onUpdate: (bookmarkId: string, url: string, title: string) => Promise<void>;
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
  onUpdate,
  onDelete,
  onReorder,
}: Props) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');

  const isEditing = editingBookmarkId !== null;

  const startEdit = (bookmark: Bookmark) => {
    setEditingBookmarkId(bookmark.id);
    setEditUrl(bookmark.url);
    setEditTitle(bookmark.title);
  };

  const cancelEdit = () => {
    setEditingBookmarkId(null);
    setEditUrl('');
    setEditTitle('');
  };

  const saveEdit = async (bookmarkId: string) => {
    const trimmedUrl = editUrl.trim();
    const trimmedTitle = editTitle.trim();
    if (!trimmedUrl || !trimmedTitle || disabled || busy) return;

    setBusy(true);
    await onUpdate(bookmarkId, normalizeUrl(trimmedUrl), trimmedTitle);
    setBusy(false);
    cancelEdit();
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>, bookmarkId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void saveEdit(bookmarkId);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

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
    if (!dragId || dragId === targetId || disabled || busy || isEditing) return;
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
    if (disabled || busy || isEditing) {
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
          {bookmarks.map((bookmark) => {
            const editing = editingBookmarkId === bookmark.id;

            if (editing) {
              return (
                <li key={bookmark.id} className="bookmark-item editing">
                  <div className="bookmark-inline-edit">
                    <input
                      type="url"
                      className="bookmark-input"
                      value={editUrl}
                      disabled={disabled || busy}
                      aria-label="ブックマーク URL を編集"
                      autoFocus
                      onChange={(e) => setEditUrl(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, bookmark.id)}
                    />
                    <input
                      type="text"
                      className="bookmark-input"
                      value={editTitle}
                      maxLength={MAX_BOOKMARK_TITLE_LENGTH}
                      disabled={disabled || busy}
                      aria-label="ブックマークタイトルを編集"
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, bookmark.id)}
                    />
                    <div className="bookmark-inline-edit-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={disabled || busy || !editUrl.trim() || !editTitle.trim()}
                        onClick={() => void saveEdit(bookmark.id)}
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={disabled || busy}
                        onClick={cancelEdit}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                </li>
              );
            }

            return (
              <li
                key={bookmark.id}
                className={`bookmark-item${dragId === bookmark.id ? ' dragging' : ''}`}
                draggable={!disabled && !busy && !isEditing}
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
                <div className="task-item-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={disabled || busy}
                    aria-label={`${bookmark.title} を編集`}
                    onClick={() => startEdit(bookmark)}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={disabled || busy}
                    aria-label={`${bookmark.title} を削除`}
                    onClick={() => void onDelete(bookmark.id)}
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
