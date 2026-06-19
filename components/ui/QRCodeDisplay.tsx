'use client'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

export default function QRCodeDisplay({ url, label }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'inline-block', background: '#fff', padding: 12, borderRadius: 10 }}>
        <QRCodeSVG value={url} size={140} />
      </div>
      {label && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>{label}</div>}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', wordBreak: 'break-all' }}>{url}</div>
      <button onClick={copy} style={{
        marginTop: 8, padding: '6px 16px', borderRadius: 6,
        border: '1px solid var(--gold)', background: 'transparent',
        color: copied ? '#58d68d' : 'var(--gold)', fontSize: 11, cursor: 'pointer',
      }}>
        {copied ? '✓ Copied' : 'Copy Link'}
      </button>
    </div>
  )
}
