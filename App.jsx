import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Printer, Plus, X, Loader2, CalendarX, UserPlus, Trash2, Settings, LogOut, Lock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

// --- CLOUD DATABASE SETUP ---
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    return JSON.parse(__firebase_config);
  }
  
  return {
    apiKey: "AIzaSyBh56EdxAwEbogCDYSsYcTyRk5Huj5romM",
    authDomain: "crescbilling.firebaseapp.com",
    projectId: "crescbilling",
    storageBucket: "crescbilling.firebasestorage.app",
    messagingSenderId: "694033803736",
    appId: "1:694033803736:web:776b31c435298dd10b6aad",
    measurementId: "G-H54VFNCSDL"
  };
};

const firebaseConfig = getFirebaseConfig();
const hasCloudConfig = !!firebaseConfig.apiKey;

const app = hasCloudConfig ? initializeApp(firebaseConfig) : null;
const auth = hasCloudConfig ? getAuth(app) : null;
const db = hasCloudConfig ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cresc-music-studio-data';

const initialStudents = [
  { id: 'anna_star', name: 'Anna *', dayOfWeek: 1, duration: 30, rate: 450 },
  { id: 'oscar_isaac_std', name: 'Oscar & Isaac', dayOfWeek: 1, duration: 60, rate: 380 },
  { id: 'veronika_star', name: 'Veronika *', dayOfWeek: 2, duration: 30, rate: 450 },
  { id: 'david_star', name: 'David *', dayOfWeek: 2, duration: 30, rate: 450 },
  { id: 'henry_star', name: 'Henry *', dayOfWeek: 2, duration: 30, rate: 450 },
  { id: 'veronika_2_std', name: 'Veronika 2', dayOfWeek: 2, duration: 30, rate: 380 },
  { id: 'arthur_star', name: 'Arthur *', dayOfWeek: 3, duration: 30, rate: 450 },
  { id: 'diego_std', name: 'Diego', dayOfWeek: 3, duration: 45, rate: 380 },
  { id: 'isabela_star', name: 'Isabela *', dayOfWeek: 3, duration: 30, rate: 450 },
  { id: 'anna_2_std', name: 'Anna 2', dayOfWeek: 3, duration: 30, rate: 380 },
  { id: 'emina_star', name: 'Emina *', dayOfWeek: 4, duration: 30, rate: 450 },
  { id: 'dennis_std', name: 'Dennis', dayOfWeek: 4, duration: 30, rate: 380 },
  { id: 'lukas_james_star', name: 'Lukas & James *', dayOfWeek: 5, duration: 60, rate: 450 },
  { id: 'august_star', name: 'August *', dayOfWeek: 5, duration: 45, rate: 450 },
  { id: 'selma_star', name: 'Selma *', dayOfWeek: 5, duration: 30, rate: 450 },
  { id: 'nuna_star', name: 'Nuna *', dayOfWeek: 6, duration: 30, rate: 450 },
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const sanitizeData = (data) => {
  return JSON.parse(JSON.stringify(data, (key, value) => (value === undefined ? null : value)));
};

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem('cresc_students');
    return saved ? JSON.parse(saved) : initialStudents;
  });

  const [cancelledDates, setCancelledDates] = useState(() => {
    const saved = localStorage.getItem('cresc_cancelledDates');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [makeups, setMakeups] = useState(() => {
    const saved = localStorage.getItem('cresc_makeups');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [lateCancels, setLateCancels] = useState(() => {
    const saved = localStorage.getItem('cresc_lateCancels');
    return saved ? JSON.parse(saved) : [];
  });

  // Auth Listener
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    const email = e.target.email.value;
    const password = e.target.password.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setLoginError("Invalid email or password. Please try again.");
    }
  };

  const handleLogout = () => signOut(auth);

  // Firestore Sync
  useEffect(() => {
    if (!user || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'crescState', 'global');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.students) setStudents(data.students);
        if (data.cancelledDates) setCancelledDates(new Set(data.cancelledDates));
        if (data.makeups) setMakeups(data.makeups);
        if (data.lateCancels) setLateCancels(data.lateCancels);
      } else {
        const initialLoad = {
          students: JSON.parse(localStorage.getItem('cresc_students')) || initialStudents,
          cancelledDates: JSON.parse(localStorage.getItem('cresc_cancelledDates')) || [],
          makeups: JSON.parse(localStorage.getItem('cresc_makeups')) || [],
          lateCancels: JSON.parse(localStorage.getItem('cresc_lateCancels')) || []
        };
        setDoc(docRef, sanitizeData(initialLoad));
      }
    }, (error) => console.error("Cloud Error", error));
    return () => unsubscribe();
  }, [user]);

  const saveState = (newState) => {
    if (newState.students) localStorage.setItem('cresc_students', JSON.stringify(newState.students));
    if (newState.cancelledDates) localStorage.setItem('cresc_cancelledDates', JSON.stringify(Array.from(newState.cancelledDates)));
    if (newState.makeups) localStorage.setItem('cresc_makeups', JSON.stringify(newState.makeups));
    if (newState.lateCancels) localStorage.setItem('cresc_lateCancels', JSON.stringify(newState.lateCancels));

    if (user && db) {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'crescState', 'global');
      const cloudData = {};
      if (newState.students) cloudData.students = newState.students;
      if (newState.cancelledDates) cloudData.cancelledDates = Array.from(newState.cancelledDates);
      if (newState.makeups) cloudData.makeups = newState.makeups;
      if (newState.lateCancels) cloudData.lateCancels = newState.lateCancels;
      
      setDoc(docRef, sanitizeData(cloudData), { merge: true }).catch(err => console.error("Save Error", err));
    }
  };

  const [makeupForm, setMakeupForm] = useState(null);
  const [lateCancelForm, setLateCancelForm] = useState(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [studentToRemove, setStudentToRemove] = useState(null);

  const [showGlobalCalendar, setShowGlobalCalendar] = useState(false);
  const [dragStartInfo, setDragStartInfo] = useState(null);
  const [dragHoverInfo, setDragHoverInfo] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getDatesForDay = (dayOfWeek) => {
    const dates = [];
    let d = new Date(year, month, 1);
    while (d.getMonth() === month) {
      if (d.getDay() === dayOfWeek) dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };

  const formatDate = (date) => `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
  const getFullDateStr = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const toggleDate = (studentId, fullDateStr) => {
    const next = new Set(cancelledDates);
    const key = `${studentId}_${fullDateStr}`;
    if (next.has(key)) next.delete(key); else next.add(key);
    setCancelledDates(next);
    saveState({ cancelledDates: next });
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rawName = fd.get('name').trim();
    const rate = parseInt(fd.get('rate'));
    const name = (rate === 450 && !rawName.includes('*')) ? `${rawName} *` : rawName;
    const newStudent = {
      id: rawName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now(),
      name,
      dayOfWeek: parseInt(fd.get('dayOfWeek')),
      duration: parseInt(fd.get('duration')) || 30,
      rate,
      startYear: year,
      startMonth: month 
    };
    const nextStudents = [...students, newStudent];
    setStudents(nextStudents);
    saveState({ students: nextStudents });
    setIsAddingStudent(false);
  };

  const handleEditStudent = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rawName = fd.get('name').trim();
    const rate = parseInt(fd.get('rate'));
    const dayOfWeek = parseInt(fd.get('dayOfWeek'));
    const duration = parseInt(fd.get('duration'));
    const name = (rate === 450 && !rawName.includes('*')) ? `${rawName} *` : rawName;

    const hasCriticalChange = (
      rate !== studentToEdit.rate ||
      dayOfWeek !== studentToEdit.dayOfWeek ||
      duration !== studentToEdit.duration
    );

    let nextStudents;
    if (hasCriticalChange) {
      nextStudents = students.map(s => {
        if (s.id === studentToEdit.id) {
          return { ...s, archived: true, archiveYear: year, archiveMonth: month };
        }
        return s;
      });

      const newVersion = {
        ...studentToEdit,
        id: studentToEdit.id.split('_v')[0] + '_v' + Date.now(),
        name,
        dayOfWeek,
        duration,
        rate,
        startYear: year,
        startMonth: month,
        archived: false,
        archiveYear: null,
        archiveMonth: null
      };
      nextStudents.push(newVersion);
    } else {
      nextStudents = students.map(s => {
        if (s.id === studentToEdit.id) {
          return { ...s, name };
        }
        return s;
      });
    }

    setStudents(nextStudents);
    saveState({ students: nextStudents });
    setStudentToEdit(null);
  };

  const confirmRemoveStudent = () => {
    if (studentToRemove) {
      const nextStudents = students.map(s => 
        s.id === studentToRemove.id ? { ...s, archived: true, archiveYear: year, archiveMonth: month } : s
      );
      setStudents(nextStudents);
      saveState({ students: nextStudents });
      setStudentToRemove(null);
    }
  };

  const handleDragEnd = () => {
    if (!dragStartInfo || !dragHoverInfo) return;
    const range = (startObj, endObj) => {
      const start = new Date(Math.min(startObj.getTime(), endObj.getTime()));
      const end = new Date(Math.max(startObj.getTime(), endObj.getTime()));
      const r = []; let cur = new Date(start);
      while (cur <= end) { r.push(getFullDateStr(cur)); cur.setDate(cur.getDate() + 1); }
      return r;
    };
    const dateRange = range(dragStartInfo.dateObj, dragHoverInfo.dateObj);
    const nextDates = new Set(cancelledDates);
    dateRange.forEach(dateStr => {
      const [y, m, d] = dateStr.split('-');
      const day = new Date(parseInt(y), parseInt(m)-1, parseInt(d)).getDay();
      reportData.rows.forEach(s => { if (s.dayOfWeek === day) nextDates.add(`${s.id}_${dateStr}`); });
    });
    setCancelledDates(nextDates);
    saveState({ cancelledDates: nextDates });
    setDragStartInfo(null); setDragHoverInfo(null); setShowGlobalCalendar(false);
  };

  useEffect(() => {
    const handleUp = () => { if (dragStartInfo) handleDragEnd(); };
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [dragStartInfo, dragHoverInfo]);

  const cancelledDatesThisMonth = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return [...new Set(Array.from(cancelledDates).filter(k => k.includes(`_${prefix}`)).map(k => k.slice(-10)))].sort();
  }, [cancelledDates, year, month]);

  const handleRestoreDate = (dateStr) => {
    const next = new Set(cancelledDates);
    for (const item of next) { if (item.endsWith(`_${dateStr}`)) next.delete(item); }
    setCancelledDates(next);
    saveState({ cancelledDates: next });
  };

  const handleAddMakeup = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('date') && fd.get('duration')) {
      const next = [...makeups, {
        id: Math.random().toString(),
        studentId: makeupForm,
        dateStr: fd.get('date'),
        duration: parseInt(fd.get('duration')),
        note: fd.get('note') || '',
        billingYear: year,
        billingMonth: month
      }];
      setMakeups(next);
      saveState({ makeups: next });
    }
    setMakeupForm(null);
  };

  const handleAddLateCancel = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('date') && fd.get('duration')) {
      const next = [...lateCancels, {
        id: Math.random().toString(),
        studentId: lateCancelForm,
        dateStr: fd.get('date'),
        duration: parseInt(fd.get('duration')),
        note: fd.get('note') || '',
        billingYear: year,
        billingMonth: month
      }];
      setLateCancels(next);
      saveState({ lateCancels: next });
    }
    setLateCancelForm(null);
  };

  const reportData = useMemo(() => {
    let gN = 0; let gH = 0;
    const rows = students.filter(s => {
      if (s.startYear !== undefined && (year < s.startYear || (year === s.startYear && month < s.startMonth))) return false;
      if (s.archived && (year > s.archiveYear || (year === s.archiveYear && month >= s.archiveMonth))) return false;
      return true;
    }).map(s => {
      const dates = getDatesForDay(s.dayOfWeek);
      const active = dates.filter(d => !cancelledDates.has(`${s.id}_${getFullDateStr(d)}`));
      const sm = makeups.filter(m => m.studentId === s.id && m.billingYear === year && m.billingMonth === month);
      const sl = lateCancels.filter(m => m.studentId === s.id && m.billingYear === year && m.billingMonth === month);
      const hrs = (active.length * s.duration + sm.reduce((a, b) => a + b.duration, 0) + sl.reduce((a, b) => a + b.duration, 0)) / 60;
      const sub = hrs * s.rate; gN += sub; gH += hrs;
      return { ...s, activeDates: active, studentMakeups: sm, studentLateCancels: sl, totalHours: hrs, subtotal: sub, allDates: dates };
    });
    return { rows, grandTotalNOK: gN, grandTotalHours: gH };
  }, [currentDate, cancelledDates, makeups, lateCancels, students]);

  const sortStudents = (a, b) => {
    const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    if (dayA !== dayB) return dayA - dayB;
    return a.name.replace('*', '').trim().localeCompare(b.name.replace('*', '').trim());
  };

  const groupData = [
    { label: 'Legacy Roster', data: reportData.rows.filter(s => s.name.includes('*')).sort(sortStudents) },
    { label: 'Standard Roster', data: reportData.rows.filter(s => !s.name.includes('*')).sort(sortStudents) }
  ].map(g => ({ ...g, totalHours: g.data.reduce((a, b) => a + b.totalHours, 0), totalNOK: g.data.reduce((a, b) => a + b.subtotal, 0) }));

  const exportCSV = () => {
    let csv = "Name,Dates,Makeups,Late Notices,Sessions,Min per session,Total Hours,Price per hour (kr),Sub total in NOK\n";
    groupData.forEach(g => {
      g.data.forEach(r => {
        const fmt = m => {
          const [y, mn, d] = m.dateStr.split('-'); let n = m.note?.trim() || '';
          if (n && !n.toLowerCase().startsWith('for')) n = `for ${n}`;
          return `${d}.${mn}.${y} (${m.duration} min) ${n}`.trim();
        };
        csv += `"${r.name.replace('*', '').trim()}","${r.activeDates.map(formatDate).join(', ')}","${r.studentMakeups.map(fmt).join('; ')}","${r.studentLateCancels.map(fmt).join('; ')}",${r.activeDates.length+r.studentMakeups.length+r.studentLateCancels.length},${r.duration},${r.totalHours.toFixed(2)},${r.rate},${r.subtotal.toFixed(2)}\n`;
      });
      csv += `"${g.label} SUBTOTAL",,,,,,${g.totalHours.toFixed(2)},,${g.totalNOK.toFixed(2)}\n`;
    });
    csv += `GRAND TOTAL,,,,,,${reportData.grandTotalHours.toFixed(2)},,${reportData.grandTotalNOK.toFixed(2)}\n`;
    const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = `Cresc_${year}_${month + 1}.csv`; l.click();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-3 rounded-2xl mb-4 shadow-lg shadow-indigo-100">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Cresc.</h1>
            <p className="text-slate-500 text-sm mt-2 text-center">Please sign in to access the dashboard</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Email Address</label>
              <input type="email" name="email" required className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="name@cresc.no" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Password</label>
              <input type="password" name="password" required className="w-full mt-1 p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="••••••••" />
            </div>
            {loginError && <p className="text-rose-500 text-xs font-medium text-center bg-rose-50 p-2 rounded-lg">{loginError}</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans relative">
      <style>{`@media print {.no-print { display: none !important; } .print-only { display: block !important; } .table-container { box-shadow: none !important; border: none !important; } td, th { border: 1px solid #ddd !important; padding: 8px !important; }}`}</style>

      {/* Add Student Modal */}
      {isAddingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-indigo-50/50">
              <h3 className="font-semibold text-indigo-900 flex items-center gap-2"><UserPlus size={18} className="text-indigo-600" /> Add New Student</h3>
              <button onClick={() => setIsAddingStudent(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddStudent} className="p-6 flex flex-col gap-4">
              <div><label className="text-sm font-semibold text-slate-600">Name</label><input type="text" name="name" required className="w-full mt-1 p-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold text-slate-600">Day</label><select name="dayOfWeek" className="w-full mt-1 p-2 border rounded-lg bg-white"><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option><option value="0">Sun</option></select></div>
                <div><label className="text-sm font-semibold text-slate-600">Duration (min)</label><input type="number" name="duration" defaultValue="30" className="w-full mt-1 p-2 border rounded-lg" /></div>
              </div>
              <div><label className="text-sm font-semibold text-slate-600">Price / Hour</label><input type="number" name="rate" required className="w-full mt-1 p-2 border rounded-lg" /></div>
              <div className="flex justify-end gap-3 mt-4 pt-2 border-t"><button type="button" onClick={() => setIsAddingStudent(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button><button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg shadow-sm">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {studentToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-indigo-50/50">
              <h3 className="font-semibold text-indigo-900 flex items-center gap-2"><Settings size={18} className="text-indigo-600" /> Edit Student</h3>
              <button onClick={() => setStudentToEdit(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditStudent} className="p-6 flex flex-col gap-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-800 text-xs mb-2">
                <strong>History Note:</strong> Changing Price, Day, or Duration will create a new billing version starting <strong>{currentDate.toLocaleString('default', { month: 'long' })}</strong>. Past records will remain unchanged.
              </div>
              <div><label className="text-sm font-semibold text-slate-600">Name</label><input type="text" name="name" defaultValue={studentToEdit.name} required className="w-full mt-1 p-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold text-slate-600">Day</label><select name="dayOfWeek" defaultValue={studentToEdit.dayOfWeek} className="w-full mt-1 p-2 border rounded-lg bg-white"><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option><option value="0">Sun</option></select></div>
                <div><label className="text-sm font-semibold text-slate-600">Duration (min)</label><input type="number" name="duration" defaultValue={studentToEdit.duration} className="w-full mt-1 p-2 border rounded-lg" /></div>
              </div>
              <div><label className="text-sm font-semibold text-slate-600">Price / Hour</label><input type="number" name="rate" defaultValue={studentToEdit.rate} required className="w-full mt-1 p-2 border rounded-lg" /></div>
              <div className="flex justify-end gap-3 mt-4 pt-2 border-t"><button type="button" onClick={() => setStudentToEdit(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button><button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg shadow-sm">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Confirmation */}
      {studentToRemove && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 className="h-10 w-10 text-rose-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">Remove {studentToRemove.name.replace('*','')}?</h3>
            <p className="text-sm text-slate-500 my-4 font-medium">Past entries will be kept, but they will be hidden from <strong>{currentDate.toLocaleString('default', { month: 'long' })}</strong> onwards.</p>
            <div className="flex gap-3 mt-6"><button onClick={() => setStudentToRemove(null)} className="flex-1 py-2 text-sm bg-slate-100 rounded-lg transition-colors font-medium">Cancel</button><button onClick={confirmRemoveStudent} className="flex-1 py-2 text-sm bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 transition-colors font-semibold">Remove</button></div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="no-print bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-indigo-900">Cresc. Billing Dashboard</h1>
                {hasCloudConfig && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-sm shadow-emerald-50 uppercase tracking-wider">Cloud Synced</span>}
              </div>
              <p className="text-slate-400 text-xs mt-1 font-medium">Logged in as {user.email}</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-xl">
              <button onClick={prevMonth} className="p-2 hover:bg-white rounded-lg transition-all shadow-sm active:scale-95"><ChevronLeft size={20} /></button>
              <span className="w-36 text-center font-semibold text-slate-700">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
              <button onClick={nextMonth} className="p-2 hover:bg-white rounded-lg transition-all shadow-sm active:scale-95"><ChevronRight size={20} /></button>
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-end">
              <button onClick={() => setIsAddingStudent(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all active:scale-95 shadow-sm shadow-indigo-50 font-medium">
                <UserPlus size={18} /> Add Student
              </button>
              
              <div className="relative">
                <button onClick={() => setShowGlobalCalendar(!showGlobalCalendar)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shadow-sm ${showGlobalCalendar ? 'bg-rose-100 border-rose-200 text-rose-800' : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100 font-medium'}`}>
                  <CalendarX size={18} /> Cancel Days
                </button>
                {showGlobalCalendar && (
                  <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 w-72 animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-3 font-semibold text-slate-700">
                      {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      <button onClick={() => setShowGlobalCalendar(false)} className="text-slate-300 hover:text-slate-600"><X size={16}/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-center text-xs font-semibold text-slate-400 pb-1">{d}</div>)}
                      {Array(new Date(year, month, 1).getDay()).fill(null).map((_, i) => <div key={i} />)}
                      {Array(new Date(year, month + 1, 0).getDate()).fill(null).map((_, i) => {
                        const dO = new Date(year, month, i + 1); const s = getFullDateStr(dO);
                        const range = (dragStartInfo && dragHoverInfo) ? (st, en) => { const s = new Date(Math.min(st.getTime(), en.getTime())); const e = new Date(Math.max(st.getTime(), en.getTime())); const res = []; let c = new Date(s); while(c <= e){ res.push(getFullDateStr(c)); c.setDate(c.getDate()+1); } return res; } : () => [];
                        const active = range(dragStartInfo?.dateObj, dragHoverInfo?.dateObj).includes(s);
                        return <div key={i} onMouseDown={(e) => { e.preventDefault(); setDragStartInfo({ dateObj: dO, dateStr: s }); setDragHoverInfo({ dateObj: dO, dateStr: s }); }} onMouseEnter={() => { if (dragStartInfo) setDragHoverInfo({ dateObj: dO, dateStr: s }); }} className={`text-center py-1.5 text-sm cursor-pointer transition-all ${active ? 'bg-rose-500 text-white rounded-lg shadow-md font-semibold' : 'hover:bg-slate-50 text-slate-600 rounded-lg'}`}>{i + 1}</div>;
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all shadow-sm shadow-emerald-50 font-medium">
                <FileSpreadsheet size={18} /> Sheet
              </button>

              <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-all shadow-sm shadow-indigo-50 font-medium">
                <Printer size={18} /> PDF
              </button>
              
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all group" title="Logout">
                <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          {cancelledDatesThisMonth.length > 0 && <div className="pt-4 border-t flex flex-wrap gap-2 items-center"><span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Cancellations:</span>{cancelledDatesThisMonth.map(d => <span key={d} className="bg-rose-50 text-rose-700 px-2 py-1 rounded-lg text-xs flex items-center gap-1 font-medium border border-rose-100 shadow-sm">{d.split('-').reverse().slice(0,2).join('.')} <button onClick={() => handleRestoreDate(d)} className="hover:text-rose-900"><X size={12} /></button></span>)}</div>}
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden table-container">
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-widest border-b border-slate-100"><th className="p-5">Student</th><th className="p-5">Dates</th><th className="p-5 text-center">Makeups</th><th className="p-5 text-center">Late Notice</th><th className="p-5 text-center">Hrs</th><th className="p-5 text-right">Rate</th><th className="p-5 text-right w-40">Subtotal</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
              {groupData.map(g => (
                <React.Fragment key={g.label}>
                  {g.data.length > 0 && <tr className="bg-indigo-50/30"><td colSpan="7" className="p-3 px-5 font-semibold text-indigo-900 text-xs uppercase tracking-widest">{g.label}</td></tr>}
                  {g.data.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-5 align-top">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-800 text-base">{s.name.replace('*', '').trim()}</div>
                            <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">{dayNames[s.dayOfWeek]}s • {s.duration}m</div>
                          </div>
                          <div className="flex items-center gap-1 no-print opacity-0 group-hover:opacity-100 transition-all bg-white shadow-sm border border-slate-100 rounded-lg p-0.5">
                            <button onClick={() => setStudentToEdit(s)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors" title="Edit Student"><Settings size={14} /></button>
                            <button onClick={() => setStudentToRemove(s)} className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors" title="Remove"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 align-top">
                        <div className="flex flex-wrap gap-2">
                          {s.allDates.map(d => { 
                            const ks = getFullDateStr(d); 
                            const isC = cancelledDates.has(`${s.id}_${ks}`); 
                            return (
                              <button 
                                key={ks} 
                                onClick={() => toggleDate(s.id, ks)} 
                                className={`no-print px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${isC ? 'bg-red-50 text-red-500 border border-red-200 line-through opacity-75 shadow-none scale-95' : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 hover:scale-105 shadow-sm active:scale-95'}`}
                              >
                                {formatDate(d)}
                              </button>
                            ); 
                          })}
                          <span className="hidden print-only text-sm text-slate-600">{s.activeDates.map(formatDate).join(', ') || 'None'}</span>
                        </div>
                      </td>
                      <td className="p-5 text-center align-top border-l border-slate-50 border-dashed">
                        <div className="flex flex-col items-center gap-1.5">
                          {s.studentMakeups.map(m => (
                            <div key={m.id} className="text-xs bg-amber-50 text-amber-700 px-2 py-2 rounded-xl border border-amber-100 w-full flex flex-col items-start shadow-sm relative group/item">
                              <div className="flex justify-between items-center w-full font-semibold">
                                <span>{m.dateStr.split('-').reverse().slice(0,2).join('.')} ({m.duration}m)</span>
                                <button onClick={() => { const nx = makeups.filter(x => x.id !== m.id); setMakeups(nx); saveState({ makeups: nx }); }} className="no-print hover:text-amber-900 opacity-0 group-hover/item:opacity-100 transition-opacity"><X size={12}/></button>
                              </div>
                              {m.note && <div className="text-[10px] leading-tight text-amber-600 mt-1 italic border-t border-amber-200/20 pt-1.5 w-full text-left truncate font-medium" title={m.note}>For: {m.note}</div>}
                            </div>
                          ))}
                          {makeupForm === s.id ? (
                            <form onSubmit={handleAddMakeup} className="no-print bg-white p-4 rounded-2xl shadow-2xl absolute z-10 w-60 text-left border border-slate-200 mt-6 animate-in fade-in zoom-in duration-200 shadow-indigo-100/50">
                              <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Makeup Date & Mins</label>
                              <div className="flex gap-2 mt-2">
                                <input type="date" name="date" required className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg w-full focus:ring-2 focus:ring-amber-500 outline-none font-medium" defaultValue={getFullDateStr(currentDate)} />
                                <input type="number" name="duration" required className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg w-24 focus:ring-2 focus:ring-amber-500 outline-none font-medium" defaultValue={s.duration} />
                              </div>
                              <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest mt-3 block">Missed Lesson Note</label>
                              <input type="text" name="note" placeholder="e.g. Feb 6th" className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg w-full mt-1 focus:ring-2 focus:ring-amber-500 outline-none font-medium" />
                              <div className="flex gap-2 mt-4">
                                <button type="submit" className="text-xs bg-amber-600 text-white font-bold p-2 rounded-xl flex-1 hover:bg-amber-700 active:scale-95 transition-all">Add</button>
                                <button type="button" onClick={() => setMakeupForm(null)} className="text-xs bg-slate-100 text-slate-500 font-bold p-2 rounded-xl hover:bg-slate-200 px-4 transition-all">Cancel</button>
                              </div>
                            </form>
                          ) : <button onClick={() => setMakeupForm(s.id)} className="no-print text-slate-300 p-1.5 bg-slate-50 border border-slate-100 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 rounded-xl transition-all mt-1 active:scale-90"><Plus size={16} /></button>}
                        </div>
                      </td>
                      <td className="p-5 text-center align-top border-l border-slate-50 border-dashed">
                        <div className="flex flex-col items-center gap-1.5">
                          {s.studentLateCancels.map(m => (
                            <div key={m.id} className="text-xs bg-rose-50 text-rose-700 px-2 py-2 rounded-xl border border-rose-100 w-full flex flex-col items-start shadow-sm relative group/item">
                              <div className="flex justify-between items-center w-full font-semibold">
                                <span>{m.dateStr.split('-').reverse().slice(0,2).join('.')} ({m.duration}m)</span>
                                <button onClick={() => { const nx = lateCancels.filter(x => x.id !== m.id); setLateCancels(nx); saveState({ lateCancels: nx }); }} className="no-print hover:text-rose-900 opacity-0 group-hover/item:opacity-100 transition-opacity"><X size={12}/></button>
                              </div>
                              {m.note && <div className="text-[10px] leading-tight text-rose-500 mt-1 italic border-t border-rose-200/20 pt-1.5 w-full text-left truncate font-medium" title={m.note}>{m.note}</div>}
                            </div>
                          ))}
                          {lateCancelForm === s.id ? (
                            <form onSubmit={handleAddLateCancel} className="no-print bg-white p-4 rounded-2xl shadow-2xl absolute z-10 w-60 text-left border border-slate-200 mt-6 animate-in fade-in zoom-in duration-200 shadow-rose-100/50">
                              <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest">Late Date & Mins</label>
                              <div className="flex gap-2 mt-2">
                                <input type="date" name="date" required className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg w-full focus:ring-2 focus:ring-rose-500 outline-none font-medium" defaultValue={getFullDateStr(currentDate)} />
                                <input type="number" name="duration" required className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg w-24 focus:ring-2 focus:ring-rose-500 outline-none font-medium" defaultValue={s.duration} />
                              </div>
                              <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-widest mt-3 block">Reason / Note</label>
                              <input type="text" name="note" placeholder="Sick, late notice" className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-lg w-full mt-1 focus:ring-2 focus:ring-rose-500 outline-none font-medium" />
                              <div className="flex gap-2 mt-4">
                                <button type="submit" className="text-xs bg-rose-600 text-white font-bold p-2 rounded-xl flex-1 hover:bg-rose-700 active:scale-95 transition-all">Add</button>
                                <button type="button" onClick={() => setLateCancelForm(null)} className="text-xs bg-slate-100 text-slate-500 font-bold p-2 rounded-xl hover:bg-slate-200 px-4 transition-all">Cancel</button>
                              </div>
                            </form>
                          ) : <button onClick={() => setLateCancelForm(s.id)} className="no-print text-slate-300 p-1.5 bg-slate-50 border border-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 rounded-xl transition-all mt-1 active:scale-90"><Plus size={16} /></button>}
                        </div>
                      </td>
                      <td className="p-5 text-center font-semibold text-slate-600 border-l border-slate-50 border-dashed">{s.totalHours.toFixed(2)}</td>
                      <td className="p-5 text-right text-slate-400 font-medium">{s.rate}</td>
                      <td className="p-5 text-right font-bold text-indigo-900 text-lg">{s.subtotal.toLocaleString()}</td>
                    </tr>
                  ))}
                  {g.data.length > 0 && (
                    <tr className="bg-slate-50/50 border-t border-slate-100">
                      <td colSpan="4" className="p-5 text-right font-bold text-slate-300 tracking-widest uppercase text-[10px]">{g.label} Subtotal</td>
                      <td className="p-5 text-center font-bold text-slate-500">{g.totalHours.toFixed(2)} hrs</td>
                      <td></td>
                      <td className="p-5 text-right font-bold text-indigo-600 text-xl">{g.totalNOK.toLocaleString()} <span className="text-[10px] font-bold">NOK</span></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-900 text-white shadow-2xl shadow-indigo-200">
                <td colSpan="4" className="p-6 text-right font-bold tracking-widest uppercase text-xs">Grand Monthly Total</td>
                <td className="p-6 text-center font-bold text-xl border-l border-indigo-800/50">{reportData.grandTotalHours.toFixed(2)} <span className="text-[10px] opacity-60">HRS</span></td>
                <td className="border-l border-indigo-800/50"></td>
                <td className="p-6 text-right font-bold text-3xl border-l border-indigo-800/50">{reportData.grandTotalNOK.toLocaleString()} <span className="text-xs opacity-60">NOK</span></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}