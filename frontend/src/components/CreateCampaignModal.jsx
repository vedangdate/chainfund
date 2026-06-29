import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import contractData from '../contract.json'
import { useToast } from '../context/ToastContext.jsx'

const abi = contractData.abi
const contractAddress = contractData.address

const DURATION_OPTIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
  { label: '3 days', seconds: 259200 },
  { label: '7 days', seconds: 604800 },
  { label: '14 days', seconds: 1209600 },
  { label: '30 days', seconds: 2592000 },
  { label: '60 days', seconds: 5184000 },
  { label: '90 days', seconds: 7776000 },
]

export default function CreateCampaignModal({ onClose, onSuccess }) {
  const { addToast } = useToast()

  const [form, setForm] = useState({
    title: '',
    description: '',
    goalEth: '',
    durationSecs: 604800, // 7 days default
  })
  const [validationError, setValidationError] = useState('')

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isSuccess && hash) {
      addToast('Campaign created!', 'success', hash)
      if (onSuccess) onSuccess()
      onClose()
    }
  }, [isSuccess, hash]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setValidationError('')
  }

  function validate() {
    if (!form.title.trim()) return 'Title is required.'
    if (!form.description.trim()) return 'Description is required.'
    if (!form.goalEth || isNaN(Number(form.goalEth)) || Number(form.goalEth) <= 0)
      return 'Enter a valid goal in ETH (> 0).'
    try {
      parseEther(form.goalEth)
    } catch {
      return 'Invalid ETH amount.'
    }
    return ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setValidationError(err); return }

    let goalWei
    try {
      goalWei = parseEther(form.goalEth)
    } catch {
      setValidationError('Invalid ETH amount.')
      return
    }

    writeContract({
      address: contractAddress,
      abi,
      functionName: 'createCampaign',
      args: [goalWei, BigInt(Number(form.durationSecs)), form.title.trim(), form.description.trim()],
    })
  }

  const isSubmitting = isPending || isConfirming
  const errorMsg = writeError?.shortMessage || writeError?.message?.slice(0, 160)

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-title">Launch a Campaign</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="title">Campaign Title</label>
            <input
              id="title"
              name="title"
              className="form-input"
              placeholder="e.g. Open-source climate toolkit"
              value={form.title}
              onChange={handleChange}
              maxLength={80}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              placeholder="Describe your campaign — what you're building and why it matters."
              value={form.description}
              onChange={handleChange}
              maxLength={500}
            />
            <span className="form-hint">{form.description.length}/500 characters</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="goalEth">Funding Goal (ETH)</label>
            <input
              id="goalEth"
              name="goalEth"
              type="number"
              step="0.001"
              min="0.001"
              className="form-input"
              placeholder="e.g. 0.5"
              value={form.goalEth}
              onChange={handleChange}
            />
            <span className="form-hint">Amount in ETH that must be raised for success.</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="durationSecs">Duration</label>
            <select
              id="durationSecs"
              name="durationSecs"
              className="form-select"
              value={form.durationSecs}
              onChange={handleChange}
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.seconds} value={opt.seconds}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="form-hint">
              Campaign closes automatically at the deadline.
              Backers can refund if the goal isn't met.
            </span>
          </div>

          {validationError && (
            <div className="error-box" style={{ marginBottom: 16 }}>{validationError}</div>
          )}

          {errorMsg && (
            <div className="error-box" style={{ marginBottom: 16 }}>✕ {errorMsg}</div>
          )}

          {hash && isConfirming && (
            <div className="tx-status confirming" style={{ marginBottom: 14 }}>
              <span className="spinner" />
              Confirming transaction…{' '}
              <a
                href={`https://sepolia.etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                className="tx-link"
              >
                View ↗
              </a>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ flex: 1 }}
            >
              {isPending ? (
                <><span className="spinner" /> Signing…</>
              ) : isConfirming ? (
                <><span className="spinner" /> Confirming…</>
              ) : (
                'Create Campaign'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
