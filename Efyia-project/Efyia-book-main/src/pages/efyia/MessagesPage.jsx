import { useState, useEffect } from 'react';
import { bookingsApi, bookingMessagesApi } from '../../lib/api';
import { useAppContext } from '../../context/AppContext';
import MessageThread from '../../components/booking/MessageThread';
import { Spinner } from '../../components/efyia/ui';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function getConvoName(booking, role) {
  if (role === 'OWNER') {
    return booking.user?.name || booking.userName || 'Client';
  }
  return booking.studio?.name || booking.studioName || 'Studio';
}

export default function MessagesPage() {
  const { currentUser } = useAppContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [previews, setPreviews] = useState({}); // bookingId → { text, count }
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  useEffect(() => {
    bookingsApi
      .list()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setBookings(list);
        // Lazy-load last message preview for each conversation
        list.forEach((b) => {
          bookingMessagesApi
            .list(b.id)
            .then((msgs) => {
              const arr = Array.isArray(msgs) ? msgs : [];
              const last = arr[arr.length - 1];
              setPreviews((prev) => ({
                ...prev,
                [b.id]: { text: last ? last.message : null, count: arr.length },
              }));
            })
            .catch(() => {});
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (bookingId) => {
    setSelectedId(bookingId);
    setMobileView('chat');
  };

  const selectedBooking = bookings.find((b) => b.id === selectedId);

  const listPanel = (
    <div className={`eyf-messages-list-panel${mobileView === 'chat' ? ' eyf-messages-list-panel--hidden' : ''}`}>
      <div className="eyf-messages-panel-header">
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Messages</h2>
      </div>
      <div className="eyf-convo-list">
        {loading ? <div style={{ padding: '1rem' }}><Spinner /></div> : null}
        {!loading && bookings.length === 0 ? (
          <p className="eyf-muted" style={{ padding: '1.25rem', fontSize: '0.875rem', margin: 0 }}>
            No bookings yet. Once you book a session, you can message studios here.
          </p>
        ) : null}
        {bookings.map((b) => {
          const preview = previews[b.id];
          const isActive = b.id === selectedId;
          const name = getConvoName(b, currentUser?.role);
          return (
            <button
              key={b.id}
              type="button"
              className={`eyf-convo-card${isActive ? ' is-active' : ''}`}
              onClick={() => handleSelect(b.id)}
            >
              <div className="eyf-convo-card__avatar" aria-hidden="true">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="eyf-convo-card__body">
                <div className="eyf-convo-card__name">{name}</div>
                <div className="eyf-convo-card__date">{formatDate(b.startTime || b.date)}</div>
                <div className="eyf-convo-card__preview">
                  {preview === undefined ? '…' : preview.text || 'No messages yet'}
                </div>
              </div>
              {preview?.count > 0 ? <div className="eyf-convo-card__dot" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  const chatPanel = (
    <div className={`eyf-messages-chat-panel${mobileView === 'list' ? ' eyf-messages-chat-panel--hidden-mobile' : ''}`}>
      <div className="eyf-chat-window">
        {selectedBooking ? (
          <>
            <div className="eyf-chat-window__header">
              <button
                type="button"
                className="eyf-button eyf-button--ghost eyf-chat-window__back"
                onClick={() => setMobileView('list')}
                aria-label="Back to conversations"
              >
                ← Back
              </button>
              <span className="eyf-chat-window__title">
                {getConvoName(selectedBooking, currentUser?.role)}
              </span>
              <span className="eyf-muted" style={{ fontSize: '0.82rem' }}>
                {formatDate(selectedBooking.startTime || selectedBooking.date)}
              </span>
            </div>
            <MessageThread
              bookingId={selectedBooking.id}
              currentUserId={currentUser?.id}
              compact={false}
              pollInterval={5000}
            />
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              color: 'var(--muted)',
              fontSize: '0.9rem',
            }}
          >
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="eyf-messages-layout">
      {listPanel}
      {chatPanel}
    </div>
  );
}
