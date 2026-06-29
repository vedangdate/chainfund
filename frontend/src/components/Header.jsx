import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from 'wagmi'
import { sepolia } from 'viem/chains'
import { fmtAddress, fmtEth } from '../lib/format.js'

export default function Header({ onCreateClick }) {
  const { address, isConnected, chain } = useAccount()
  const { data: balance } = useBalance({ address, query: { enabled: !!address } })
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const isWrongChain = isConnected && chain?.id !== sepolia.id

  function handleConnect() {
    const injector = connectors.find((c) => c.id === 'injected') ?? connectors[0]
    if (injector) connect({ connector: injector })
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
            ) : (
              <button className="btn btn-outline" onClick={handleConnect}>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
