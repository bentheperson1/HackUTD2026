import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Message, Task, Role, ChatChannel } from '../lib/types';
import { ROLES } from '../lib/constants';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { RoleBadge } from '../components/RoleBadge';
import { Send, Megaphone, Lock } from 'lucide-react';

const CHANNELS: { id: ChatChannel; label: string; adminOnly?: boolean }[] = [
  { id: 'admin', label: 'Leadership', adminOnly: true },
  { id: 'warroom', label: 'War room' },
  { id: 'general', label: 'Company Q&A' },
];

export const WarRoomPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>(store.getState().messages);
  const [tasks, setTasks] = useState<Task[]>(store.getState().tasks);
  const [activeBroadcast, setActiveBroadcast] = useState(store.getState().activeBroadcast);
  const [slowModeSeconds, setSlowModeSeconds] = useState(store.getState().slowModeSeconds || 0);

  // Active chat channel
  const [activeChannel, setActiveChannel] = useState<ChatChannel>('warroom');
  const [inputMessage, setInputMessage] = useState('');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Slow mode client cooldown
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Task creation
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskRole, setTaskRole] = useState<Role>('it_lead');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser.role === 'owner';

  useEffect(() => {
    return store.subscribe((state) => {
      setMessages(state.messages);
      setTasks(state.tasks);
      setActiveBroadcast(state.activeBroadcast);
      setSlowModeSeconds(state.slowModeSeconds || 0);
    });
  }, []);

  // Cooldown countdown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const t = setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownRemaining]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, activeChannel]);

  // Channel access calculation
  const canAccessAdmin = isAdmin;
  // If user is switched to a role that cannot access admin, kick them to warroom or general
  useEffect(() => {
    if (activeChannel === 'admin' && !canAccessAdmin) {
      setActiveChannel('warroom');
    }
  }, [currentUser, activeChannel, canAccessAdmin]);

  useEffect(() => {
    if (!isBroadcastModalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsBroadcastModalOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isBroadcastModalOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!inputMessage.trim()) return;

    if (!isAdmin && cooldownRemaining > 0) {
      setError(`Slow mode is on. You can post again in ${cooldownRemaining}s.`);
      return;
    }

    const res = store.sendMessage(currentUser.name, currentUser.role, inputMessage, activeChannel);
    if (!res.success) {
      setError(res.error || 'Failed to send message');
    } else {
      setInputMessage('');
      if (!isAdmin && slowModeSeconds > 0) {
        setCooldownRemaining(slowModeSeconds);
      }
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;
    store.setBroadcast(currentUser.name, broadcastInput);
    setBroadcastInput('');
    setIsBroadcastModalOpen(false);
  };

  const handleClearBroadcast = () => {
    store.clearBroadcast(currentUser.name);
  };

  const handleSetSlowMode = (secs: number) => {
    store.setSlowMode(secs);
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
    if (!res.success) {
      setError(res.error || 'Failed to toggle task');
    }
  };

  // Filter messages for active channel
  const channelMessages = messages.filter((m) => (m.channel || 'warroom') === activeChannel);
  const isCoolingDown = !isAdmin && cooldownRemaining > 0;
  const openTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  return (
    <div className="space-y-6">
      {activeBroadcast && (
        <div className="flex flex-col gap-3 rounded-2xl bg-primary-container p-4 text-on-primary-container sm:flex-row sm:items-start">
          <Megaphone className="mt-0.5 h-6 w-6 shrink-0" strokeWidth={1.75} />
          <div className="min-w-0 flex-1">
            <div className="type-label-medium opacity-80">
              Broadcast from {activeBroadcast.author} at {new Date(activeBroadcast.timestamp).toLocaleTimeString()}
            </div>
            <p className="m-0 mt-1 type-title-medium">{activeBroadcast.message}</p>
          </div>
          {isAdmin && (
            <Button variant="text" onClick={handleClearBroadcast} className="!text-on-primary-container">
              Dismiss for everyone
            </Button>
          )}
        </div>
      )}

      <PageHeader
        title="War room"
        description="Team chat that runs outside company email and Slack, which are treated as compromised."
        actions={
          isAdmin && (
            <>
              <label className="flex items-center gap-2 type-label-large text-on-surface-variant">
                Slow mode
                <select
                  value={slowModeSeconds}
                  onChange={(e) => handleSetSlowMode(Number(e.target.value))}
                  className="h-10 py-0"
                >
                  <option value={0}>Off</option>
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>60s</option>
                </select>
              </label>
              <Button variant="tonal" icon={<Megaphone />} onClick={() => setIsBroadcastModalOpen(true)}>
                Broadcast
              </Button>
            </>
          )
        }
      />

      {error && <Notice tone="error">{error}</Notice>}

      {isBroadcastModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-4"
          onClick={() => setIsBroadcastModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="broadcast-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-[28px] bg-surface-container-high p-6"
          >
            <h2 id="broadcast-title" className="m-0 type-headline-small">
              Send a broadcast
            </h2>
            <p className="mb-4 mt-2 type-body-medium text-on-surface-variant">
              Pins a message above every channel for everyone on the response team until you dismiss it.
            </p>

            <form onSubmit={handleSendBroadcast}>
              <textarea
                value={broadcastInput}
                onChange={(e) => setBroadcastInput(e.target.value)}
                placeholder="Do not power off any computers. Unplug network cables now."
                rows={3}
                className="w-full"
                autoFocus
              />
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="text" onClick={() => setIsBroadcastModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="text" type="submit" disabled={!broadcastInput.trim()}>
                  Send
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 [&>*]:min-w-0">
        {/* Chat */}
        <Card className="flex flex-col overflow-hidden lg:col-span-7">
          <div role="tablist" className="flex border-b border-outline-variant px-2">
            {CHANNELS.filter((c) => !c.adminOnly || canAccessAdmin).map((c) => {
              const selected = c.id === activeChannel;
              const count = messages.filter((m) => (m.channel || 'warroom') === c.id).length;
              return (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveChannel(c.id)}
                  className={`state-layer relative flex h-12 items-center gap-1.5 whitespace-nowrap px-4 type-title-small ${
                    selected ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {c.adminOnly && <Lock className="h-3.5 w-3.5" />}
                  {c.label}
                  <span className="type-label-small opacity-70">{count}</span>
                  {selected && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-primary" />}
                </button>
              );
            })}
            {slowModeSeconds > 0 && (
              <span className="ml-auto hidden items-center px-2 type-body-small text-on-surface-variant sm:flex">
                Slow mode {slowModeSeconds}s
              </span>
            )}
          </div>

          <div className="h-[440px] space-y-4 overflow-y-auto px-4 py-4">
            {channelMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center type-body-medium text-on-surface-variant">
                No messages here yet.
              </div>
            ) : (
              channelMessages.map((m) => {
                const isMe = m.sender_name === currentUser.name;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="mb-1 flex items-center gap-2 px-1 type-body-small text-on-surface-variant">
                      {!isMe && <span className="type-label-medium text-on-surface">{m.sender_name}</span>}
                      {!isMe && <RoleBadge role={m.sender_role} />}
                      <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <p
                      className={`m-0 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 type-body-large ${
                        isMe
                          ? 'rounded-br-md bg-primary-container text-on-primary-container'
                          : 'rounded-bl-md bg-surface-container-highest text-on-surface'
                      }`}
                    >
                      {m.content}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t border-outline-variant p-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isCoolingDown}
              aria-label="Message"
              placeholder={isCoolingDown ? `Slow mode, wait ${cooldownRemaining}s` : 'Write a message'}
              className="h-12 flex-1 rounded-full border-transparent bg-surface-container-highest px-5"
            />
            <Button type="submit" disabled={isCoolingDown || !inputMessage.trim()} icon={<Send />} className="h-12">
              Send
            </Button>
          </form>
        </Card>

        {/* Tasks */}
        <div className="space-y-6 lg:col-span-5">
          <section>
            <SectionTitle trailing={`${doneTasks.length} of ${tasks.length} done`}>Action items</SectionTitle>
            <Card variant="outlined" className="max-h-[300px] overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="m-0 p-4 type-body-medium text-on-surface-variant">No action items yet.</p>
              ) : (
                <ul className="m-0 list-none divide-y divide-outline-variant p-0">
                  {[...openTasks, ...doneTasks].map((t) => (
                    <li key={t.id}>
                      <label className="state-layer flex cursor-pointer items-start gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => handleToggleTask(t.id)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className={`type-body-large ${t.done ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}
                          >
                            {t.title}
                          </div>
                          {t.description && !t.done && (
                            <div className="mt-0.5 type-body-medium text-on-surface-variant">{t.description}</div>
                          )}
                          <div className="mt-1.5 flex items-center gap-2 type-body-small text-on-surface-variant">
                            <RoleBadge role={t.role} />
                            <span>{t.assignee || 'Unassigned'}</span>
                          </div>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle>New action item</SectionTitle>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <Field label="Title">
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Revoke cloud sync API tokens"
                  className="w-full"
                />
              </Field>

              <Field label="Instructions">
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                  className="w-full"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Role">
                  <select value={taskRole} onChange={(e) => setTaskRole(e.target.value as Role)} className="w-full">
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Assignee">
                  <input
                    type="text"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    placeholder="Name"
                    className="w-full"
                  />
                </Field>
              </div>

              <Button type="submit" variant="tonal">
                Add action item
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};
