export default function RevenueChart({ data }) {
  const items = Array.isArray(data) ? data.slice(0, 6) : [];
  const revenues = items.map((item) => Number(item.revenue || 0));
  const maxRevenue = Math.max(...revenues, 0);
  const totalRevenue = revenues.reduce((a, b) => a + b, 0);
  const totalBookings = items.reduce((a, item) => a + Number(item.bookings || item.count || 0), 0);

  const formatRevenue = (value) => {
    const num = Number(value || 0);
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
    return `$${Math.round(num)}`;
  };

  if (!items.length || maxRevenue === 0) {
    return (
      <div className="eyf-card">
        <p className="eyf-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
          No revenue data yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="eyf-analytics-chart">
        {items.map((item) => {
          const revenue = Number(item.revenue || 0);
          const bookings = Number(item.bookings || item.count || 0);
          const height = revenue > 0 ? `${(revenue / maxRevenue) * 100}%` : '4px';
          const tooltip = `${item.month}: ${formatRevenue(revenue)}${bookings ? ` · ${bookings} booking${bookings !== 1 ? 's' : ''}` : ''}`;

          return (
            <div key={`${item.month}-${revenue}`} className="eyf-analytics-bar-wrap" title={tooltip}>
              <div className="eyf-analytics-bar-value">{formatRevenue(revenue)}</div>
              <div className="eyf-analytics-bar" style={{ height }} />
              <div className="eyf-analytics-bar-label">{item.month}</div>
              {bookings > 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>{bookings}</div>
              ) : null}
            </div>
          );
        })}
      </div>
      {totalRevenue > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>6-month total</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.25rem' }}>{formatRevenue(totalRevenue)}</div>
          </div>
          {totalBookings > 0 ? (
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>Total bookings</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.25rem' }}>{totalBookings}</div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
