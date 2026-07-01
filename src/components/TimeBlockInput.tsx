'use client'

// 対応時間の入力（スライダー廃止 → 時・分のブロック方式）。
// - 時: 0〜12（▲▼で±1）
// - 分: 0〜(60 - stepMinutes) を stepMinutes 刻み（▲▼で増減。既定10 → 0/10/20/30/40/50）
// - 表示: 中央に「3:20」形式で大きく
// - 値は従来通り hours（小数）で入出力。3時間20分 → 3.33（小数第2位で丸め）
//   0.25(=0:15) / 0.5(=0:30) などの既存値も正確に往復する。

type TimeBlockInputProps = {
  value: number
  onChange: (v: number) => void
  stepMinutes?: number
}

const MAX_HOUR = 12

function decompose(value: number) {
  const safe = Number.isFinite(value) ? value : 0
  const h = Math.min(MAX_HOUR, Math.max(0, Math.floor(safe)))
  const m = Math.min(59, Math.max(0, Math.round((safe - Math.floor(safe)) * 60)))
  return { h, m }
}

// hours（小数・第2位で丸め）へ合成
function compose(h: number, m: number) {
  return Math.round((h + m / 60) * 100) / 100
}

export default function TimeBlockInput({ value, onChange, stepMinutes = 10 }: TimeBlockInputProps) {
  const step = stepMinutes > 0 ? stepMinutes : 10
  const maxMin = 60 - step
  const { h, m } = decompose(value)

  const hourUp = () => onChange(compose(Math.min(MAX_HOUR, h + 1), m))
  const hourDown = () => onChange(compose(Math.max(0, h - 1), m))
  // 分は step のグリッドにスナップしながら増減
  const minUp = () => onChange(compose(h, Math.min(maxMin, Math.floor(m / step) * step + step)))
  const minDown = () => onChange(compose(h, Math.max(0, Math.ceil(m / step) * step - step)))

  const hourAtMax = h >= MAX_HOUR
  const hourAtMin = h <= 0
  const minAtMax = m >= maxMin
  const minAtMin = m <= 0

  return (
    <div className="flex items-center justify-center gap-3 select-none">
      <TimeBlock label="時" display={String(h)} onUp={hourUp} onDown={hourDown} upDisabled={hourAtMax} downDisabled={hourAtMin} />
      <span className="text-3xl font-bold pb-1" style={{ color: '#b8963e', fontFamily: "'DM Mono', monospace" }}>:</span>
      <TimeBlock label="分" display={String(m).padStart(2, '0')} onUp={minUp} onDown={minDown} upDisabled={minAtMax} downDisabled={minAtMin} />
    </div>
  )
}

function TimeBlock({
  label,
  display,
  onUp,
  onDown,
  upDisabled,
  downDisabled,
}: {
  label: string
  display: string
  onUp: () => void
  onDown: () => void
  upDisabled: boolean
  downDisabled: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <ArrowButton dir="up" onClick={onUp} disabled={upDisabled} />
      <div
        className="w-[72px] h-[52px] flex items-center justify-center rounded-xl"
        style={{ background: '#ffffff', border: '1.5px solid #e8dcc3' }}
      >
        <span className="text-4xl font-bold leading-none" style={{ color: '#b8963e', fontFamily: "'DM Mono', monospace" }}>
          {display}
        </span>
      </div>
      <ArrowButton dir="down" onClick={onDown} disabled={downDisabled} />
      <span className="text-xs font-bold mt-0.5" style={{ color: '#9ca3af' }}>{label}</span>
    </div>
  )
}

function ArrowButton({ dir, onClick, disabled }: { dir: 'up' | 'down'; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-[72px] h-11 flex items-center justify-center rounded-lg text-xl font-bold active:scale-95 transition-all disabled:opacity-30"
      style={{ background: disabled ? '#f3f4f6' : '#faf6ed', color: '#b8963e', border: '1.5px solid #e8dcc3' }}
    >
      {dir === 'up' ? '▲' : '▼'}
    </button>
  )
}
