import { useEffect, useRef, useState } from 'react';
import { bookingMessagesApi } from '../../lib/api';
import { Spinner } from '../efyia/ui';

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// compact=true  → collapsible toggle button (existing dashboard behavior)
// compact=false → always-expanded full-height chat (used by MessagesPage)
// pollInterval  → ms between auto-refresh polls (null = no polling)
export default function MessageThread({ bookingId, currentUserId, isExpanded, onToggle, compact = true, pollInterval = null }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const visible = compact ? isExpanded : true;

  const loadMessages = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await bookingMessagesApi.list(bookingId);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!silent) setError(err.message || 'Could not load messages.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!visible) return;
    if (compact && messages.length > 0) return; // compact mode: load once
    loadMessages();
  }, [bookingId, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling
  useEffect(() => {
    if (!visible || !pollInterval) return;
    const id = setInterval(() => loadMessages(true), pollInterval);
    return () => clearInterval(id);
  }, [bookingId, visible, pollInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    if (!visible || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [visible, messages]);

  const send = async () => {
    const value = inputValue.trim();
    if (!value) return;
    setSending(true);
    setError(null);
    try {
      const created = await bookingMessagesApi.send(bookingId, value);
      setMessages((prev) => [...prev, created]);
      setInputValue('');
    } catch (err) {
      setError(err.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
  };

  const threadBody = (
    <>
      {loading ? <Spinner /> : null}
      {error ? <p className="eyf-field-error" style={{ margin: 0 }}>{error}</p> : null}

      <div className="eyf-message-thread" ref={listRef} style={compact ? {} : { maxHeight: 'none', flex: 1 }}>
        {!messages.length && !loading ? (
          <p className="eyf-muted" style={{ margin: 0, fontSize: '0.85rem' }}>No messages yet. Start the conversation.</p>
        ) : null}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`eyf-message-bubble${message.senderId === currentUserId ? ' eyf-message-bubble--own' : ''}`}
          >
            <strong style={{ fontSize: '0.72rem' }}>{message.sender?.name || message.senderName || 'User'}</strong>
            <div className="eyf-message-bubble__text">{message.message}</div>
            <span className="eyf-message-bubble__meta">{formatTime(message.createdAt)}</span>
          </div>
        ))}
      </div>

      <div className="eyf-message-input-row">
        <textarea
          rows={2}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message… (Ctrl+Enter to send)"
        />
        <button type="button" className="eyf-button" disabled={sending || !inputValue.trim()} onClick={send}>
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </>
  );

  if (!compact) return <div className="eyf-stack" style={{ gap: '0.55rem', flex: 1, minHeight: 0 }}>{threadBody}</div>;

  return (
    <div className="eyf-stack" style={{ gap: '0.55rem' }}>
      <button
        type="button"
        className="eyf-button eyf-button--ghost"
        style={{ width: 'fit-content', minHeight: 'unset', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
        onClick={onToggle}
      >
        {messages.length > 0 ? `Messages (${messages.length})` : 'Messages'}
      </button>

      {!isExpanded ? null : threadBody}
    </div>
  );
}
