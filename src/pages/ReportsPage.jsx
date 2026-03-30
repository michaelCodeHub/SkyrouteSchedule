import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import Header from '../components/Header';
import './ReportsPage.css';

function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '—';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDuration(hours) {
  if (hours === null || hours === undefined || isNaN(hours)) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function timeStrToHours(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
}

function calcScheduledHours(startTime, endTime) {
  if (!startTime || !endTime) return null;
  let hrs = timeStrToHours(endTime) - timeStrToHours(startTime);
  if (hrs <= 0) hrs += 24; // handle overnight shifts (e.g. 22:00 – 06:00)
  return hrs;
}

function formatTimeStr(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function getVariance(scheduledHrs, workedHrs) {
  if (scheduledHrs === null || workedHrs === null) return null;
  return workedHrs - scheduledHrs;
}

function getStatus(row) {
  if (row.shift && !row.att)       return { label: 'Absent',      cls: 'status-absent' };
  if (!row.shift && row.att)       return { label: 'Unscheduled', cls: 'status-unscheduled' };
  if (row.att && !row.att.clockOut) return { label: 'In Progress', cls: 'status-active' };
  if (row.att && row.att.clockOut)  return { label: 'Complete',    cls: 'status-complete' };
  return { label: '—', cls: '' };
}

export default function ReportsPage() {
  const [employees, setEmployees]         = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [rows, setRows]                   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [dateFrom, setDateFrom]           = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return localDateStr(d);
  });
  const [dateTo, setDateTo] = useState(localDateStr(new Date()));

  useEffect(() => {
    const fetchEmployees = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'employee'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(list);
      if (list.length > 0) setSelectedEmployee(list[0].id);
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) fetchData();
  }, [selectedEmployee, dateFrom, dateTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attendanceSnap, shiftsSnap] = await Promise.all([
        getDocs(query(collection(db, 'attendance'), where('userId', '==', selectedEmployee))),
        getDocs(query(collection(db, 'shifts'),     where('userId', '==', selectedEmployee))),
      ]);

      const attendance = {};
      attendanceSnap.docs.forEach(d => {
        const data = d.data();
        if (data.date >= dateFrom && data.date <= dateTo)
          attendance[data.date] = { id: d.id, ...data };
      });

      const shifts = {};
      shiftsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.date >= dateFrom && data.date <= dateTo)
          shifts[data.date] = { id: d.id, ...data };
      });

      const allDates = new Set([...Object.keys(attendance), ...Object.keys(shifts)]);
      const merged = Array.from(allDates)
        .sort((a, b) => b.localeCompare(a))
        .map(date => {
          const att   = attendance[date] || null;
          const shift = shifts[date]     || null;
          const scheduledHrs = shift ? calcScheduledHours(shift.startTime, shift.endTime) : null;
          const workedHrs    = att?.duration ?? null;
          const variance     = getVariance(scheduledHrs, workedHrs);
          return { date, shift, att, scheduledHrs, workedHrs, variance };
        });

      setRows(merged);
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmp    = employees.find(e => e.id === selectedEmployee);
  const scheduledDays  = rows.filter(r => r.shift).length;
  const workedDays     = rows.filter(r => r.att).length;
  const totalScheduled = rows.reduce((s, r) => s + (r.scheduledHrs || 0), 0);
  const totalWorked    = rows.reduce((s, r) => s + (r.workedHrs    || 0), 0);
  const totalVariance  = totalWorked - totalScheduled;

  return (
    <div className="page">
      <Header />
      <div className="reports-container">

        {/* ── Page title ── */}
        <div className="reports-header">
          <h2>Attendance Reports</h2>
          <p className="subtitle">Scheduled vs actual hours comparison</p>
        </div>

        {/* ── Filters ── */}
        <div className="reports-filters">
          <div className="form-group filter-employee">
            <label>Employee</label>
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-dates">
            <div className="form-group">
              <label>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Summary cards ── */}
        {selectedEmp && (
          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-label">Employee</span>
              <span className="summary-value summary-name">{selectedEmp.name}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Sched. Days</span>
              <span className="summary-value">{scheduledDays}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Days Worked</span>
              <span className="summary-value">{workedDays}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Sched. Hours</span>
              <span className="summary-value scheduled-color">{formatDuration(totalScheduled)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Actual Hours</span>
              <span className="summary-value worked-color">{formatDuration(totalWorked)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Variance</span>
              <span className={`summary-value ${totalVariance >= 0 ? 'variance-pos' : 'variance-neg'}`}>
                {totalVariance >= 0 ? '+' : ''}{formatDuration(Math.abs(totalVariance))}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading records...</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No records found for this period.</div>
        ) : (
          <>
            {/* ══ Desktop: table ══ */}
            <div className="records-table-wrapper desktop-only">
              <table className="records-table">
                <thead>
                  <tr className="group-header-row">
                    <th rowSpan="2" className="date-col">Date</th>
                    <th colSpan="3" className="group-scheduled">Scheduled</th>
                    <th colSpan="3" className="group-actual">Actual</th>
                    <th rowSpan="2" className="variance-col">Variance</th>
                    <th rowSpan="2">Status</th>
                  </tr>
                  <tr className="sub-header-row">
                    <th className="group-scheduled-sub">Start</th>
                    <th className="group-scheduled-sub">End</th>
                    <th className="group-scheduled-sub">Hours</th>
                    <th className="group-actual-sub">Clock In</th>
                    <th className="group-actual-sub">Clock Out</th>
                    <th className="group-actual-sub">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const { date, shift, att, scheduledHrs, workedHrs, variance } = row;
                    const { label: statusLabel, cls: statusClass } = getStatus(row);
                    return (
                      <tr key={date} className={row.shift && !row.att ? 'row-absent' : ''}>
                        <td className="date-cell">
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="sched-cell">{formatTimeStr(shift?.startTime)}</td>
                        <td className="sched-cell">{formatTimeStr(shift?.endTime)}</td>
                        <td className="sched-cell hours-cell">{shift ? formatDuration(scheduledHrs) : '—'}</td>
                        <td className="actual-cell">{formatTimestamp(att?.clockIn)}</td>
                        <td className="actual-cell">{formatTimestamp(att?.clockOut)}</td>
                        <td className="actual-cell hours-cell">{att ? formatDuration(workedHrs) : '—'}</td>
                        <td>
                          {variance !== null ? (
                            <span className={`variance-badge ${variance >= 0 ? 'var-over' : 'var-under'}`}>
                              {variance >= 0 ? '+' : ''}{formatDuration(Math.abs(variance))}
                            </span>
                          ) : '—'}
                        </td>
                        <td><span className={`status-badge ${statusClass}`}>{statusLabel}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ══ Mobile: cards ══ */}
            <div className="report-cards mobile-only">
              {rows.map(row => {
                const { date, shift, att, scheduledHrs, workedHrs, variance } = row;
                const { label: statusLabel, cls: statusClass } = getStatus(row);
                const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                return (
                  <div key={date} className={`report-card ${row.shift && !row.att ? 'report-card-absent' : ''}`}>
                    {/* Card header */}
                    <div className="rc-header">
                      <span className="rc-date">{dateLabel}</span>
                      <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                    </div>

                    {/* Two-column comparison */}
                    <div className="rc-comparison">
                      <div className="rc-col rc-col-sched">
                        <div className="rc-col-title">Scheduled</div>
                        <div className="rc-time-range">
                          {shift ? `${formatTimeStr(shift.startTime)} – ${formatTimeStr(shift.endTime)}` : '—'}
                        </div>
                        <div className="rc-hours">{shift ? formatDuration(scheduledHrs) : '—'}</div>
                      </div>
                      <div className="rc-divider" />
                      <div className="rc-col rc-col-actual">
                        <div className="rc-col-title">Actual</div>
                        <div className="rc-time-range">
                          {att ? `${formatTimestamp(att.clockIn)} – ${formatTimestamp(att.clockOut)}` : '—'}
                        </div>
                        <div className="rc-hours">{att ? formatDuration(workedHrs) : '—'}</div>
                      </div>
                    </div>

                    {/* Variance footer */}
                    {variance !== null && (
                      <div className={`rc-variance ${variance >= 0 ? 'rc-var-over' : 'rc-var-under'}`}>
                        {variance >= 0 ? '▲' : '▼'} {formatDuration(Math.abs(variance))} {variance >= 0 ? 'over' : 'under'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
