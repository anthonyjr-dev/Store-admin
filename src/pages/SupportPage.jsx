import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupportSocket, SUPPORT_API_BASE } from '../supportSocket.js';

const STATUS_PILL = {
  waiting: 'bg-amber-950/60 text-amber-300',
  live: 'bg-green-950/60 text-green-400',
  bot: 'bg-[#252525] text-gray-500',
  closed: 'bg-[#252525] text-gray-600',
};
const STATUS_LABEL = { waiting: 'Waiting', live: 'Live', bot: 'AI bot', closed: 'Closed' };

function relTime(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function SupportPage({ token, agentName }) {
  const [sessions, setSessions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [openMeta, setOpenMeta] = useState(null);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const openIdRef = useRef(null);
  openIdRef.current = openId;

  const socket = useMemo(() => getSupportSocket(token, agentName), [token, agentName]);

  useEffect(() => {
    const onSessions = (rows) => setSessions(Array.isArray(rows) ? rows : []);
    const onReady = (p) => {
      setMessages(p.messages ?? []);
      setOpenMeta(p.session ?? null);
    };
    const onMessage = (m) => {
      if (m.session_id === openIdRef.current) {
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      }
    };
    const onWaiting = () => {
      try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==').play(); } catch { /* ignore */ }
    };

    socket.on('support:sessions', onSessions);
    socket.on('chat:ready', onReady);
    socket.on('chat:message', onMessage);
    socket.on('support:waiting', onWaiting);
    socket.emit('agent:sessions');
    const poll = setInterval(() => socket.emit('agent:sessions'), 15000);

    return () => {
      socket.off('support:sessions', onSessions);
      socket.off('chat:ready', onReady);
      socket.off('chat:message', onMessage);
      socket.off('support:waiting', onWaiting);
      clearInterval(poll);
    };
  }, [socket]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const openSession = useCallback((id) => {
    setOpenId(id);
    setMessages([]);
    socket.emit('agent:open', { sessionId: id });
  }, [socket]);

  const send = () => {
    const text = input.trim();
    if (!text || !openId) return;
    socket.emit('agent:send', { sessionId: openId, text });
    setInput('');
  };

  const closeChat = () => {
    if (openId && window.confirm('Close this chat for the customer?')) {
      socket.emit('agent:close', { sessionId: openId });
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !openId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch(`${SUPPORT_API_BASE}/support-chat/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) socket.emit('agent:send', { sessionId: openId, imageUrl: `${SUPPORT_API_BASE}${data.url}` });
    } catch { /* ignore */ }
    finally { setUploading(false); }
  };

  const waitingCount = sessions.filter((s) => s.status === 'waiting').length;

  return (
    <section className="flex h-[calc(100vh-48px)] gap-4">
      {/* Session list */}
      <div className={`w-full md:w-[320px] shrink-0 flex-col rounded-2xl border border-gray-800 bg-[#161616] overflow-hidden ${openId ? 'hidden md:flex' : 'flex'}`}>
        <div className="border-b border-gray-800 px-4 py-3">
          <h2 className="text-sm font-black text-white">Live Support</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {sessions.length} active{waitingCount ? ` · ${waitingCount} waiting` : ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 && (
            <p className="p-6 text-center text-xs text-gray-600">No active chats.</p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => openSession(s.id)}
              className={`block w-full border-b border-gray-800/60 px-4 py-3 text-left transition hover:bg-white/5 ${openId === s.id ? 'bg-white/5' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-gray-200">{s.email || s.phone || 'Guest'}</span>
                <span className="shrink-0 text-[10px] text-gray-600">{relTime(s.last_message_at)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${STATUS_PILL[s.status] || ''}`}>
                  {STATUS_LABEL[s.status] || s.status}
                </span>
                <span className="truncate text-[11px] text-gray-500">{s.preview}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className={`flex-1 flex-col rounded-2xl border border-gray-800 bg-[#161616] overflow-hidden ${openId ? 'flex' : 'hidden md:flex'}`}>
        {!openId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-600">
            Select a chat to respond.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
              <button onClick={() => setOpenId(null)} className="text-gray-500 md:hidden">← Back</button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{openMeta?.email || 'Guest'}</p>
                <p className="text-[11px] text-gray-500">{openMeta?.phone || '—'}</p>
              </div>
              <button
                onClick={closeChat}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:border-red-800/50 hover:text-red-400"
              >
                Close
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-3">
              {messages.map((m) => {
                if (m.sender === 'system') {
                  return <p key={m.id} className="mx-auto max-w-[85%] text-center text-[11px] text-gray-600">{m.text}</p>;
                }
                const mine = m.sender === 'agent';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? 'bg-[#f0b429] text-black'
                        : m.sender === 'bot' ? 'bg-[#1e2a3a] text-sky-200 border border-sky-900/40'
                        : 'bg-[#252525] text-gray-200 border border-gray-800'
                    }`}>
                      {!mine && (
                        <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide opacity-60">
                          {m.sender === 'bot' ? 'AI bot' : m.sender === 'customer' ? 'Customer' : 'Agent'}
                        </span>
                      )}
                      {m.image_url && (
                        <a href={m.image_url} target="_blank" rel="noreferrer">
                          <img src={m.image_url} alt="attachment" className="mb-1 max-h-56 rounded-lg" />
                        </a>
                      )}
                      {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 border-t border-gray-800 p-3">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#252525] text-gray-400 hover:text-[#f0b429] disabled:opacity-50"
                title="Attach image"
              >
                <i className="fa fa-paperclip text-sm" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                placeholder={uploading ? 'Uploading…' : 'Reply to customer…'}
                className="flex-1 rounded-full border border-gray-700 bg-[#252525] px-4 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-[#f0b429]"
              />
              <button
                onClick={send}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0b429] text-black hover:bg-[#e0a820] active:scale-95"
              >
                <i className="fa fa-paper-plane text-xs" />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
