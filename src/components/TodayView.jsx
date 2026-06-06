import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return { weekday: WEEKDAYS[d.getDay()], short: `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` };
}

function money(n) {
  return '৳' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function Pill({ active, variant, onClick, children }) {
  return (
    <motion.button
      className={`pill ${active ? `pill-${variant}` : ''}`}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <div className="pills">
        <Pill active={value === 1} variant="yes" onClick={() => onChange(value === 1 ? null : 1)}>Yes</Pill>
        <Pill active={value === 0} variant="no"  onClick={() => onChange(value === 0 ? null : 0)}>No</Pill>
      </div>
    </div>
  );
}

function PmoSection({ pmoCount, pmoSupport, onUpdate }) {
  const dirRef = useRef(1);

  function increment() {
    dirRef.current = 1;
    onUpdate({ pmo_count: (pmoCount ?? 0) + 1 });
  }

  function decrement() {
    if ((pmoCount ?? 0) <= 0) return;
    dirRef.current = -1;
    onUpdate({ pmo_count: pmoCount - 1 });
  }

  const display = pmoCount ?? 0;
  const showSupport = pmoCount !== null && pmoCount > 0;

  return (
    <div className="card pmo-card">
      <div className="row">
        <span className="row-label">Masturbated</span>
        <div className="stepper">
          <motion.button
            className={`stepper-btn ${display === 0 ? 'stepper-btn-dim' : ''}`}
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={decrement}
          >
            −
          </motion.button>

          <div className="stepper-count-wrap">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={display}
                className="stepper-count"
                initial={{ opacity: 0, y: dirRef.current * 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: dirRef.current * -12 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
              >
                {display}
              </motion.span>
            </AnimatePresence>
          </div>

          <motion.button
            className="stepper-btn"
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={increment}
          >
            +
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showSupport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 52, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="row sub-row">
              <span className="row-label row-label-dim">With support</span>
              <div className="pills">
                <Pill active={pmoSupport === 1} variant="yes" onClick={() => onUpdate({ pmo_support: pmoSupport === 1 ? null : 1 })}>Yes</Pill>
                <Pill active={pmoSupport === 0} variant="no"  onClick={() => onUpdate({ pmo_support: pmoSupport === 0 ? null : 0 })}>No</Pill>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function evalAmount(str) {
  const s = str.trim().replace(/[^0-9+\-*/.() ]/g, '');
  if (!s) return NaN;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + s + ')')();
    return typeof result === 'number' && isFinite(result) ? result : NaN;
  } catch { return NaN; }
}

const KEYPAD_ROWS = [
  ['7', '8', '9', '⌫'],
  ['4', '5', '6', '+'],
  ['1', '2', '3', '-'],
];

function NumKeypad({ value, onChange, onNext }) {
  function press(key) {
    if (key === '⌫') { onChange(value.slice(0, -1)); return; }
    if (key === '→') { onNext(); return; }
    onChange(value + key);
  }

  return (
    <div className="keypad">
      {KEYPAD_ROWS.map((row, ri) => (
        <div key={ri} className="keypad-row">
          {row.map(k => (
            <button
              key={k}
              className={`keypad-btn${k === '+' || k === '-' ? ' keypad-btn-op' : k === '⌫' ? ' keypad-btn-del' : ''}`}
              onPointerDown={e => { e.preventDefault(); press(k); }}
            >
              {k}
            </button>
          ))}
        </div>
      ))}
      <div className="keypad-row">
        <button className="keypad-btn keypad-btn-wide" onPointerDown={e => { e.preventDefault(); press('0'); }}>0</button>
        <button className="keypad-btn" onPointerDown={e => { e.preventDefault(); press('.'); }}>.</button>
        <button className="keypad-btn keypad-btn-next" onPointerDown={e => { e.preventDefault(); press('→'); }}>→</button>
      </div>
    </div>
  );
}

const KEYPAD_H = 300;

function ExpenseSection({ expenses, onAdd, onDelete }) {
  const [amount, setAmount]       = useState('');
  const [note, setNote]           = useState('');
  const [keypadOpen, setKeypadOpen] = useState(false);
  const noteRef = useRef(null);
  const formRef = useRef(null);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  useEffect(() => {
    const page = document.querySelector('.page');
    if (!page) return;
    if (keypadOpen) {
      page.style.paddingBottom = KEYPAD_H + 'px';
      requestAnimationFrame(() => {
        const form = formRef.current;
        if (!form) return;
        const hidden = form.getBoundingClientRect().bottom - (window.innerHeight - KEYPAD_H) + 12;
        if (hidden > 0) page.scrollBy({ top: hidden, behavior: 'smooth' });
      });
    } else {
      page.style.paddingBottom = '';
    }
  }, [keypadOpen]);

  function openKeypad() {
    noteRef.current?.blur();
    setKeypadOpen(true);
  }

  function handleKeypadNext() {
    setKeypadOpen(false);
    noteRef.current?.focus();
  }

  function submit() {
    const n = evalAmount(amount);
    if (isNaN(n) || n <= 0) return;
    onAdd(n, note.trim());
    setAmount('');
    setNote('');
    noteRef.current?.blur();
    setKeypadOpen(true);
  }

  function handleNoteKey(e) {
    if (e.key === 'Enter') submit();
  }

  return (
    <section className="section">
      <div className="section-head-row">
        <span className="section-head">Expenses</span>
        <span className="expense-total">{money(total)}</span>
      </div>

      <div className="card">
        <AnimatePresence initial={false}>
          {expenses.length === 0 ? (
            <motion.div key="empty" className="empty-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              nothing yet
            </motion.div>
          ) : (
            expenses.map(e => (
              <motion.div
                key={e.id}
                className="expense-row"
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <span className="exp-note">{e.note || <span className="dim">—</span>}</span>
                <span className="exp-amount">{money(e.amount)}</span>
                <motion.button
                  className="exp-del"
                  whileTap={{ scale: 0.8 }}
                  onClick={() => onDelete(e.id)}
                >
                  ×
                </motion.button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="exp-form" ref={formRef}>
        <div
          className={`input input-amount input-display${keypadOpen ? ' input-focused' : ''}`}
          onClick={openKeypad}
        >
          {amount
            ? <span>{amount}</span>
            : <span className="input-placeholder">৳ amount</span>
          }
        </div>
        <input
          ref={noteRef}
          className="input input-note"
          type="text"
          placeholder="what for"
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={handleNoteKey}
          onFocus={() => setKeypadOpen(false)}
          autoComplete="off"
        />
        <motion.button
          className="icon-btn"
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          onClick={submit}
        >
          +
        </motion.button>
      </div>

      <AnimatePresence>
        {keypadOpen && (
          <>
            <div className="keypad-backdrop" onClick={() => setKeypadOpen(false)} />
            <motion.div
              className="num-keypad"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            >
              <NumKeypad value={amount} onChange={setAmount} onNext={handleKeypadNext} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}

export default function TodayView({ date, day, expenses, onUpdate, onAddExpense, onDeleteExpense, onGoHistory }) {
  const { weekday, short } = fmt(date);

  return (
    <div className="view">
      <div className="header">
        <span className="brand">life</span>
        <motion.button
          className="text-btn"
          whileTap={{ scale: 0.93 }}
          onClick={onGoHistory}
        >
          History
        </motion.button>
      </div>

      <div className="date-block">
        <div className="weekday">{weekday}</div>
        <div className="datestr">{short}</div>
      </div>

      <section className="section">
        <div className="section-head">Daily</div>
        <div className="card">
          <ToggleRow label="Office today"  value={day.office}    onChange={v => onUpdate({ office: v })} />
          <ToggleRow label="Good work day" value={day.satisfied} onChange={v => onUpdate({ satisfied: v })} />
          <ToggleRow label="Studied"       value={day.studied}   onChange={v => onUpdate({ studied: v })} />
        </div>
      </section>

      <section className="section">
        <div className="section-head">PMO</div>
        <PmoSection
          pmoCount={day.pmo_count}
          pmoSupport={day.pmo_support}
          onUpdate={onUpdate}
        />
      </section>

      <ExpenseSection
        expenses={expenses}
        onAdd={onAddExpense}
        onDelete={onDeleteExpense}
      />

      <div className="spacer" />
    </div>
  );
}
