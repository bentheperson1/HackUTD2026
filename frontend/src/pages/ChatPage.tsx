import React, { useState, useEffect, useRef } from 'react';
import { Send, Megaphone, Lock, MessagesSquare } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Role, ChatChannel } from '../lib/types';
import { ROLES } from '../lib/constants';
import { useAppState } from '../lib/useAppState';
import { RoleBadge } from '../components/RoleBadge';
import { Field } from '../components/Field';
import { Alert, Button, Card, EmptyState, Modal, PageHeader, Segmented, cx } from '../components/ui';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const ChatPage: React.FC = () => {
  const { currentUser, mode } = useAuth();
  const isLive = mode === 'live';
  const messages = useAppState((s) => s.messages);
  const tasks = useAppState((s) => s.tasks);
  const activeBroadcast = useAppState((s) => s.activeBroadcast);
  const slowModeSeconds = useAppState((s) => s.slowModeSeconds || 0);

  const [activeChannel, setActiveChannel] = useState<ChatChannel>('warroom');
  const [inputMessage, setInputMessage] = useState('');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskRole, setTaskRole] = useState<Role>('it_lead');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [taskView, setTaskView] = useState<'all' | 'mine' | 'open'>('all');

  const listRef = useRef<HTMLDivElement>(null);
  const isAdmin = currentUser.role === 'owner';

  // Slow mode cooldown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const t = setInterval(() => setCooldownRemaining((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldownRemaining]);

  // Scroll the message list (not the page) to the newest message
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeChannel]);

  // Non-admins can't stay in the admin room
  useEffect(() => {
    if (activeChannel === 'admin' && !isAdmin) setActiveChannel('warroom');
  }, [currentUser, activeChannel, isAdmin]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!inputMessage.trim()) return;
    if (!isAdmin && cooldownRemaining > 0) {
      setError(`Slow mode is on. Wait ${cooldownRemaining}s before sending another message.`);
      return;
    }
    const res = store.sendMessage(currentUser.name, currentUser.role, inputMessage, activeChannel);
    if (!res.success) {
      setError(res.error || 'Failed to send message');
    } else {
      setInputMessage('');
      if (!isAdmin && slowModeSeconds > 0) setCooldownRemaining(slowModeSeconds);
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;
    store.setBroadcast(currentUser.name, broadcastInput);
    setBroadcastInput('');
    setIsBroadcastModalOpen(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!taskTitle.trim()) {
      setError('Task title is required');
      return;
    }
    const res = store.createTask(currentUser.name, taskTitle, taskDesc, taskRole, taskAssignee);
    if (!res.success) {
      setError(res.error || 'Failed to create task');
    } else {
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
    }
  };

  const handleToggleTask = (taskId: string) => {
    const res = store.toggleTask(currentUser.name, taskId);
    if (!res.success) setError(res.error || 'Failed to toggle task');
  };

  const count = (c: ChatChannel) => messages.filter((m) => (m.channel || 'warroom') === c).length;
  const channelMessages = messages.filter((m) => (m.channel || 'warroom') === activeChannel);
  const coolingDown = !isAdmin && cooldownRemaining > 0;
  const doneCount = tasks.filter((t) => t.done).length;
  const visibleTasks = tasks.filter((t) => (taskView === 'mine' ? t.role === currentUser.role : taskView === 'open' ? !t.done : true));

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Respond"
        title="Chat"
        description="Message your team and assign tasks. Chat is available whether or not an incident is active."
        actions={
          isAdmin && (
            <>
              {!isLive && (
              <label className="flex items-center gap-2 text-xs text-fg-muted">
                Slow mode
                <select
                  value={slowModeSeconds}
                  onChange={(e) => store.setSlowMode(Number(e.target.value))}
                  className="h-8 w-32 py-0 text-xs"
                  aria-label="Slow mode"
                >
                  <option value={0}>Off</option>
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                </select>
              </label>
              )}
              <Button size="sm" onClick={() => setIsBroadcastModalOpen(true)}>
                <Megaphone className="h-4 w-4" />
                Broadcast
              </Button>
            </>
          )
        }
      />

      {activeBroadcast && (
        <div role="alert" className="flex items-start gap-3 bg-breach px-4 py-3 text-white">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs opacity-85">
              From {activeBroadcast.author} · {new Date(activeBroadcast.timestamp).toLocaleTimeString()}
            </div>
            <p className="font-display mt-0.5 text-[20px] leading-snug font-bold uppercase">{activeBroadcast.message}</p>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => store.clearBroadcast(currentUser.name)}>
              Clear
            </Button>
          )}
        </div>
      )}

      {error && (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<ChatChannel>
          ariaLabel="Chat channel"
          value={activeChannel}
          onChange={setActiveChannel}
          options={[
            { value: 'warroom', label: 'Response team', count: count('warroom') },
            { value: 'admin', label: <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Executive</span>, count: count('admin'), hidden: !isAdmin },
            { value: 'general', label: 'Staff questions', count: count('general') },
          ]}
        />
        {slowModeSeconds > 0 && <span className="text-xs text-fg-subtle">Slow mode: {slowModeSeconds}s between messages</span>}
      </div>

      <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
        {/* Chat */}
        <Card kind="chat" title={activeChannel === 'warroom' ? 'Response team' : activeChannel === 'admin' ? 'Executive' : 'Staff questions'} padded={false} className="flex flex-col lg:col-span-7">
          <div ref={listRef} className="h-0 min-h-[460px] flex-1 space-y-1 overflow-y-auto p-3">
            {channelMessages.length === 0 ? (
              <EmptyState
                icon={<MessagesSquare className="h-6 w-6" />}
                title="No messages in this channel yet"
              />
            ) : (
              channelMessages.map((m) => {
                const isMe = m.sender_name === currentUser.name;
                if (m.is_system) {
                  return (
                    <div key={m.id} className="flex items-baseline gap-3 px-2 py-1.5 text-xs text-fg-subtle">
                      <span className="font-mono">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="border-l-2 border-accent pl-2 text-fg-muted">{m.content}</span>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={cx('flex gap-3 rounded-md px-2 py-2', isMe && 'bg-surface-2/60')}>
                    <div
                      className={cx(
                        'flex h-8 w-8 shrink-0 items-center justify-center text-[11px] font-semibold',
                        isMe ? 'bg-accent text-bg' : 'bg-surface-3 text-fg'
                      )}
                    >
                      {initials(m.sender_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-fg">{m.sender_name}</span>
                        <RoleBadge role={m.sender_role} />
                        <span className="font-mono text-xs text-fg-subtle">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={cx('mt-0.5 text-sm leading-relaxed break-words', m.is_broadcast ? 'font-semibold text-breach-text' : 'text-fg-muted')}>
                        {m.is_broadcast && <Megaphone className="mr-1.5 inline h-3.5 w-3.5" aria-label="Broadcast" />}
                        {m.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-line p-3">
            <div className="flex gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Message
              </label>
              <input
                id="chat-input"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={coolingDown}
                placeholder={coolingDown ? `Slow mode: ${cooldownRemaining}s` : 'Write a message'}
                autoComplete="off"
              />
              <Button type="submit" variant="primary" size="lg" disabled={coolingDown || !inputMessage.trim()} aria-label="Send message">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>

        {/* Tasks */}
        <div className="space-y-6 lg:col-span-5">
          <Card
            kind="list"
            title="Tasks"
            actions={
              <Segmented<'all' | 'mine' | 'open'>
                ariaLabel="Which tasks"
                value={taskView}
                onChange={setTaskView}
                options={[
                  { value: 'all', label: 'All', count: tasks.length },
                  { value: 'mine', label: 'Mine', count: tasks.filter((t) => t.role === currentUser.role).length },
                  { value: 'open', label: 'Open', count: tasks.length - doneCount },
                ]}
              />
            }
            padded={false}
          >
            {visibleTasks.length === 0 ? (
              <EmptyState title={tasks.length ? 'No tasks match this filter' : 'No tasks yet'} />
            ) : (
              <ul className="max-h-[260px] divide-y divide-line overflow-y-auto">
                {visibleTasks.map((t) => (
                  <li key={t.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-5 py-3 hover:bg-surface-2/50">
                      <input type="checkbox" checked={t.done} onChange={() => handleToggleTask(t.id)} className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className={cx('text-sm', t.done ? 'text-fg-subtle line-through' : 'text-fg')}>{t.title}</div>
                        {t.description && <div className="mt-0.5 text-xs text-fg-subtle">{t.description}</div>}
                        <div className="mt-1.5 flex items-center gap-2">
                          <RoleBadge role={t.role} />
                          <span className="text-xs text-fg-subtle">{t.assignee || 'Unassigned'}</span>
                        </div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card kind="form" title="New task">
            <form onSubmit={handleCreateTask} className="space-y-3">
              <Field label="Task" htmlFor="task-title">
                <input id="task-title" type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="e.g. Unplug the office router" />
              </Field>
              {!isLive && (
                <Field label="Instructions (optional)" htmlFor="task-desc">
                  <textarea id="task-desc" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} rows={2} placeholder="What exactly should they do?" />
                </Field>
              )}
              <div className={cx('grid gap-3', isLive ? 'grid-cols-1' : 'grid-cols-2')}>
                <Field label="Role" htmlFor="task-role">
                  <select id="task-role" value={taskRole} onChange={(e) => setTaskRole(e.target.value as Role)}>
                    {ROLES.filter((r) => !isLive || (r.value !== 'insurer' && r.value !== 'outside_counsel')).map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {!isLive && (
                  <Field label="Assignee" htmlFor="task-assignee">
                    <input id="task-assignee" type="text" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} placeholder="Name" />
                  </Field>
                )}
              </div>
              <Button type="submit" block>
                Add task
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {isBroadcastModalOpen && (
        <Modal
          title="Send a message to everyone"
          description="Your message appears in red at the top of Chat for everyone until you clear it."
          onClose={() => setIsBroadcastModalOpen(false)}
        >
          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <label htmlFor="broadcast" className="sr-only">
              Broadcast message
            </label>
            <textarea
              id="broadcast"
              value={broadcastInput}
              onChange={(e) => setBroadcastInput(e.target.value)}
              placeholder="e.g. Do not power off any computers. Unplug network cables now."
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsBroadcastModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={!broadcastInput.trim()}>
                <Megaphone className="h-4 w-4" />
                Send broadcast
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
