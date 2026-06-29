import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from 'wagmi'
import { sepolia } from 'viem/chains'
import { fmtAddress, fmtEth } from '../lib/format.js'
import { useToast } from '../context/ToastContext.jsx'

// Is a browser wallet (MetaMask etc.) injected into the page?
const hasInjectedWallet = () =>
  typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'

export default function Header({ onCreateClick }) {
  const { address, isConnected, chain } = useAccount()
  const { data: balance } = useBalance({ address, query: { enabled: !!address } })
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const { addToast } = useToast()

  const isWrongChain = isConnected && chain?.id !== sepolia.id
  const walletAvailable = hasInjectedWallet()

  function handleConnect() {
    if (!walletAvailable) {
      addToast('No browser wallet found — install MetaMask to connect.', 'error')
      return
    }
    const injector = connectors.find((c) => c.id === 'injected') ?? connectors[0]
    if (!injector) {
      addToast('No wallet connector available.', 'error')
      return
    }
    connect(
      { connector: injector },
      {
        onError: (e) =>
          addToast(e?.shortMessage || e?.message || 'Connection failed.', 'error'),
      },
    )
  }

  return (
    <header className="header">
      <div className="container">
        <div className="header-inner">
          {/* Logo */}
          <a href="#" className="logo">
            <div className="logo-icon">⬡</div>
            <span className="logo-text">ChainFund</span>
          </a>

          {/* Right side */}
          <div className="header-right">
            {isConnected && (
              <button className="btn btn-primary btn-sm" onClick={onCreateClick}>
                + New Campaign
              </button>
            )}

            {isWrongChain && (
              <button
                className="btn btn-warn btn-sm"
                onClick={() => switchChain({ chainId: sepolia.id })}
              >
                ⚠ Switch to Sepolia
              </button>
            )}

            {isConnected ? (
              <div className="wallet-info">
                {balance && (
                  <span className="wallet-balance">
                    {fmtEth(balance.value)} ETH
                  </span>
                )}
                <span className="wallet-address">{fmtAddress(address)}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => disconnect()}>
                  Disconnect
                </button>
              </div>
            ) : walletAvailable ? (
              <button
                className="btn btn-outline"
                onClick={handleConnect}
                disabled={isPending}
              >
                {isPending ? 'Connecting…' : 'Connect Wallet'}
              </button>
            ) : (
              <a
                className="btn btn-outline"
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                title="You need a browser wallet to use this dApp"
              >
                Install MetaMask ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
