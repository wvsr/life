import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ContributionChart from './ContributionChart.jsx';

const WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return { weekday: WEEKDAYS[d.getDay()], short: `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` };
}

function money(n) {
  return '৳' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const FIELD_META = [
  { key: 'office',    label: 'Office'    },
  { key: 'satisfied', label: 'Work day'  },
  { key: 'studied',   label: 'Studied'   },
];

function Dot({ value }) {
  const cls = value === 1 ? 'dot-yes' : value === 0 ? 'dot-no' : 'dot-un';
  return <span className={`hdot ${cls}`} />;
}

function HistoryCard({ date, day, dayExpenses, isToday }) {
  const [open, setOpen] = useState(false);
  const { weekday, short } = fmtDate(date);
  const total = dayExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className={`hcard${open ? ' hcard-open' : ''}`}>
      <button className="hcard-head" onClick={() => setOpen(o => !o)}>
        <div className="hcard-info">
          <span className="hcard-day">{isToday ? 'Today' : weekday}</span>
          <span className="hcard-date">{short}</span>
        </div>
        <div className="hcard-right">
          <div className="hdots">
            {FIELD_META.map(f => <Dot key={f.key} value={day[f.key]} />)}
          </div>
          {total > 0 && <span className="hcard-spend">{money(total)}</span>}
          <motion.span
            className="hcard-expand"
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            +
          </motion.span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="hcard-detail">
              {FIELD_META.map(({ key, label }) => (
                <div key={key} className="hd-row">
                  <span className="hd-label">{label}</span>
                  <span className={`hd-val ${day[key] === 1 ? 'hd-yes' : day[key] === 0 ? 'hd-no' : 'hd-un'}`}>
                    {day[key] === 1 ? 'Yes' : day[key] === 0 ? 'No' : '—'}
                  </span>
                </div>
              ))}

              {day.pmo_count !== null && (
                <div className="hd-row">
                  <span className="hd-label">PMO</span>
                  <span className="hd-val">
                    {day.pmo_count}×
                    {day.pmo_count > 0 && day.pmo_support !== null && (
                      <span className="hd-sub">
                        {' '}· support: {day.pmo_support === 1 ? 'yes' : 'no'}
                      </span>
                    )}
                  </span>
                </div>
              )}

              {dayExpenses.length > 0 && (
                <>
                  <div className="hd-divider" />
                  <div className="hd-row">
                    <span className="hd-label">Total</span>
                    <span className="hd-val">{money(total)}</span>
                  </div>
                  {dayExpenses.map(e => (
                    <div key={e.id} className="hd-row hd-expense">
                      <span className="hd-label hd-label-dim">{e.note || '—'}</span>
                      <span className="hd-val hd-val-dim">{money(e.amount)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HistoryView({ days, expenses, onGoToday }) {
  const today = new Date().toISOString().slice(0, 10);
  const dates = Object.keys(days).sort((a, b) => b.localeCompare(a));

  return (
    <div className="view">
      <div className="header">
        <motion.button
          className="text-btn"
          whileTap={{ scale: 0.93 }}
          onClick={onGoToday}
        >
          ← Today
        </motion.button>
        <span className="brand">history</span>
      </div>

      <section className="section" style={{ marginTop: 20 }}>
        <div className="section-head">Activity</div>
        <ContributionChart days={days} />
      </section>

      <section className="section" style={{ marginTop: 24 }}>
        <div className="section-head">Log</div>
        {dates.length === 0 ? (
          <p className="empty-state">no entries yet</p>
        ) : (
          <div className="hlist">
            {dates.map(date => (
              <HistoryCard
                key={date}
                date={date}
                day={days[date]}
                dayExpenses={expenses[date] ?? []}
                isToday={date === today}
              />
            ))}
          </div>
        )}
      </section>

      <div className="spacer" />
    </div>
  );
}
