import { useAccount } from 'wagmi'

export default function Hero({ campaignCount, onCreateClick }) {
  const { isConnected } = useAccount()

  return (
    <section className="hero">
      <div className="container">
        <div className="hero-eyebrow">Live on Ethereum Sepolia</div>

        <h1 className="hero-title font-grotesk">
          Fund your vision,<br />
          <span className="text-gradient">trustlessly.</span>
        </h1>

        <p className="hero-sub">
          ChainFund is a permissionless crowdfunding platform.
          Smart-contract escrow means no intermediaries, no custody risk —
          only code.
        </p>

        <div className="hero-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={onCreateClick}
            disabled={!isConnected}
            title={!isConnected ? 'Connect your wallet first' : ''}
          >
            Launch a Campaign
          </button>
          <a
            href="#campaigns"
            className="btn btn-outline btn-lg"
          >
            Browse Campaigns
          </a>
        </div>

        {campaignCount !== undefined && (
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">{String(campaignCount)}</div>
              <div className="hero-stat-label">Campaigns</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">Sepolia</div>
              <div className="hero-stat-label">Network</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">0%</div>
              <div className="hero-stat-label">Platform fee</div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
