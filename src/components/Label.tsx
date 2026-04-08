type LabelProps = {
  children: React.ReactNode
}

export default function Label({ children }: LabelProps) {
  return (
    <p
      className="text-xs font-bold tracking-[0.15em] uppercase mb-2"
      style={{ color: '#9ca3af' }}
    >
      {children}
    </p>
  )
}
