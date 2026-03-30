import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import './EmployeeDashboard.css';

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateToStr(date) {
  return date.toISOString().split('T')[0];
}

function formatDateLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(timestamp) {
  if (!timestamp) return null;
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function EmployeeDashboard() {
  const { userProfile, user } = useAuth();
  const [weekStart, setWeekStart] = useState(getMondayOfWeek(new Date()));
  const [shifts, setShifts] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [clockLoading, setClockLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchShifts();
      fetchTodayAttendance();
    }
  }, [weekStart, user]);

  const fetchShifts = async () => {
    setLoading(true);
    const weekStr = dateToStr(weekStart);
    const q = query(
      collection(db, 'shifts'),
      where('userId', '==', user.uid),
      where('weekStart', '==', weekStr)
    );
    const snap = await getDocs(q);
    setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const fetchTodayAttendance = async () => {
    const today = dateToStr(new Date());
    const q = query(
      collection(db, 'attendance'),
      where('userId', '==', user.uid),
      where('date', '==', today),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      setTodayAttendance({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } else {
      setTodayAttendance(null);
    }
  };

  const handleClockIn = async () => {
    setClockLoading(true);
    const now = new Date();
    const ref = await addDoc(collection(db, 'attendance'), {
      userId: user.uid,
      userName: userProfile.name,
      date: dateToStr(now),
      clockIn: Timestamp.fromDate(now),
      clockOut: null,
      duration: null,
      createdAt: serverTimestamp(),
    });
    setTodayAttendance({ id: ref.id, userId: user.uid, date: dateToStr(now), clockIn: Timestamp.fromDate(now), clockOut: null });
    setClockLoading(false);
  };

  const handleClockOut = async () => {
    if (!todayAttendance) return;
    setClockLoading(true);
    const now = new Date();
    const clockInTime = todayAttendance.clockIn.toDate();
    const duration = (now - clockInTime) / 3600000;
    await updateDoc(doc(db, 'attendance', todayAttendance.id), {
      clockOut: Timestamp.fromDate(now),
      duration: parseFloat(duration.toFixed(2)),
    });
    setTodayAttendance(prev => ({ ...prev, clockOut: Timestamp.fromDate(now), duration }));
    setClockLoading(false);
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const getShiftForDay = (dayDate) => {
    const dateStr = dateToStr(dayDate);
    return shifts.find(s => s.date === dateStr);
  };

  const isToday = (date) => dateToStr(date) === dateToStr(new Date());

  const isClockedIn = todayAttendance && !todayAttendance.clockOut;
  const isClockedOut = todayAttendance && todayAttendance.clockOut;

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const weekLabel = `${formatDateLabel(weekDays[0])} – ${formatDateLabel(weekDays[6])}, ${weekDays[0].getFullYear()}`;

  return (
    <div className="page">
      <Header />
      <div className="emp-container">
        <div className="emp-greeting">
          <h2>{greeting}, {userProfile?.name?.split(' ')[0]}!</h2>
          <p className="subtitle">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        {/* Clock In/Out Card */}
        <div className="clock-card">
          <div className="clock-status">
            <div className={`status-dot ${isClockedIn ? 'dot-in' : isClockedOut ? 'dot-out' : 'dot-idle'}`}></div>
            <span className="status-text">
              {isClockedIn ? 'Currently clocked in' : isClockedOut ? 'Clocked out for today' : 'Not clocked in'}
            </span>
          </div>
          <div className="clock-times">
            {todayAttendance?.clockIn && (
              <div className="clock-time-item">
                <span className="clock-label">Clock In</span>
                <span className="clock-value in">{formatTime(todayAttendance.clockIn)}</span>
              </div>
            )}
            {todayAttendance?.clockOut && (
              <div className="clock-time-item">
                <span className="clock-label">Clock Out</span>
                <span className="clock-value out">{formatTime(todayAttendance.clockOut)}</span>
              </div>
            )}
            {isClockedOut && (
              <div className="clock-time-item">
                <span className="clock-label">Duration</span>
                <span className="clock-value">{Math.floor(todayAttendance.duration)}h {Math.round((todayAttendance.duration % 1) * 60)}m</span>
              </div>
            )}
          </div>
          <div className="clock-actions">
            {!todayAttendance && (
              <button className="btn-clock btn-clock-in" onClick={handleClockIn} disabled={clockLoading}>
                {clockLoading ? 'Processing...' : '▶ Clock In'}
              </button>
            )}
            {isClockedIn && (
              <button className="btn-clock btn-clock-out" onClick={handleClockOut} disabled={clockLoading}>
                {clockLoading ? 'Processing...' : '■ Clock Out'}
              </button>
            )}
            {isClockedOut && (
              <p className="clock-done-msg">Have a great rest of your day!</p>
            )}
          </div>
        </div>

        {/* Schedule */}
        <div className="schedule-section">
          <div className="schedule-section-header">
            <h3>My Schedule</h3>
            <div className="week-nav">
              <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); }} className="btn-nav">‹ Prev</button>
              <button onClick={() => setWeekStart(getMondayOfWeek(new Date()))} className="btn-today">Today</button>
              <span className="week-label-sm">{weekLabel}</span>
              <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); }} className="btn-nav">Next ›</button>
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading schedule...</div>
          ) : (
            <div className="emp-schedule-grid">
              {weekDays.map((dayDate, idx) => {
                const shift = getShiftForDay(dayDate);
                const today = isToday(dayDate);
                return (
                  <div key={idx} className={`emp-day-card ${today ? 'today' : ''} ${shift ? 'has-shift' : 'no-shift'}`}>
                    <div className="emp-day-header">
                      <span className="emp-day-name">{DAY_SHORT[idx]}</span>
                      <span className="emp-day-date">{formatDateLabel(dayDate)}</span>
                      {today && <span className="today-badge">Today</span>}
                    </div>
                    {shift ? (
                      <div className="emp-shift-info">
                        <div className="emp-shift-time">{shift.startTime} – {shift.endTime}</div>
                        <div className="emp-shift-label">Scheduled Shift</div>
                      </div>
                    ) : (
                      <div className="emp-off-label">Day Off</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
