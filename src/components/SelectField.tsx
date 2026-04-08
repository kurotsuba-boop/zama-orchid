'use client'

type SelectFieldProps = {
  value: string
  onChange: (v: string) => void
  options: { id: string; name: string }[]
  placeholder: string
}

export default function SelectField({ value, onChange, options, placeholder }: SelectFieldProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-5 py-4 text-lg font-medium rounded-xl focus:outline-none cursor-pointer"
      style={{
        background: '#ffffff',
        color: value ? '#1f2937' : '#9ca3af',
        border: '1.5px solid #e5e7eb',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='%239ca3af'%3E%3Cpath d='M4 7l5 5 5-5z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  )
}
