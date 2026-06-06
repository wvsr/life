import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WEEKS = 16;
const MONTHS_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DOW_LABELS    = ['M','T','W','T','F','S','S'];

function toStr(d) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function buildGrid() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = toStr(today);

  const dow = (today.getDay() + 6) % 7; // Mon=0..Sun=6
  const start = new Date(today);
  start.setDate(today.getDate() - dow - (WEEKS - 1) * 7);

  const cells = [];
  const cur = new Date(start);
  let week = 0, day = 0;

  while (toStr(cur) <= todayStr) {
    cells.push({ date: toStr(cur), week, day });
    cur.setDate(cur.getDate() + 1);
    day++;
    if (day === 7) { day = 0; week++; }
  }

  return { cells, totalWeeks: week + (day > 0 ? 1 : 0) };
}

function dayScore(dayData) {
  if (!dayData) return -1;
  const { office, satisfied, studied, pmo_count } = dayData;
  const hasAny = [office, satisfied, studied].some(v => v !== null) || pmo_count !== null;
  if (!hasAny) return -1;
  return (office === 1 ? 1 : 0) + (satisfied === 1 ? 1 : 0) + (studied === 1 ? 1 : 0);
}

// -1 = no data, 0–3 = score
const COLORS = [
  'var(--c-empty)',
  'var(--c-0)',
  'var(--c-1)',
  'var(--c-2)',
  'var(--c-3)',
];
const scoreColor = s => (s === -1 ? COLORS[0] : COLORS[Math.min(s + 1, 4)]);

function fmt(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${WEEKDAYS_FULL[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function DayPreview({ date, data }) {
  const labels = [
    ['Office',   data.office],
    ['Work day', data.satisfied],
    ['Studied',  data.studied],
  ];
  return (
    <div className="chart-detail">
      <p className="chart-detail-date">{fmt(date)}</p>
      <div className="chart-detail-items">
        {labels.map(([label, val]) => (
          <span key={label} className={`cdi ${val === 1 ? 'cdi-yes' : val === 0 ? 'cdi-no' : 'cdi-un'}`}>
            {label} {val === 1 ? '✓' : val === 0 ? '✗' : '—'}
          </span>
        ))}
        {data.pmo_count !== null && (
          <span className="cdi">PMO {data.pmo_count}×</span>
        )}
      </div>
    </div>
  );
}

export default function ContributionChart({ days }) {
  const [selected, setSelected] = useState(null);
  const { cells, totalWeeks } = buildGrid();
  const todayStr = toStr(new Date());

  // Build month label per week-column
  const monthLabels = {};
  for (const { date, week, day } of cells) {
    if (day === 0) {
      const d = new Date(date + 'T12:00:00');
      if (d.getDate() <= 7) monthLabels[week] = MONTHS_SHORT[d.getMonth()];
    }
  }

  function toggle(date) {
    setSelected(prev => prev === date ? null : date);
  }

  const selData = selected ? days[selected] : null;

  return (
    <div className="chart-wrap">
      {/* Month labels */}
      <div className="chart-months" style={{ gridTemplateColumns: `repeat(${totalWeeks}, 1fr)` }}>
        {Array.from({ length: totalWeeks }, (_, w) => (
          <span key={w} className="chart-month">{monthLabels[w] ?? ''}</span>
        ))}
      </div>

      <div className="chart-body">
        {/* Day-of-week labels */}
        <div className="chart-dow">
          {DOW_LABELS.map((l, i) => (
            <span key={i} className="chart-dow-lbl">{i % 2 === 0 ? l : ''}</span>
          ))}
        </div>

        {/* Cell grid */}
        <div className="chart-cells" style={{ gridTemplateColumns: `repeat(${totalWeeks}, 1fr)` }}>
          {cells.map(({ date, week, day }) => {
            const s = dayScore(days[date]);
            const isFuture = date > todayStr;
            const isSelected = selected === date;
            return (
              <motion.button
                key={date}
                className={`chart-cell${isSelected ? ' chart-cell-sel' : ''}`}
                style={{
                  gridColumn: week + 1,
                  gridRow: day + 1,
                  background: isFuture ? 'transparent' : scoreColor(s),
                }}
                whileTap={{ scale: 0.65 }}
                transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                onClick={() => !isFuture && toggle(date)}
                aria-label={date}
              />
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && selData && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <DayPreview date={selected} data={selData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
