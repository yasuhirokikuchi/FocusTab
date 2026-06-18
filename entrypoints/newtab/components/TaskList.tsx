import { useState, type DragEvent, type FormEvent } from 'react';
import type { Task } from '@/shared/schemas';
import { MAX_TASK_TEXT_LENGTH } from '@/shared/constants';

interface Props {
  tasks: Task[];
  archivedTasks: Task[];
  disabled: boolean;
  onAdd: (text: string) => Promise<void>;
  onToggle: (taskId: string) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onReorder: (taskIds: string[]) => Promise<void>;
  onArchive: (taskId: string) => Promise<void>;
  onUnarchive: (taskId: string) => Promise<void>;
}

export function TaskList({
  tasks,
  archivedTasks,
  disabled,
  onAdd,
  onToggle,
  onDelete,
  onReorder,
  onArchive,
  onUnarchive,
}: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled || busy) return;

    setBusy(true);
    await onAdd(trimmed);
    setText('');
    setBusy(false);
  };

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId || disabled || busy) return;
    const ids = pending.map((t) => t.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;

    const reordered = [...ids];
    reordered.splice(from, 1);
    reordered.splice(to, 0, dragId);

    const allIds = [...reordered, ...completed.map((t) => t.id)];

    setBusy(true);
    await onReorder(allIds);
    setBusy(false);
    setDragId(null);
  };

  const onDragStart = (e: DragEvent, taskId: string) => {
    if (disabled || busy) {
      e.preventDefault();
      return;
    }
    setDragId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <section className="panel" aria-labelledby="tasks-heading">
      <h2 id="tasks-heading">タスク</h2>

      <form className="task-form" onSubmit={(e) => void handleSubmit(e)}>
        <input
          type="text"
          className="task-input"
          placeholder="新しいタスクを追加…"
          value={text}
          maxLength={MAX_TASK_TEXT_LENGTH}
          disabled={disabled || busy}
          aria-label="新しいタスク"
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={disabled || busy || !text.trim()}
          aria-label="タスクを追加"
        >
          追加
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="empty">タスクがありません。上から追加してください。</p>
      ) : (
        <ul className="task-list" aria-label="未完了タスク">
          {pending.map((task) => (
            <li
              key={task.id}
              className={`task-item${dragId === task.id ? ' dragging' : ''}`}
              draggable={!disabled && !busy}
              onDragStart={(e) => onDragStart(e, task.id)}
              onDragOver={onDragOver}
              onDrop={() => void handleDrop(task.id)}
              onDragEnd={() => setDragId(null)}
            >
              <span className="drag-handle" aria-hidden="true" title="ドラッグして並び替え">
                ⠿
              </span>
              <label className="task-label">
                <input
                  type="checkbox"
                  checked={task.completed}
                  disabled={disabled || busy}
                  aria-label={`${task.text} を完了にする`}
                  onChange={() => void onToggle(task.id)}
                />
                <span>{task.text}</span>
              </label>
              <button
                type="button"
                className="btn-icon"
                disabled={disabled || busy}
                aria-label={`${task.text} を削除`}
                onClick={() => void onDelete(task.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {completed.length > 0 && (
        <>
          <h3 className="subheading">完了済み</h3>
          <ul className="task-list completed" aria-label="完了済みタスク">
            {completed.map((task) => (
              <li key={task.id} className="task-item">
                <label className="task-label">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    disabled={disabled || busy}
                    aria-label={`${task.text} を未完了に戻す`}
                    onChange={() => void onToggle(task.id)}
                  />
                  <span>{task.text}</span>
                </label>
                <div className="task-item-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={disabled || busy}
                    aria-label={`${task.text} をアーカイブ`}
                    onClick={() => void onArchive(task.id)}
                  >
                    アーカイブ
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    disabled={disabled || busy}
                    aria-label={`${task.text} を削除`}
                    onClick={() => void onDelete(task.id)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {archivedTasks.length > 0 && (
        <div className="archived-section">
          <button
            type="button"
            className="archived-toggle"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((v) => !v)}
          >
            アーカイブ ({archivedTasks.length})
            <span aria-hidden="true">{showArchived ? ' ▲' : ' ▼'}</span>
          </button>
          {showArchived && (
            <ul className="task-list archived" aria-label="アーカイブ済みタスク">
              {archivedTasks.map((task) => (
                <li key={task.id} className="task-item archived-item">
                  <span className="archived-text">{task.text}</span>
                  <div className="task-item-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={disabled || busy}
                      aria-label={`${task.text} を復元`}
                      onClick={() => void onUnarchive(task.id)}
                    >
                      復元
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      disabled={disabled || busy}
                      aria-label={`${task.text} を削除`}
                      onClick={() => void onDelete(task.id)}
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
