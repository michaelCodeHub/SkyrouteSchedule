import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import Header from '../components/Header';
import './ReportsPage.css';

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

// Convert "09:00" string to decimal hours since midnight
function timeStrToHours(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
}

// Format "09:00" → "09:00 AM"
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

export default function ReportsPage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

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
        getDocs(query(collection(db, 'shifts'), where('userId', '==', selectedEmployee))),
      ]);

      const attendance = {};
      attendanceSnap.docs.forEach(d => {
        const data = d.data();
        if (data.date >= dateFrom && data.date <= dateTo) {
          attendance[data.date] = { id: d.id, ...data };
        }
      });

      const shifts = {};
      shiftsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.date >= dateFrom && data.date <= dateTo) {
          shifts[data.date] = { id: d.id, ...data };
        }
      });

      // Build unified rows for all dates that have either a shift or attendance
      const allDates = new Set([...Object.keys(attendance), ...Object.keys(shifts)]);
      const merged = Array.from(allDates)
        .sort((a, b) => b.localeCompare(a))
        .map(date => {
          const att = attendance[date] || null;
          const shift = shifts[date] || null;

          const scheduledHrs = shift
            ? timeStrToHours(shift.endTime) - timeStrToHours(shift.startTime)
            : null;
          const workedHrs = att?.duration ?? null;
          const variance = getVariance(scheduledHrs, workedHrs);

          return { date, shift, att, scheduledHrs, workedHrs, variance };
        });

      setRows(merged);
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmp = employees.find(e => e.id === selectedEmployee);
  const scheduledDays = rows.filter(r => r.shift).length;
  const workedDays = rows.filter(r => r.att).length;
  const totalScheduled = rows.reduce((s, r) => s + (r.scheduledHrs || 0), 0);
  const totalWorked = rows.reduce((s, r) => s + (r.workedHrs || 0), 0);
  const totalVariance = totalWorked - totalScheduled;

  return (
    <div className="page">
      <Header />
      <div className="reports-container">
        <div className="reports-header">
          <h2>Attendance Reports</h2>
          <p className="subtitle">Scheduled vs actual hours comparison</p>
        </div>

        <div className="reports-filters">
          <div className="form-group">
            <label>Employee</label>
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        {selectedEmp && (
          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-label">Employee</span>
              <span className="summary-value">{selectedEmp.name}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Scheduled Days</span>
              <span className="summary-value">{scheduledDays}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Days Worked</span>
              <span className="summary-value">{workedDays}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Scheduled Hours</span>
              <span className="summary-value scheduled-color">{formatDuration(totalScheduled)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Actual Hours</span>
              <span className="summary-value worked-color">{formatDuration(totalWorked)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Variance</span>
              <span className={`summary-value ${totalVariance >= 0 ? 'variance-pos' : 'variance-neg'}`}>
                {totalVariance >= 0 ? '+' : ''}{formatDuration(Math.abs(totalVariance))}
                {totalVariance >= 0 ? ' over' : ' under'}
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading">Loading records...</div>
        ) : (
          <div className="records-table-wrapper">
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
                {rows.length === 0 ? (
                  <tr><td colSpan="9" className="empty-row">No records found for this period.</td></tr>
                ) : (
                  rows.map(row => {
                    const { date, shift, att, scheduledHrs, workedHrs, variance } = row;
                    const isAbsent = shift && !att;
                    const isUnscheduled = !shift && att;

                    let statusLabel, statusClass;
                    if (isAbsent) { statusLabel = 'Absent'; statusClass = 'status-absent'; }
                    else if (isUnscheduled) { statusLabel = 'Unscheduled'; statusClass = 'status-unscheduled'; }
                    else if (att && !att.clockOut) { statusLabel = 'In Progress'; statusClass = 'status-active'; }
                    else if (att && att.clockOut) { statusLabel = 'Complete'; statusClass = 'status-complete'; }
                    else { statusLabel = '—'; statusClass = ''; }

                    return (
                      <tr key={date} className={isAbsent ? 'row-absent' : ''}>
                        <td className="date-cell">
                          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric'
                          })}
                        </td>
                        {/* Scheduled */}
                        <td className="sched-cell">{formatTimeStr(shift?.startTime)}</td>
                        <td className="sched-cell">{formatTimeStr(shift?.endTime)}</td>
                        <td className="sched-cell hours-cell">{shift ? formatDuration(scheduledHrs) : '—'}</td>
                        {/* Actual */}
                        <td className="actual-cell">{formatTimestamp(att?.clockIn)}</td>
                        <td className="actual-cell">{formatTimestamp(att?.clockOut)}</td>
                        <td className="actual-cell hours-cell">{att ? formatDuration(workedHrs) : '—'}</td>
                        {/* Variance */}
                        <td>
                          {variance !== null ? (
                            <span className={`variance-badge ${variance >= 0 ? 'var-over' : 'var-under'}`}>
                              {variance >= 0 ? '+' : ''}{formatDuration(Math.abs(variance))}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
