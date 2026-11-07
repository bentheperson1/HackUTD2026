import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/authContext';
import { store } from '../lib/store';
import { Message, Task, Role, ChatChannel } from '../lib/types';
import { ROLES } from '../lib/constants';
import {
  MessageSquare,
  Send,
  CheckSquare,
  PlusCircle,
  AlertCircle,
  Clock,
  Radio,
  User,
  Megaphone,
  Sliders,
  Shield,
  Lock,
  Users,
  XCircle,
  BellRing,
} from 'lucide-react';

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  // Channel access calculation
  const canAccessAdmin = isAdmin;
  // If user is switched to a role that cannot access admin, kick them to warroom or general
  useEffect(() => {
    if (activeChannel === 'admin' && !canAccessAdmin) {
      setActiveChannel('warroom');
    }
  }, [currentUser, activeChannel, canAccessAdmin]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!inputMessage.trim()) return;

    if (!isAdmin && cooldownRemaining > 0) {
      setError(`Slow mode active. Please wait ${cooldownRemaining}s before sending another message.`);
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

  return (
    <div className="space-y-6">
      {/* 1. All-Hands Emergency Broadcast Banner (Cuts Through All Noise) */}
      {activeBroadcast && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-600/30 via-hazard-yellow/20 to-amber-600/30 border-2 border-hazard-bright text-white shadow-2xl flex items-start justify-between gap-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-hazard-bright text-black rounded-lg shrink-0 mt-0.5">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-hazard-yellow text-black px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                  📢 EMERGENCY ALL-HANDS BROADCAST
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  Authorized by {activeBroadcast.author} at {new Date(activeBroadcast.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm md:text-base font-extrabold text-white mt-1 mb-0 leading-relaxed">
                {activeBroadcast.message}
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={handleClearBroadcast}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-[#0B0D11]/70 hover:bg-[#0B0D11] border border-border rounded-lg shrink-0 flex items-center gap-1"
              title="Clear Broadcast for everyone"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Dismiss</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Header & Admin Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
            <Radio className="w-5 h-5 text-hazard-yellow" />
            <span>Crisis Command Communications</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-0">
            Multi-tier out-of-band communication hub separated from compromised company infrastructure.
          </p>
        </div>

        {/* Admin Controls Strip */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 bg-[#12161F] p-2 rounded-xl border border-border">
            <span className="text-[11px] font-bold text-hazard-bright uppercase px-2 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-hazard-yellow" />
              <span>Admin Powers:</span>
            </span>

            {/* Broadcast Trigger Button */}
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-3 py-1.5 bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-sm transition-all"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Make Broadcast</span>
            </button>

            {/* Slow Mode Selector */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#262C38]">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-300">Slow Mode:</span>
              <select
                value={slowModeSeconds}
                onChange={(e) => handleSetSlowMode(Number(e.target.value))}
                className="text-xs py-1 px-2 font-bold"
              >
                <option value={0}>Off (Instant)</option>
                <option value={15}>15 Seconds</option>
                <option value={30}>30 Seconds</option>
                <option value={60}>60 Seconds</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Broadcast Creation Modal */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-card border-2 border-hazard-yellow rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2 m-0">
                <Megaphone className="w-5 h-5 text-hazard-yellow" />
                <span>Issue All-Hands Emergency Broadcast</span>
              </h3>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-300 m-0">
              This message cuts through all channels and locks a flashing warning banner on every staff member's screen.
            </p>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <textarea
                value={broadcastInput}
                onChange={(e) => setBroadcastInput(e.target.value)}
                placeholder="e.g. MANDATORY: Do NOT power off any computers. Pull blue ethernet cables immediately."
                rows={3}
                className="w-full text-sm font-semibold"
                autoFocus
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-lg border border-border text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1.5"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Transmit Broadcast</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Three-Tier Room Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1">
        {canAccessAdmin && (
          <button
            onClick={() => setActiveChannel('admin')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeChannel === 'admin'
                ? 'bg-rose-950/60 border border-rose-600 text-rose-300 font-black shadow-md'
                : 'bg-card text-slate-400 hover:text-white border border-border'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Executive Admin Room</span>
            <span className="text-[10px] bg-rose-900/40 px-1.5 py-0.2 rounded font-mono">
              {messages.filter((m) => m.channel === 'admin').length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveChannel('warroom')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeChannel === 'warroom'
              ? 'bg-hazard-yellow text-black font-black shadow-md shadow-hazard-yellow/20'
              : 'bg-card text-slate-400 hover:text-white border border-border'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Incident War Room</span>
          <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded font-mono">
            {messages.filter((m) => (m.channel || 'warroom') === 'warroom').length}
          </span>
        </button>

        <button
          onClick={() => setActiveChannel('general')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeChannel === 'general'
              ? 'bg-slate-700 text-white font-black shadow-md'
              : 'bg-card text-slate-400 hover:text-white border border-border'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>General Company Q&amp;A</span>
          <span className="text-[10px] bg-[#1E2431] px-1.5 py-0.2 rounded font-mono">
            {messages.filter((m) => m.channel === 'general').length}
          </span>
        </button>

        <div className="ml-auto text-xs text-slate-400 hidden sm:flex items-center gap-2">
          {slowModeSeconds > 0 && (
            <span className="text-amber-400 font-mono text-[11px] bg-amber-950/30 px-2 py-0.5 rounded border border-amber-800/40">
              Slow Mode: {slowModeSeconds}s
            </span>
          )}
          <span>
            Room Access: <strong className="text-slate-200 capitalize">{activeChannel} Channel</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Channel Chat Feed & Input */}
        <div className="lg:col-span-7 flex flex-col bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-3.5 bg-[#12161F] border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <MessageSquare className="w-4 h-4 text-hazard-yellow" />
              <span className="capitalize">{activeChannel} Feed</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{channelMessages.length} messages</span>
          </div>

          {/* Messages Feed */}
          <div className="h-[430px] overflow-y-auto p-4 space-y-3 bg-[#0B0D11]/70">
            {channelMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                <MessageSquare className="w-8 h-8 opacity-40" />
                <span>No messages in this room yet. Send the first dispatch below.</span>
              </div>
            ) : (
              channelMessages.map((m) => {
                const isMe = m.sender_name === currentUser.name;
                return (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isMe
                        ? 'bg-[#181F2C] border-hazard-yellow/40 ml-4'
                        : 'bg-[#131720] border-[#222937] mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {m.sender_name}
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-[#1F2736] text-hazard-bright border border-[#2E3A50]">
                          {m.sender_role}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(m.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 m-0 break-words leading-relaxed">
                      {m.content}
                    </p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-[#12161F] border-t border-border">
            <form onSubmit={handleSendMessage} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={!isAdmin && cooldownRemaining > 0}
                  placeholder={
                    !isAdmin && cooldownRemaining > 0
                      ? `Slow mode active (${cooldownRemaining}s cooldown)...`
                      : `Message #${activeChannel} channel...`
                  }
                  className="flex-1 bg-[#0B0D11] border border-[#2E384D] focus:border-hazard-yellow rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!isAdmin && cooldownRemaining > 0}
                  className="min-h-[44px] px-5 bg-hazard-yellow hover:bg-hazard-bright text-black font-extrabold text-xs uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-md shadow-hazard-yellow/20 transition-all shrink-0 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>

              {!isAdmin && cooldownRemaining > 0 && (
                <div className="text-[11px] text-amber-400 font-mono">
                  ⏳ Slow mode rate limit: {cooldownRemaining} seconds remaining before your next post.
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column (5 cols): Incident Tasks & Dispatch */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-border pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 m-0">
                <CheckSquare className="w-4 h-4 text-hazard-yellow" />
                <span>Action Items by Role</span>
              </h3>
              <span className="text-xs text-slate-400">
                {tasks.filter((t) => t.done).length} of {tasks.length} Completed
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-2">No tasks created yet.</p>
              ) : (
                tasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTask(t.id)}
                    className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                      t.done
                        ? 'bg-[#0B0D11]/60 border-[#1C222E] opacity-60'
                        : 'bg-[#12161F] border-[#262C38] hover:border-hazard-yellow/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => {}}
                      className="mt-0.5 h-4 w-4 rounded bg-[#0B0D11] border-[#2D3648] text-hazard-yellow focus:ring-hazard-yellow cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-xs font-bold ${
                          t.done ? 'line-through text-slate-500' : 'text-slate-100'
                        }`}
                      >
                        {t.title}
                      </div>
                      {t.description && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {t.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                        <span className="bg-[#1C222E] text-hazard-bright px-1.5 py-0.5 rounded border border-[#2D3646] uppercase font-semibold">
                          {t.role}
                        </span>
                        <span className="text-slate-500">
                          Assignee: {t.assignee || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Create Task Form */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-hazard-bright mb-3 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-hazard-yellow" />
              <span>Assign New Action Item</span>
            </h4>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Action Title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Sever cloud API synchronization tokens"
                  className="w-full text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Guidance / Instructions
                </label>
                <textarea
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Provide technical instructions or legal preservation guidelines"
                  rows={2}
                  className="w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Responsible Role
                  </label>
                  <select
                    value={taskRole}
                    onChange={(e) => setTaskRole(e.target.value as Role)}
                    className="w-full text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Assignee Person
                  </label>
                  <input
                    type="text"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    placeholder="e.g. Taylor IT Lead"
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[42px] bg-[#1C222E] hover:bg-[#252E3E] border border-hazard-yellow/40 hover:border-hazard-yellow text-hazard-bright font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
              >
                + Commit Action Item to War Room
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
