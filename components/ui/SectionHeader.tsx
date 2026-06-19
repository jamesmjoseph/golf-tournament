export default function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 17, fontWeight: 'bold', letterSpacing: 1 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>}
      <div style={{ height: 1, background: 'linear-gradient(90deg, var(--gold), transparent)', marginTop: 8 }} />
    </div>
  )
}
