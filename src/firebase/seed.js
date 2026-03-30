import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from './config';

const EMPLOYEE_ACCOUNTS = [
  { email: 'alice@skyrouteco.com', name: 'Alice Johnson' },
  { email: 'bob@skyrouteco.com', name: 'Bob Smith' },
  { email: 'carol@skyrouteco.com', name: 'Carol Davis' },
  { email: 'dan@skyrouteco.com', name: 'Dan Wilson' },
];

const ADMIN_ACCOUNT = { email: 'admin@skyrouteco.com', name: 'Admin User' };

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

async function createOrSkipUser(email, password, name, role) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      name,
      role,
      createdAt: serverTimestamp(),
    });
    console.log(`Created: ${name}`);
    return cred.user.uid;
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      // User exists — look up their UID from Firestore
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        console.log(`Already exists: ${name}`);
        return snap.docs[0].id;
      }
    }
    console.error(`Failed to create ${name}:`, e.message);
    return null;
  }
}

export async function seedData() {
  console.log('Starting seed...');

  // Create admin
  await createOrSkipUser(ADMIN_ACCOUNT.email, 'Admin@123', ADMIN_ACCOUNT.name, 'admin');

  // Create employees and collect UIDs
  const employees = [];
  for (const emp of EMPLOYEE_ACCOUNTS) {
    const uid = await createOrSkipUser(emp.email, 'Employee@123', emp.name, 'employee');
    if (uid) employees.push({ ...emp, uid });
  }

  if (employees.length === 0) {
    throw new Error('Could not resolve any employee UIDs. Check Firestore permissions.');
  }

  const today = new Date();
  const currentMonday = getMondayOfWeek(today);

  const shiftTemplates = [
    { day: 0, start: '09:00', end: '17:00' },
    { day: 1, start: '09:00', end: '17:00' },
    { day: 2, start: '10:00', end: '18:00' },
    { day: 3, start: '09:00', end: '17:00' },
    { day: 4, start: '09:00', end: '15:00' },
  ];

  // Seed shifts for current week + past 2 weeks
  for (let weekOffset = 0; weekOffset <= 2; weekOffset++) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() - 7 * weekOffset);
    const weekStr = dateToStr(monday);

    // Check if shifts already exist for this week
    const existingQ = query(collection(db, 'shifts'), where('weekStart', '==', weekStr));
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      console.log(`Shifts already exist for week ${weekStr}, skipping.`);
      continue;
    }

    for (const user of employees) {
      for (const tmpl of shiftTemplates) {
        const shiftDate = new Date(monday);
        shiftDate.setDate(monday.getDate() + tmpl.day);
        await addDoc(collection(db, 'shifts'), {
          userId: user.uid,
          userName: user.name,
          date: dateToStr(shiftDate),
          startTime: tmpl.start,
          endTime: tmpl.end,
          weekStart: weekStr,
          createdAt: serverTimestamp(),
        });
      }
    }
    console.log(`Shifts created for week ${weekStr}`);
  }

  // Seed attendance for past 2 weeks (Mon–Fri)
  for (let weekOffset = 1; weekOffset <= 2; weekOffset++) {
    const pastMonday = new Date(currentMonday);
    pastMonday.setDate(currentMonday.getDate() - 7 * weekOffset);

    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const workDate = new Date(pastMonday);
      workDate.setDate(pastMonday.getDate() + dayOffset);
      const dateStr = dateToStr(workDate);

      for (const user of employees) {
        // Skip if attendance already exists for this user+date
        const existingQ = query(
          collection(db, 'attendance'),
          where('userId', '==', user.uid),
          where('date', '==', dateStr)
        );
        const existingSnap = await getDocs(existingQ);
        if (!existingSnap.empty) continue;

        const clockInHour = 8 + Math.floor(Math.random() * 2);
        const clockInMin = Math.floor(Math.random() * 30);
        const clockOutHour = 16 + Math.floor(Math.random() * 2);
        const clockOutMin = Math.floor(Math.random() * 30);

        const clockIn = new Date(workDate);
        clockIn.setHours(clockInHour, clockInMin, 0, 0);
        const clockOut = new Date(workDate);
        clockOut.setHours(clockOutHour, clockOutMin, 0, 0);

        const duration = parseFloat(((clockOut - clockIn) / 3600000).toFixed(2));

        await addDoc(collection(db, 'attendance'), {
          userId: user.uid,
          userName: user.name,
          date: dateStr,
          clockIn: Timestamp.fromDate(clockIn),
          clockOut: Timestamp.fromDate(clockOut),
          duration,
          createdAt: serverTimestamp(),
        });
      }
    }
  }
  console.log('Attendance seeded');
  console.log('Seed complete!');
}
