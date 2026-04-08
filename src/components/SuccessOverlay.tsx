'use client'

type SuccessOverlayProps = {
  emoji: string
  message: string
  onDone: () => void
}

export default function SuccessOverlay({ emoji, message, onDone }: SuccessOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      style={{ background: 'rgba(250,246,237,0.97)', animation: 'fadeIn 0.3s ease' }}
      onClick={onDone}
    >
      <div
        className="text-center"
        style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <div className="text-9xl mb-6">{emoji}</div>
        <p className="text-5xl font-bold" style={{ color: '#1f2937' }}>
          {message}
        </p>
        <p
          className="text-base mt-6"
          style={{ color: '#9ca3af', animation: 'pulse 2s infinite' }}
        >
          タップして戻る
        </p>
      </div>
    </div>
  )
}
