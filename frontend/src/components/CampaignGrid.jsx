import { useMemo } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import contractData from '../contract.json'
import CampaignCard from './CampaignCard.jsx'

const abi = contractData.abi
const contractAddress = contractData.address

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton" style={{ height: 22, width: '60%' }} />
      <div className="skeleton" style={{ height: 14, width: '100%' }} />
      <div className="skeleton" style={{ height: 14, width: '80%' }} />
      <div className="skeleton" style={{ height: 6, borderRadius: 3 }} />
      <div className="skeleton" style={{ height: 14, width: '50%' }} />
    </div>
  )
}

export default function CampaignGrid() {
  // 1. Read campaign count (works without wallet via public RPC)
  const {
    data: countData,
    isLoading: countLoading,
    isError: countError,
  } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'campaignCount',
  })

  const count = countData !== undefined ? Number(countData) : 0

  // 2. Build batch contracts array for getCampaign + statusOf for each id
  const ids = useMemo(
    () => Array.from({ length: count }, (_, i) => i + 1),
    [count],
  )

  const batchContracts = useMemo(
    () =>
      ids.flatMap((id) => [
        { address: contractAddress, abi, functionName: 'getCampaign', args: [BigInt(id)] },
        { address: contractAddress, abi, functionName: 'statusOf', args: [BigInt(id)] },
      ]),
    [ids],
  )

  const {
    data: batchData,
    isLoading: batchLoading,
    isError: batchError,
    refetch,
  } = useReadContracts({
    contracts: batchContracts,
    query: { enabled: ids.length > 0 },
  })

  const isLoading = countLoading || (ids.length > 0 && batchLoading)
  const isError = countError || batchError

  // Parse batch results into { campaign, status } per id
  const campaigns = useMemo(() => {
    if (!batchData) return []
    return ids.map((id, i) => {
      const campaignResult = batchData[i * 2]
      const statusResult = batchData[i * 2 + 1]
      return {
        id,
        campaign: campaignResult?.status === 'success' ? campaignResult.result : null,
        status: statusResult?.status === 'success' ? statusResult.result : 0n,
      }
    })
  }, [batchData, ids])

  return (
    <section className="section" id="campaigns">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            Active Campaigns
            {count > 0 && (
              <span style={{ marginLeft: 10, fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                ({count})
              </span>
            )}
          </h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => refetch()}
            style={{ fontSize: '0.78rem' }}
          >
            ↻ Refresh
          </button>
        </div>

        {isError && (
          <div className="error-box">
            Could not load campaigns — check your RPC connection or try refreshing.
          </div>
        )}

        {isLoading && (
          <div className="loading-grid">
            {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
          </div>
        )}

        {!isLoading && !isError && campaigns.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🌱</div>
            <div className="empty-title">No campaigns yet</div>
            <p className="empty-body">
              Be the first to launch a trustless crowdfunding campaign on Sepolia.
            </p>
          </div>
        )}

        {!isLoading && campaigns.length > 0 && (
          <div className="campaign-grid">
            {campaigns.map(({ id, campaign, status }) => (
              <CampaignCard
                key={id}
                id={id}
                campaign={campaign}
                status={status}
                onRefetch={refetch}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
