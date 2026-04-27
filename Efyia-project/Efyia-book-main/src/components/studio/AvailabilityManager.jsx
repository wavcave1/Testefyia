import { useCallback, useEffect, useMemo, useState } from 'react';
import { availabilityApi } from '../../lib/api';
import { Spinner } from '../efyia/ui';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function buildTimeOptions() {
  const values = [];

  for (let hour = 6; hour <= 23; hour += 1) {
    values.push(`${String(hour).padStart(2, '0')}:00`);
    values.push(`${String(hour).padStart(2, '0')}:30`);
  }

  values.push('00:00', '00:30', '01:00', '01:30', '02:00');
  return values;
}

const TIME_OPTIONS = buildTimeOptions();

function formatTimeLabel(time) {
  if (typeof time !== 'string') return '';
  const [rawHour, rawMinute] = time.split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return time;

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function SectionDivider({ title }) {
  return (
    <h4
      style={{
        margin: '1rem 0 0.75rem',
        fontSize: '0.8rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--muted)',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.5rem',
      }}
    >
      {title}
    </h4>
  );
}

function defaultSchedule() {
  return DAY_NAMES.map((_, dayOfWeek) => ({
    dayOfWeek,
    openTime: '09:00',
    closeTime: '17:00',
    isOpen: dayOfWeek !== 0,
  }));
}

export default function AvailabilityManager({ studioId, onSaved }) {
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [blocks, setBlocks] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [blockForm, setBlockForm] = useState({ date: '', startTime: '09:00', endTime: '17:00', reason: '' });
  const [addingBlock, setAddingBlock] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [blockError, setBlockError] = useState(null);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
    [blocks],
  );

  const loadData = useCallback(async () => {
    if (!studioId) return;

    setLoadingSchedule(true);
    setScheduleError(null);
    setBlockError(null);

    try {
      const [scheduleData, blocksData] = await Promise.all([
        availabilityApi.getSchedule(studioId),
        availabilityApi.getBlocks(studioId),
      ]);

      const baseline = defaultSchedule();
      if (Array.isArray(scheduleData) && scheduleData.length) {
        const merged = baseline.map((day) => {
          const incoming = scheduleData.find((item) => Number(item.dayOfWeek) === day.dayOfWeek);
          return incoming
            ? {
                dayOfWeek: day.dayOfWeek,
                openTime: incoming.openTime || day.openTime,
                closeTime: incoming.closeTime || day.closeTime,
                isOpen: Boolean(incoming.isOpen),
              }
            : day;
        });
        setSchedule(merged);
      } else {
        setSchedule(baseline);
      }

      setBlocks(Array.isArray(blocksData) ? blocksData : []);
    } catch (err) {
      setScheduleError(err.message || 'Could not load availability settings.');
    } finally {
      setLoadingSchedule(false);
    }
  }, [studioId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateScheduleField = (index, field, value) => {
    setSchedule((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const saveSchedule = async () => {
    if (!studioId) return;
    setSavingSchedule(true);
    setScheduleError(null);

    try {
      await availabilityApi.updateSchedule(studioId, schedule);
      if (onSaved) onSaved();
    } catch (err) {
      setScheduleError(err.message || 'Could not save schedule.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const refreshBlocks = async () => {
    if (!studioId) return;
    try {
      const data = await availabilityApi.getBlocks(studioId);
      setBlocks(Array.isArray(data) ? data : []);
    } catch (err) {
      setBlockError(err.message || 'Could not refresh blocked times.');
    }
  };

  const addBlock = async (e) => {
    e.preventDefault();
    if (!studioId) return;

    if (!blockForm.date) {
      setBlockError('Please select a date to block.');
      return;
    }

    setAddingBlock(true);
    setBlockError(null);

    try {
      await availabilityApi.addBlock(studioId, blockForm);
      setBlockForm({ date: '', startTime: '09:00', endTime: '17:00', reason: '' });
      await refreshBlocks();
      if (onSaved) onSaved();
    } catch (err) {
      setBlockError(err.message || 'Could not add blocked time.');
    } finally {
      setAddingBlock(false);
    }
  };

  const removeBlock = async (blockId) => {
    if (!studioId) return;

    setBlockError(null);
    try {
      await availabilityApi.deleteBlock(studioId, blockId);
      await refreshBlocks();
      if (onSaved) onSaved();
    } catch (err) {
      setBlockError(err.message || 'Could not remove blocked time.');
    }
  };

  if (studioId == null) {
    return (
      <div className="eyf-card">
        <p className="eyf-muted" style={{ margin: 0 }}>
          Save your studio profile first to manage availability.
        </p>
      </div>
    );
  }

  return (
    <div className="eyf-stack">
      <SectionDivider title="Weekly Schedule" />

      {loadingSchedule ? <Spinner /> : null}
      {scheduleError ? <p className="eyf-field-error" style={{ margin: 0 }}>{scheduleError}</p> : null}

      {!loadingSchedule ? (
        <div className="eyf-availability-schedule">
          {schedule.map((day, idx) => (
            <div key={day.dayOfWeek} className={`eyf-availability-day${!day.isOpen ? ' eyf-availability-day--closed' : ''}`}>
              <label>{DAY_NAMES[day.dayOfWeek]}</label>
              <input
                type="checkbox"
                checked={day.isOpen}
                onChange={() => updateScheduleField(idx, 'isOpen', !day.isOpen)}
                aria-label={`Toggle ${DAY_NAMES[day.dayOfWeek]} open`}
              />
              <select
                value={day.openTime}
                disabled={!day.isOpen}
                onChange={(e) => updateScheduleField(idx, 'openTime', e.target.value)}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>{formatTimeLabel(time)}</option>
                ))}
              </select>
              <select
                value={day.closeTime}
                disabled={!day.isOpen}
                onChange={(e) => updateScheduleField(idx, 'closeTime', e.target.value)}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>{formatTimeLabel(time)}</option>
                ))}
              </select>
            </div>
          ))}

          <button
            type="button"
            className="eyf-button"
            style={{ width: 'fit-content' }}
            disabled={savingSchedule}
            onClick={saveSchedule}
          >
            {savingSchedule ? 'Saving...' : 'Save schedule'}
          </button>
        </div>
      ) : null}

      <SectionDivider title="Blocked Times" />
      <p className="eyf-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
        Block specific dates or times when the studio is unavailable.
      </p>

      <form onSubmit={addBlock} className="eyf-stack">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', overflow: 'hidden' }}>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', width: 'fit-content' }}>
            Date
            <input
              type="date"
              value={blockForm.date}
              onChange={(e) => setBlockForm((prev) => ({ ...prev, date: e.target.value }))}
              style={{ minWidth: '160px', boxSizing: 'border-box' }}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', minWidth: 0 }}>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', minWidth: 0 }}>
              Start time
              <select
                value={blockForm.startTime}
                onChange={(e) => setBlockForm((prev) => ({ ...prev, startTime: e.target.value }))}
                style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>{formatTimeLabel(time)}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', minWidth: 0 }}>
              End time
              <select
                value={blockForm.endTime}
                onChange={(e) => setBlockForm((prev) => ({ ...prev, endTime: e.target.value }))}
                style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>{formatTimeLabel(time)}</option>
                ))}
              </select>
            </label>
          </div>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', minWidth: 0 }}>
            Reason
            <input
              type="text"
              placeholder="e.g. Private event..."
              value={blockForm.reason}
              onChange={(e) => setBlockForm((prev) => ({ ...prev, reason: e.target.value }))}
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
            />
          </label>
          <button type="submit" className="eyf-button" disabled={addingBlock} style={{ minHeight: 'unset', padding: '0.6rem 1rem', width: '100%' }}>
            {addingBlock ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>

      {blockError ? <p className="eyf-field-error" style={{ margin: 0 }}>{blockError}</p> : null}

      {sortedBlocks.length ? (
        <div className="eyf-stack">
          {sortedBlocks.map((block) => (
            <div key={block.id} className="eyf-card eyf-row eyf-row--between">
              <div style={{ display: 'grid', gap: '0.2rem' }}>
                <strong style={{ fontSize: '0.9rem' }}>{block.date}</strong>
                <span className="eyf-muted" style={{ fontSize: '0.82rem' }}>
                  {formatTimeLabel(block.startTime)} - {formatTimeLabel(block.endTime)}
                </span>
                <span style={{ fontSize: '0.85rem' }}>{block.reason || 'Blocked'}</span>
              </div>
              <button
                type="button"
                className="eyf-button eyf-button--ghost"
                style={{ color: '#f87171', borderColor: '#f87171', minHeight: 'unset', padding: '0.35rem 0.75rem' }}
                onClick={() => removeBlock(block.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="eyf-muted" style={{ margin: 0 }}>
          No blocked times. All available hours are open for booking.
        </p>
      )}
    </div>
  );
}
