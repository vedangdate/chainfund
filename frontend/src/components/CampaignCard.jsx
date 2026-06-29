import { useState, useEffect } from 'react'
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { parseEther } from 'viem'
import { sepolia } from 'viem/chains'
import contractData from '../contract.json'
import { fmtEth, fmtCountdown, progressPct, fmtAddress } from '../lib/format.js'
import { useToast } from '../context/ToastContext.jsx'

const STATUS_LABELS = ['Live', 'Succeeded', 'Failed']
const STATUS_CLASSES = ['live', 'succeeded', 'failed']

function ActionForm({ label, onSubmit, onCancel, isPending, isConfirming, txHash, isSuccess, isError, errorMsg, placeholder = '0.01', children }) {
  return (
    <div className="action-form">
      <div className="action-form-title">{label}</div>
      {children}
      {txHash && isConfirming && (
        <div className="tx-status confirming">
          <span className="spinner" />
          Confirming…{' '}
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="tx-link">
            View tx ↗
          </a>
        </div>
      )}
      {txHash && isSuccess && (
        <div className="tx-status success">
          ✓ Confirmed —{' '}
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="tx-link">
            View tx ↗
          </a>
        </div>
      )}
      {isError && (
        <div className="tx-status error">✕ {errorMsg || 'Transaction failed'}</div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isPending || isConfirming}>
          Cancel
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={onSubmit}
          disabled={isPending || isConfirming}
        >
          {isPending ? <><span className="spinner" /> Signing…</> : isConfirming ? <><span className="spinner" /> Confirming…</> : 'Submit'}
        </button>
      </div>
    </div>
  )
}

function useContractAction(onSuccess) {
  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract()
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
  } = useWaitForTransactionReceipt({ hash })

  const { addToast } = useToast()

  useEffect(() => {
    if (isSuccess && hash) {
      addToast('Transaction confirmed!', 'success', hash)
      if (onSuccess) onSuccess()
    }
  }, [isSuccess, hash]) // eslint-disable-line react-hooks/exhaustive-deps

  const isError = !!writeError || isReceiptError
  const errorMsg = writeError?.shortMessage || writeError?.message?.slice(0, 120) || 'Transaction failed'

  return { writeContract, hash, isPending, isConfirming, isSuccess, isError, errorMsg, reset }
}

