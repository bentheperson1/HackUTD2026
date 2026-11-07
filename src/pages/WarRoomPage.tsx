import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Message, Task, Role } from '../lib/types';
import { ROLES } from '../lib/constants';
import { RoleBadge } from '../components/RoleBadge';
import { DataTable, Column } from '../components/DataTable';
import { Field } from '../components/Field';

export const WarRoomPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>(store.getState().messages);
  const [tasks, setTasks] = useState<Task[]>(store.getState().tasks);
  const [inputMessage, setInputMessage] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskRole, setTaskRole] = useState<Role>('it_lead');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return store.subscribe((state) => {
      setMessages(state.messages);
      setTasks(state.tasks);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!inputMessage.trim()) return;
    const res = store.sendMessage(currentUser.name, currentUser.role, inputMessage);
    if (!res.success) {
      setError(res.error || 'Failed to send message');
    } else {
      setInputMessage('');
    }
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

  const taskColumns: Column<Task>[] = [
    {
      header: 'Status',
      render: (t) => (
        <input
          type="checkbox"
          checked={t.done}
          onChange={() => handleToggleTask(t.id)}
          style={{ cursor: 'pointer', transform: 'scale(1.3)' }}
        />
      ),
    },
    {
      header: 'Task Title & Description',
      render: (t) => (
        <div style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#888' : '#000' }}>
          <strong>{t.title}</strong>
          {t.description && <div style={{ fontSize: '0.85em', color: '#555' }}>{t.description}</div>}
        </div>
      ),
    },
    {
      header: 'Designated Role',
      render: (t) => <RoleBadge role={t.role} />,
    },
    {
      header: 'Assignee',
      render: (t) => t.assignee || 'Unassigned',
    },
    {
      header: 'Created',
      render: (t) => new Date(t.created_at).toLocaleTimeString(),
    },
  ];

  return (
    <div>
      <h3>Live War Room &amp; Tactical Dispatch</h3>
      <p>
        Zero-trust communications hub isolated from company network.
        Coordinate triage steps, log forensic observations, and assign role-specific tasks in real time.
      </p>

      {error && <div style={{ color: 'red', fontWeight: 'bold', marginBottom: '10px' }}>Error: {error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left Column: Realtime Chat */}
        <div>
          <h4>Encrypted Crisis Chat</h4>
          <div
            style={{
              height: '350px',
              border: '1px solid #ccc',
              overflowY: 'auto',
              padding: '12px',
              backgroundColor: '#fafafa',
              marginBottom: '10px',
            }}
          >
            {messages.map((m) => (
              <div key={m.id} style={{ marginBottom: '10px', borderBottom: '1px dotted #ddd', paddingBottom: '6px' }}>
                <div style={{ fontSize: '0.85em', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    <strong>{m.sender_name}</strong> <RoleBadge role={m.sender_role} />
                  </span>
                  <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <div style={{ marginTop: '4px', wordBreak: 'break-word' }}>{m.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type crisis communication..."
              style={{ flexGrow: 1, padding: '8px' }}
            />
            <button type="submit" style={{ padding: '8px 16px', fontWeight: 'bold' }}>
              Send
            </button>
          </form>
        </div>

        {/* Right Column: Role-based Task List */}
        <div>
          <h4>Role-Based Action Items</h4>
          <DataTable columns={taskColumns} data={tasks} emptyMessage="No tasks created yet." />

          <fieldset style={{ marginTop: '16px', padding: '12px' }}>
            <legend><strong>Create Role-Based Task</strong></legend>
            <form onSubmit={handleCreateTask}>
              <Field label="Task Title">
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Cut cloud IAM service accounts"
                  style={{ width: '100%', padding: '6px' }}
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Specific actions or containment requirements"
                  rows={2}
                  style={{ width: '100%', padding: '6px' }}
                />
              </Field>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Field label="Responsible Role">
                  <select
                    value={taskRole}
                    onChange={(e) => setTaskRole(e.target.value as Role)}
                    style={{ padding: '6px' }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Assignee Name">
                  <input
                    type="text"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    placeholder="e.g. Taylor IT Lead"
                    style={{ padding: '6px' }}
                  />
                </Field>
              </div>

              <button type="submit" style={{ padding: '6px 14px', fontWeight: 'bold' }}>
                Add Task
              </button>
            </form>
          </fieldset>
        </div>
      </div>
    </div>
  );
};

