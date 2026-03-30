import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import Header from '../components/Header';
import './AdminDashboard.css';

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateToStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTodayDayIndex(weekStart) {
  const todayStr = dateToStr(new Date());
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    if (dateToStr(d) === todayStr) return i;
  }
  return 0;
}

export default function AdminDashboard() {
  const [weekStart, setWeekStart]     = useState(getMondayOfWeek(new Date()));
  const [activeDay, setActiveDay]     = useState(() => getTodayDayIndex(getMondayOfWeek(new Date())));
  const [employees, setEmployees]     = useState([]);
  const [shifts, setShifts]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showModal, setShowModal]     = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm]               = useState({ userId: '', startTime: '09:00', endTime: '17:00' });
  const [saving, setSaving]           = useState(false);

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { fetchShifts(); }, [weekStart]);

  const fetchEmployees = async () => {
    const q = query(collection(db, 'users'), where('role', '==', 'employee'));
    const snap = await getDocs(q);
    setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchShifts = async () => {
    setLoading(true);
    const weekStr = dateToStr(weekStart);
    const q = query(collection(db, 'shifts'), where('weekStart', '==', weekStr));
    const snap = await getDocs(q);
    setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
    setActiveDay(0);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
    setActiveDay(0);
  };

  const goToToday = () => {
    const monday = getMondayOfWeek(new Date());
    setWeekStart(monday);
    setActiveDay(getTodayDayIndex(monday));
  };

  const prevDay = () => {
    if (activeDay === 0) { prevWeek(); setActiveDay(6); }
    else setActiveDay(activeDay - 1);
  };

  const nextDay = () => {
    if (activeDay === 6) { nextWeek(); setActiveDay(0); }
    else setActiveDay(activeDay + 1);
  };

  const openAddShift = (dayDate) => {
    setSelectedDay(dayDate);
    setForm({ userId: employees[0]?.id || '', startTime: '09:00', endTime: '17:00' });
    setShowModal(true);
  };

  const handleAddShift = async (e) => {
    e.preventDefault();
    if (!form.userId) return;
    setSaving(true);
    const emp = employees.find(e => e.id === form.userId);
    await addDoc(collection(db, 'shifts'), {
      userId: form.userId,
      userName: emp?.name || '',
      date: dateToStr(selectedDay),
      startTime: form.startTime,
      endTime: form.endTime,
      weekStart: dateToStr(weekStart),
      createdAt: serverTimestamp(),
    });
    await fetchShifts();
    setShowModal(false);
    setSaving(false);
  };

  const handleDeleteShift = async (shiftId) => {
    await deleteDoc(doc(db, 'shifts', shiftId));
    setShifts(prev => prev.filter(s => s.id !== shiftId));
  };

  const getShiftsForDay = (dayDate) => {
    const dateStr = dateToStr(dayDate);
    return shifts.filter(s => s.date === dateStr);
  };

  const isToday = (date) => dateToStr(date) === dateToStr(new Date());

  const weekLabel = `${formatDateLabel(weekDays[0])} – ${formatDateLabel(weekDays[6])}, ${weekDays[0].getFullYear()}`;
  const activeDayDate = weekDays[activeDay];

  return (
    <div className="page">
      <Header />
      <div className="admin-container">

        {/* ── Desktop header ── */}
        <div className="admin-header desktop-only">
          <div>
            <h2>Weekly Schedule</h2>
            <p className="subtitle">Manage employee shifts</p>
          </div>
          <div className="week-nav">
            <button onClick={prevWeek} className="btn-nav">‹ Prev</button>
            <button onClick={goToToday} className="btn-today">Today</button>
            <span className="week-label">{weekLabel}</span>
            <button onClick={nextWeek} className="btn-nav">Next ›</button>
            <button onClick={fetchEmployees} className="btn-nav" title="Refresh employee list">↻</button>
          </div>
        </div>

        {/* ── Mobile header ── */}
        <div className="mobile-header mobile-only">
          <div className="mobile-title-row">
            <h2>Schedule</h2>
            <div className="mobile-title-actions">
              <button onClick={goToToday} className="btn-today-sm">Today</button>
              <button onClick={fetchEmployees} className="btn-icon" title="Refresh">↻</button>
            </div>
          </div>

          {/* Week navigation */}
          <div className="mobile-week-nav">
            <button onClick={prevWeek} className="btn-week-nav">‹</button>
            <span className="mobile-week-label">{weekLabel}</span>
            <button onClick={nextWeek} className="btn-week-nav">›</button>
          </div>

          {/* Day strip */}
          <div className="day-strip">
            {weekDays.map((d, idx) => (
              <button
                key={idx}
                className={`day-pill ${idx === activeDay ? 'day-pill-active' : ''} ${isToday(d) ? 'day-pill-today' : ''}`}
                onClick={() => setActiveDay(idx)}
              >
                <span className="day-pill-name">{DAY_SHORT[idx]}</span>
                <span className="day-pill-num">{d.getDate()}</span>
                {getShiftsForDay(d).length > 0 && (
                  <span className="day-pill-dot" />
                )}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading schedule...</div>
        ) : (
          <>
            {/* ── Desktop: 7-column grid ── */}
            <div className="schedule-grid desktop-only">
              {weekDays.map((dayDate, idx) => (
                <div key={idx} className={`day-column ${isToday(dayDate) ? 'today' : ''}`}>
                  <div className="day-header">
                    <span className="day-name">{DAY_SHORT[idx]}</span>
                    <span className="day-date">{formatDateLabel(dayDate)}</span>
                    {isToday(dayDate) && <span className="today-badge">Today</span>}
                  </div>
                  <div className="day-shifts">
                    {getShiftsForDay(dayDate).map(shift => (
                      <div key={shift.id} className="shift-card">
                        <div className="shift-employee">{shift.userName}</div>
                        <div className="shift-time">{shift.startTime} – {shift.endTime}</div>
                        <button className="shift-delete" onClick={() => handleDeleteShift(shift.id)}>×</button>
                      </div>
                    ))}
                    <button className="btn-add-shift" onClick={() => openAddShift(dayDate)}>
                      + Add Shift
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Mobile: single day view ── */}
            <div className="mobile-day-view mobile-only">
              <div className="mobile-day-nav">
                <button onClick={prevDay} className="btn-day-nav">‹</button>
                <div className="mobile-day-title">
                  <span className="mobile-day-full">{DAY_FULL[activeDay]}</span>
                  <span className="mobile-day-date">
                    {formatDateLabel(activeDayDate)}, {activeDayDate.getFullYear()}
                    {isToday(activeDayDate) && <span className="today-badge-inline">Today</span>}
                  </span>
                </div>
                <button onClick={nextDay} className="btn-day-nav">›</button>
              </div>

              <div className="mobile-shifts-list">
                {getShiftsForDay(activeDayDate).length === 0 ? (
                  <div className="mobile-no-shifts">No shifts scheduled</div>
                ) : (
                  getShiftsForDay(activeDayDate).map(shift => (
                    <div key={shift.id} className="mobile-shift-card">
                      <div className="mobile-shift-avatar">
                        {shift.userName.charAt(0)}
                      </div>
                      <div className="mobile-shift-info">
                        <div className="mobile-shift-name">{shift.userName}</div>
                        <div className="mobile-shift-time">{shift.startTime} – {shift.endTime}</div>
                      </div>
                      <button
                        className="mobile-shift-delete"
                        onClick={() => handleDeleteShift(shift.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>

              <button
                className="btn-add-shift-mobile"
                onClick={() => openAddShift(activeDayDate)}
              >
                + Add Shift for {DAY_SHORT[activeDay]}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Shared modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Shift — {selectedDay && formatDateLabel(selectedDay)}, {selectedDay?.getFullYear()}</h3>
            <form onSubmit={handleAddShift} className="modal-form">
              <div className="form-group">
                <label>Employee</label>
                <select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} required>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Add Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
