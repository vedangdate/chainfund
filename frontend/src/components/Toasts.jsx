import { useToast } from '../context/ToastContext.jsx'

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export default function Toasts() {
  const { toasts, removeToast } = useToast()

  if (!toasts.length) return null

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} role="alert">
          <span className="toast-icon">{ICONS[t.type] ?? 'ℹ'}</span>
          <div className="toast-body">
            <div className="toast-message">{t.message}</div>
            {t.txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${t.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="tx-link"
                style={{ fontSize: '0.75rem' }}
              >
                View on Etherscan ↗
              </a>
            )}
          </div>
          <button
            className="toast-dismiss"
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
