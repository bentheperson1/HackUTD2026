import React, { useState, useEffect, useRef } from 'react';
import type { Identity } from 'spacetimedb';
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react';
import { reducers, tables } from '../module_bindings';
import { useAuth } from '../lib/authContext';
import { Role } from '../lib/types';
import { errorMessage, isIncidentOpen, STAFF_ROLES, toBackendRole, toDate, toUiRole } from '../lib/live';
import { Button } from '../components/Button';
import { Card, SectionTitle } from '../components/Card';
import { Field } from '../components/Field';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';
import { RoleBadge, roleLabel } from '../components/RoleBadge';
import { Send, Lock } from 'lucide-react';

// TODO: broadcasts and slow mode need backend support before they can come back

// Task.status values accepted by UpdateTask
const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'doing', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

// chatType values match Message.ChatType in the backend
const CHANNELS = [
  { chatType: 1, label: 'Leadership', adminOnly: true },
  { chatType: 2, label: 'War room', adminOnly: false },
  { chatType: 3, label: 'Company Q&A', adminOnly: false },
];

const byTime = <T,>(get: (row: T) => bigint) => (a: T, b: T) => Number(get(a) - get(b));

export const WarRoomPage: React.FC = () => {
  const { identity } = useSpacetimeDB();
  const { activeIncident, isAdmin, incidentRole } = useAuth();
  // The message table is private; each channel is read through its own server-side view
  const [adminMessages] = useTable(tables.adminMessages);
  const [incidentMessages] = useTable(tables.incidentMessages);
  const [generalMessages] = useTable(tables.generalMessages);
  const [allTasks] = useTable(tables.task);
  const [users] = useTable(tables.user);
  const sendMessage = useReducer(reducers.sendMessage);
  const createTask = useReducer(reducers.createTask);
  const updateTask = useReducer(reducers.updateTask);

  const [activeChatType, setActiveChatType] = useState(2);
  const [inputMessage, setInputMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskRole, setTaskRole] = useState<Role>('it_lead');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channels = CHANNELS.filter((c) => !c.adminOnly || isAdmin);
  const incidentId = activeIncident?.id;
  const messagesByChatType: Record<number, typeof incidentMessages> = {
    1: adminMessages,
    2: incidentMessages,
    3: generalMessages,
  };
  const channelMessages = (chatType: number) =>
    messagesByChatType[chatType]
      .filter((m) => m.incidentId === incidentId)
      .sort(byTime((m) => m.sentAt.microsSinceUnixEpoch));
  const messages = channelMessages(activeChatType);
  const tasks = allTasks.filter((t) => t.incidentId === incidentId).sort((a, b) => Number(a.id - b.id));
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  // Staff can work tasks; guests (Insurer/Counsel) can only read them
  const isStaff = !!incidentRole && STAFF_ROLES.map(toBackendRole).includes(incidentRole);
  const isOpen = !!activeIncident && isIncidentOpen(activeIncident.status);
  // UpdateTask only lets the owner or the task's own role change it
  const canUpdate = (forRole: string) => isOpen && (incidentRole === 'Owner' || incidentRole === forRole);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    }
  };

  const nameOf = (who: Identity) => users.find((u) => u.id.isEqual(who))?.displayName ?? 'Unknown';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, activeChatType]);

  // Kick non-admins out of the leadership channel
  useEffect(() => {
    if (activeChatType === 1 && !isAdmin) setActiveChatType(2);
  }, [activeChatType, isAdmin]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentId || !inputMessage.trim()) return;
    const ok = await run(() => sendMessage({ incidentId, text: inputMessage, chatType: activeChatType }));
    if (ok) setInputMessage('');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentId || !taskTitle.trim()) return;
    const ok = await run(() => createTask({ incidentId, title: taskTitle, forRole: toBackendRole(taskRole) }));
    if (ok) setTaskTitle('');
  };

  if (!activeIncident) {
    return (
      <div className="space-y-6">
        <PageHeader title="War room" description="Team chat that runs outside company email and Slack." />
        <Notice>You're not part of any incident yet. Declare one on the Incident page or ask an owner to add you.</Notice>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="War room"
        description="Team chat that runs outside company email and Slack, which are treated as compromised."
      />

      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 [&>*]:min-w-0">
        {/* Chat */}
        <Card className="flex flex-col overflow-hidden lg:col-span-7">
          <div role="tablist" className="flex border-b border-outline-variant px-2">
            {channels.map((c) => {
              const selected = c.chatType === activeChatType;
              return (
                <button
                  key={c.chatType}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveChatType(c.chatType)}
                  className={`state-layer relative flex h-12 items-center gap-1.5 whitespace-nowrap px-4 type-title-small ${
                    selected ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {c.adminOnly && <Lock className="h-3.5 w-3.5" />}
                  {c.label}
                  <span className="type-label-small opacity-70">{channelMessages(c.chatType).length}</span>
                  {selected && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-primary" />}
                </button>
              );
            })}
          </div>

          <div className="h-[440px] space-y-4 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center type-body-medium text-on-surface-variant">
                No messages here yet.
              </div>
            ) : (
              messages.map((m) => {
                if (m.isSystem) {
                  return (
                    <p key={String(m.id)} className="m-0 text-center type-body-small text-on-surface-variant">
                      {m.text}
                    </p>
                  );
                }
                const isMe = !!identity && m.sender.isEqual(identity);
                return (
                  <div key={String(m.id)} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="mb-1 flex items-center gap-2 px-1 type-body-small text-on-surface-variant">
                      {!isMe && <span className="type-label-medium text-on-surface">{nameOf(m.sender)}</span>}
                      <span>{toDate(m.sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <p
                      className={`m-0 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 type-body-large ${
                        isMe
                          ? 'rounded-br-md bg-primary-container text-on-primary-container'
                          : 'rounded-bl-md bg-surface-container-highest text-on-surface'
                      }`}
                    >
                      {m.text}
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
              aria-label="Message"
              placeholder="Write a message"
              maxLength={2000}
              className="h-12 flex-1 rounded-full border-transparent bg-surface-container-highest px-5"
            />
            <Button type="submit" disabled={!inputMessage.trim()} icon={<Send />} className="h-12">
              Send
            </Button>
          </form>
        </Card>

        {/* Tasks */}
        <div className="space-y-6 lg:col-span-5">
          <section>
            <SectionTitle trailing={`${doneCount} of ${tasks.length} done`}>Action items</SectionTitle>
            <Card variant="outlined" className="max-h-[360px] overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="m-0 p-4 type-body-medium text-on-surface-variant">No action items yet.</p>
              ) : (
                <ul className="m-0 list-none divide-y divide-outline-variant p-0">
                  {tasks.map((t) => (
                    <li key={String(t.id)} className="flex items-start gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div
                          className={`type-body-large ${
                            t.status === 'done' ? 'text-on-surface-variant line-through' : 'text-on-surface'
                          }`}
                        >
                          {t.title}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 type-body-small text-on-surface-variant">
                          <RoleBadge role={toUiRole(t.forRole)} />
                          <span>{t.assignee ? nameOf(t.assignee) : 'Unassigned'}</span>
                        </div>
                      </div>
                      <select
                        aria-label={`Status of ${t.title}`}
                        value={t.status}
                        disabled={!canUpdate(t.forRole)}
                        onChange={(e) => run(() => updateTask({ taskId: t.id, status: e.target.value }))}
                        className="h-9 shrink-0 py-0"
                      >
                        {TASK_STATUSES.map((st) => (
                          <option key={st.value} value={st.value}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {isStaff && isOpen && (
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
                    maxLength={200}
                  />
                </Field>
                <Field label="For role">
                  <select value={taskRole} onChange={(e) => setTaskRole(e.target.value as Role)} className="w-full">
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button type="submit" variant="tonal" disabled={!taskTitle.trim()}>
                  Add action item
                </Button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
