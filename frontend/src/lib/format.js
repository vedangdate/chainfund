import { formatEther } from 'viem'

/**
 * Format a wei BigInt to a human-readable ETH string, trimming trailing zeros.
 */
export function fmtEth(wei) {
  if (wei === undefined || wei === null) return '0'
  const val = BigInt(wei)
  const str = formatEther(val)
  const num = parseFloat(str)
  if (num === 0) return '0'
  // Up to 6 sig figs, no trailing zeros
  if (num >= 1) return num.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return num.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

/**
 * Truncate an Ethereum address to 0x1234…abcd form.
 */
export function fmtAddress(addr) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

/**
 * Return a human-readable countdown from a Unix timestamp (seconds).
 */
export function fmtCountdown(deadlineSec) {
  const now = Math.floor(Date.now() / 1000)
  const diff = Number(deadlineSec) - now
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const mins = Math.floor((diff % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${mins}m left`
  return `${mins}m left`
}

/**
 * Compute progress percentage (0–100), clamped.
 */
export function progressPct(pledged, goal) {
  if (!goal || goal === 0n) return 0
  const pct = (Number(pledged) / Number(goal)) * 100
  return Math.min(pct, 100)
}
