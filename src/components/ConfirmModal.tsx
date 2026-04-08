'use client'

type ConfirmModalProps = {
  lines: string[]
  onOk: () => void
  onCancel: () => void
}

export default function ConfirmModal({ lines, onOk, onCancel }: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onCancel}
      style={{
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl"
        style={{ background: '#ffffff', animation: 'slideUp 0.25s ease' }}
      >
        <p className="text-xl font-bold mb-6" style={{ color: '#1f2937' }}>
          確認
        </p>
        <div className="space-y-2 mb-8">
          {lines.map((l, i) => (
            <p key={i} className="text-lg" style={{ color: '#6b7280' }}>
              {l}
            </p>
          ))}
        </div>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-5 rounded-xl text-lg font-bold"
            style={{ background: '#f3f4f6', color: '#6b7280' }}
          >
            キャンセル
          </button>
          <button
            onClick={onOk}
            className="flex-1 py-5 rounded-xl text-lg font-bold text-white"
            style={{ background: '#b8963e', boxShadow: '0 4px 16px rgba(184,150,62,0.3)' }}
          >
            登録する
          </button>
        </div>
      </div>
    </div>
  )
}
