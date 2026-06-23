import { useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import type { Task } from '@/shared/schemas';
import { MAX_TASK_TEXT_LENGTH } from '@/shared/constants';

interface Props {
  tasks: Task[];
  archivedTasks: Task[];
  disabled: boolean;
  onAdd: (text: string) => Promise<void>;
  onToggle: (taskId: string) => Promise<void>;
  onUpdate: (taskId: string, text: string) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onReorder: (taskIds: string[]) => Promise<void>;
  onArchive: (taskId: string) => Promise<void>;
  onUnarchive: (taskId: string) => Promise<void>;
  onDeleteAllArchived: () => Promise<void>;
}

interface TaskEditControlsProps {
  task: Task;
  isEditing: boolean;
  disabled: boolean;
  busy: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

function TaskEditControls({
  task,
  isEditing,
  disabled,
  busy,
  onStartEdit,
  onSave,
  onCancel,
}: TaskEditControlsProps) {
  if (isEditing) {
    return (
      <div className="task-item-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={disabled || busy}
          aria-label={`${task.text} の編集を保存`}
          onClick={() => void onSave()}
        >
          保存
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={disabled || busy}
          aria-label="編集をキャンセル"
          onClick={onCancel}
        >
          キャンセル
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={disabled || busy}
      aria-label={`${task.text} を編集`}
      onClick={onStartEdit}
    >
      編集
    </button>
  );
}

export function TaskList({
  tasks,
  archivedTasks,
  disabled,
  onAdd,
  onToggle,
  onUpdate,
  onDelete,
  onReorder,
  onArchive,
  onUnarchive,
  onDeleteAllArchived,
}: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditText(task.text);
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditText('');
  };

  const saveEdit = async (taskId: string) => {
    const trimmed = editText.trim();
    if (!trimmed || disabled || busy) {
      cancelEdit();
      return;
    }

    setBusy(true);
    await onUpdate(taskId, trimmed);
    setBusy(false);
    cancelEdit();
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>, taskId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void saveEdit(taskId);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

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
  const isEditing = editingTaskId !== null;

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId || disabled || busy || isEditing) return;
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
    if (disabled || busy || isEditing) {
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

  const renderTaskText = (task: Task, completedTask = false) => {
    const editing = editingTaskId === task.id;

    if (editing) {
      return (
        <input
          type="text"
          className="inline-edit-input"
          value={editText}
          maxLength={MAX_TASK_TEXT_LENGTH}
          disabled={disabled || busy}
          aria-label="タスクを編集"
          autoFocus
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => handleEditKeyDown(e, task.id)}
        />
      );
    }

    return (
      <span className={completedTask ? 'task-text-completed' : undefined}>{task.text}</span>
    );
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
          {pending.map((task) => {
            const editing = editingTaskId === task.id;
            return (
              <li
                key={task.id}
                className={`task-item${dragId === task.id ? ' dragging' : ''}${editing ? ' editing' : ''}`}
                draggable={!disabled && !busy && !isEditing}
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
                    disabled={disabled || busy || editing}
                    aria-label={`${task.text} を完了にする`}
                    onChange={() => void onToggle(task.id)}
                  />
                  {renderTaskText(task)}
                </label>
                <div className="task-item-actions">
                  <TaskEditControls
                    task={task}
                    isEditing={editing}
                    disabled={disabled}
                    busy={busy}
                    onStartEdit={() => startEdit(task)}
                    onSave={() => void saveEdit(task.id)}
                    onCancel={cancelEdit}
                  />
                  {!editing && (
                    <button
                      type="button"
                      className="btn-icon"
                      disabled={disabled || busy}
                      aria-label={`${task.text} を削除`}
                      onClick={() => void onDelete(task.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {completed.length > 0 && (
        <>
          <h3 className="subheading">完了済み</h3>
          <ul className="task-list completed" aria-label="完了済みタスク">
            {completed.map((task) => {
              const editing = editingTaskId === task.id;
              return (
                <li key={task.id} className={`task-item${editing ? ' editing' : ''}`}>
                  <label className="task-label">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      disabled={disabled || busy || editing}
                      aria-label={`${task.text} を未完了に戻す`}
                      onChange={() => void onToggle(task.id)}
                    />
                    {renderTaskText(task, true)}
                  </label>
                  <div className="task-item-actions">
                    <TaskEditControls
                      task={task}
                      isEditing={editing}
                      disabled={disabled}
                      busy={busy}
                      onStartEdit={() => startEdit(task)}
                      onSave={() => void saveEdit(task.id)}
                      onCancel={cancelEdit}
                    />
                    {!editing && (
                      <>
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
                      </>
                    )}
                  </div>
                </li>
              );
            })}
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
            <>
              <div className="archived-toolbar">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm archived-delete-all"
                  disabled={disabled || busy}
                  aria-label={`アーカイブ済みタスク ${archivedTasks.length} 件をすべて削除`}
                  onClick={() => void onDeleteAllArchived()}
                >
                  すべて削除
                </button>
              </div>
              <ul className="task-list archived" aria-label="アーカイブ済みタスク">
                {archivedTasks.map((task) => {
                  const editing = editingTaskId === task.id;
                  return (
                    <li key={task.id} className={`task-item archived-item${editing ? ' editing' : ''}`}>
                      {editing ? (
                        <input
                          type="text"
                          className="inline-edit-input archived-edit-input"
                          value={editText}
                          maxLength={MAX_TASK_TEXT_LENGTH}
                          disabled={disabled || busy}
                          aria-label="アーカイブ済みタスクを編集"
                          autoFocus
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, task.id)}
                        />
                      ) : (
                        <span className="archived-text">{task.text}</span>
                      )}
                      <div className="task-item-actions">
                        <TaskEditControls
                          task={task}
                          isEditing={editing}
                          disabled={disabled}
                          busy={busy}
                          onStartEdit={() => startEdit(task)}
                          onSave={() => void saveEdit(task.id)}
                          onCancel={cancelEdit}
                        />
                        {!editing && (
                          <>
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
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
