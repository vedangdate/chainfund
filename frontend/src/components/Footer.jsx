export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <span className="footer-brand">⬡ ChainFund</span>
          <div className="footer-links">
            <a
              href="https://github.com/vedangdate/chainfund"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              GitHub ↗
            </a>
            <a
              href="https://sepolia.etherscan.io"
              target="_blank"
              rel="noreferrer"
              className="footer-link"
            >
              Etherscan ↗
            </a>
          </div>
          <span className="footer-note">
            <span className="sepolia-dot" />
            Sepolia testnet — no real funds
          </span>
        </div>
      </div>
    </footer>
  )
}