export default function CampaignCard({ id, campaign, status, onRefetch }) {
  const { address, isConnected, chain } = useAccount()
  const { addToast } = useToast()

  const [activeAction, setActiveAction] = useState(null) // 'pledge' | 'unpledge' | null
  const [ethAmount, setEthAmount] = useState('')

  const contractAddress = contractData.address
  const abi = contractData.abi
  const isCorrectChain = chain?.id === sepolia.id

  // Read my pledge for this campaign
  const { data: myPledge, refetch: refetchPledge } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'pledgeOf',
    args: [BigInt(id), address],
    query: { enabled: !!address && isConnected },
  })

  // Separate write hooks for each action type
  const pledge = useContractAction(() => { onRefetch(); refetchPledge(); setActiveAction(null); setEthAmount('') })
  const unpledge = useContractAction(() => { onRefetch(); refetchPledge(); setActiveAction(null); setEthAmount('') })
  const claim = useContractAction(() => { onRefetch(); setActiveAction(null) })
  const refundAction = useContractAction(() => { onRefetch(); refetchPledge(); setActiveAction(null) })

  if (!campaign) return null

  const { creator, goal, pledged, deadline, claimed, title, description } = campaign
  const statusNum = Number(status ?? 0)
  const pct = progressPct(pledged, goal)
  const isLive = statusNum === 0
  const isSucceeded = statusNum === 1
  const isFailed = statusNum === 2
  const isCreator = address && creator && address.toLowerCase() === creator.toLowerCase()
  const hasPledge = myPledge !== undefined && myPledge > 0n
  const canClaim = isConnected && isCreator && isSucceeded && !claimed
  const canRefund = isConnected && isFailed && hasPledge
  const canUnpledge = isConnected && isLive && hasPledge
  const canPledge = isConnected && isLive && isCorrectChain

  function handlePledge() {
    if (!ethAmount) return
    let weiAmt
    try {
      weiAmt = parseEther(ethAmount)
    } catch {
      addToast('Invalid ETH amount', 'error')
      return
    }
    pledge.writeContract({
      address: contractAddress,
      abi,
      functionName: 'pledge',
      args: [BigInt(id)],
      value: weiAmt,
    })
  }

  function handleUnpledge() {
    if (!ethAmount) return
    let weiAmt
    try {
      weiAmt = parseEther(ethAmount)
    } catch {
      addToast('Invalid ETH amount', 'error')
      return
    }
    unpledge.writeContract({
      address: contractAddress,
      abi,
      functionName: 'unpledge',
      args: [BigInt(id), weiAmt],
    })
  }

  function handleClaim() {
    claim.writeContract({
      address: contractAddress,
      abi,
      functionName: 'claim',
      args: [BigInt(id)],
    })
  }

  function handleRefund() {
    refundAction.writeContract({
      address: contractAddress,
      abi,
      functionName: 'refund',
      args: [BigInt(id)],
    })
  }

  return (
    <div className="campaign-card">
      {/* Header */}
      <div className="card-top">
        <h3 className="campaign-title">{title || `Campaign #${id}`}</h3>
        <span className={`status-badge ${STATUS_CLASSES[statusNum] ?? 'live'}`}>
          {STATUS_LABELS[statusNum] ?? 'Live'}
        </span>
      </div>

      {/* Description */}
      {description && (
        <p className="campaign-desc">{description}</p>
      )}

      {/* Progress */}
      <div className="progress-section">
        <div className="progress-bar-track">
          <div
            className={`progress-bar-fill${pct >= 100 ? ' full' : ''}`}
            style={{ width: `${pct.toFixed(1)}%` }}
          />
        </div>
        <div className="progress-meta">
          <div>
            <span className="progress-raised">{fmtEth(pledged)} ETH</span>
            <span className="progress-goal"> of {fmtEth(goal)} ETH</span>
          </div>
          <span className="progress-pct">{pct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Meta */}
      <div className="card-meta">
        <span className="meta-countdown">
          {isLive ? `⏱ ${fmtCountdown(deadline)}` : claimed ? '✓ Claimed' : `Ended`}
        </span>
        <span className="meta-item">
          by{' '}
          <strong title={creator}>{fmtAddress(creator)}</strong>
        </span>
      </div>

      {/* My pledge badge */}
      {hasPledge && (
        <div>
          <span className="my-pledge-badge">
            ◈ My pledge: {fmtEth(myPledge)} ETH
          </span>
        </div>
      )}

      {/* Actions */}
      {isConnected && !isCorrectChain && (
        <div className="tx-status error" style={{ marginTop: 0 }}>
          Switch to Sepolia to interact
        </div>
      )}

      {isConnected && isCorrectChain && (
        <div className="card-actions">
          {/* Pledge */}
          {activeAction === 'pledge' ? (
            <ActionForm
              label="Pledge ETH"
              onCancel={() => { setActiveAction(null); setEthAmount(''); pledge.reset?.() }}
              onSubmit={handlePledge}
              isPending={pledge.isPending}
              isConfirming={pledge.isConfirming}
              txHash={pledge.hash}
              isSuccess={pledge.isSuccess}
              isError={pledge.isError}
              errorMsg={pledge.errorMsg}
            >
              <div className="input-row">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="input-eth"
                  placeholder="Amount (ETH)"
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                />
              </div>
            </ActionForm>
          ) : activeAction === 'unpledge' ? (
            <ActionForm
              label="Unpledge ETH"
              onCancel={() => { setActiveAction(null); setEthAmount(''); unpledge.reset?.() }}
              onSubmit={handleUnpledge}
              isPending={unpledge.isPending}
              isConfirming={unpledge.isConfirming}
              txHash={unpledge.hash}
              isSuccess={unpledge.isSuccess}
              isError={unpledge.isError}
              errorMsg={unpledge.errorMsg}
            >
              <div className="input-row">
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="input-eth"
                  placeholder={`Max ${fmtEth(myPledge)} ETH`}
                  value={ethAmount}
                  onChange={(e) => setEthAmount(e.target.value)}
                />
              </div>
            </ActionForm>
          ) : (
            <div className="action-buttons">
              {canPledge && (
                <button className="btn btn-primary btn-sm" onClick={() => setActiveAction('pledge')}>
                  ◈ Pledge
                </button>
              )}
              {canUnpledge && (
                <button className="btn btn-ghost btn-sm" onClick={() => setActiveAction('unpledge')}>
                  ↩ Unpledge
                </button>
              )}
              {canClaim && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleClaim}
                  disabled={claim.isPending || claim.isConfirming}
                >
                  {claim.isPending || claim.isConfirming ? (
                    <><span className="spinner" /> {claim.isConfirming ? 'Confirming…' : 'Signing…'}</>
                  ) : '✓ Claim Funds'}
                </button>
              )}
              {canRefund && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleRefund}
                  disabled={refundAction.isPending || refundAction.isConfirming}
                >
                  {refundAction.isPending || refundAction.isConfirming ? (
                    <><span className="spinner" /> {refundAction.isConfirming ? 'Confirming…' : 'Signing…'}</>
                  ) : '↩ Refund'}
                </button>
              )}
            </div>
          )}

          {/* Claim / Refund tx status (show below action buttons) */}
          {claim.hash && (claim.isConfirming || claim.isSuccess || claim.isError) && activeAction === null && (
            <div className={`tx-status ${claim.isSuccess ? 'success' : claim.isError ? 'error' : 'confirming'}`}>
              {claim.isConfirming && <><span className="spinner" /> Confirming…</>}
              {claim.isSuccess && '✓ Funds claimed!'}
              {claim.isError && `✕ ${claim.errorMsg}`}
              {claim.hash && (
                <a href={`https://sepolia.etherscan.io/tx/${claim.hash}`} target="_blank" rel="noreferrer" className="tx-link" style={{ marginLeft: 6 }}>
                  View ↗
                </a>
              )}
            </div>
          )}
          {refundAction.hash && (refundAction.isConfirming || refundAction.isSuccess || refundAction.isError) && activeAction === null && (
            <div className={`tx-status ${refundAction.isSuccess ? 'success' : refundAction.isError ? 'error' : 'confirming'}`}>
              {refundAction.isConfirming && <><span className="spinner" /> Confirming…</>}
              {refundAction.isSuccess && '✓ Refunded!'}
              {refundAction.isError && `✕ ${refundAction.errorMsg}`}
              {refundAction.hash && (
                <a href={`https://sepolia.etherscan.io/tx/${refundAction.hash}`} target="_blank" rel="noreferrer" className="tx-link" style={{ marginLeft: 6 }}>
                  View ↗
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
