import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { initDB, loadAll, upsertDay, insertExpense, removeExpense } from './db.js';
import TodayView from './components/TodayView.jsx';
import HistoryView from './components/HistoryView.jsx';

const PAGE = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };
const PAGE_TRANS = { duration: 0.22, ease: [0.4, 0, 0.2, 1] };

function todayStr() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function emptyDay(date) {
  return { date, office: null, satisfied: null, studied: null, pmo_count: null, pmo_support: null };
}

export default function App() {
  const [view, setView] = useState('today');
  const [days, setDays] = useState({});
  const [expenses, setExpenses] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(false);

  // Keep a ref to expenses so updateDay can write it to cache without a stale closure
  const expensesRef = useRef(expenses);
  useEffect(() => { expensesRef.current = expenses; }, [expenses]);

  // Auto-sync any state change to localStorage cache
  useEffect(() => {
    if (!loading) {
      try { localStorage.setItem('life-cache', JSON.stringify({ days, expenses })); } catch {}
    }
  }, [days, expenses, loading]);

  useEffect(() => {
    // Show cached data immediately — zero latency on open
    try {
      const cached = localStorage.getItem('life-cache');
      if (cached) {
        const { days, expenses } = JSON.parse(cached);
        setDays(days);
        setExpenses(expenses);
        setLoading(false);
      }
    } catch {}

    async function sync() {
      try {
        // initDB only runs once ever (tables don't change)
        if (!localStorage.getItem('db-ready')) {
          await initDB();
          localStorage.setItem('db-ready', '1');
        }
        const data = await loadAll();
        setDays(data.days);
        setExpenses(data.expenses);
      } catch (e) {
        console.error('sync failed', e);
        setSyncError(true);
      } finally {
        setLoading(false);
      }
    }
    sync();
  }, []);

  const updateDay = useCallback((date, patch) => {
    setDays(prev => {
      const updated = { ...(prev[date] ?? emptyDay(date)), ...patch };
      upsertDay(updated).catch(() => setSyncError(true));
      return { ...prev, [date]: updated };
    });
  }, []);

  const addExpense = useCallback(async (date, amount, note) => {
    const tempId = -Date.now();
    const item = { id: tempId, date, amount, note };
    setExpenses(prev => ({ ...prev, [date]: [...(prev[date] ?? []), item] }));
    try {
      const realId = await insertExpense(date, amount, note);
      setExpenses(prev => ({
        ...prev,
        [date]: prev[date].map(e => (e.id === tempId ? { ...e, id: realId } : e)),
      }));
    } catch {
      setSyncError(true);
      setExpenses(prev => ({ ...prev, [date]: prev[date].filter(e => e.id !== tempId) }));
    }
  }, []);

  const deleteExpense = useCallback(async (date, id) => {
    setExpenses(prev => ({ ...prev, [date]: prev[date].filter(e => e.id !== id) }));
    removeExpense(id).catch(() => setSyncError(true));
  }, []);

  if (loading) {
    return (
      <div className="boot-screen">
        <motion.div
          className="boot-dot"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    );
  }

  const today = todayStr();
  const todayData = days[today] ?? emptyDay(today);
  const todayExpenses = expenses[today] ?? [];

  return (
    <div className="app">
      {syncError && (
        <motion.div
          className="sync-error"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setSyncError(false)}
        >
          sync failed · tap to dismiss
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {view === 'today' ? (
          <motion.div key="today" {...PAGE} transition={PAGE_TRANS} className="page">
            <TodayView
              date={today}
              day={todayData}
              expenses={todayExpenses}
              onUpdate={(patch) => updateDay(today, patch)}
              onAddExpense={(amount, note) => addExpense(today, amount, note)}
              onDeleteExpense={(id) => deleteExpense(today, id)}
              onGoHistory={() => setView('history')}
            />
          </motion.div>
        ) : (
          <motion.div key="history" {...PAGE} transition={PAGE_TRANS} className="page">
            <HistoryView
              days={days}
              expenses={expenses}
              onGoToday={() => setView('today')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
