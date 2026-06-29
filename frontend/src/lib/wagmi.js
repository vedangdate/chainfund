import { createConfig } from 'wagmi'
import { sepolia } from 'viem/chains'
import { injected } from 'wagmi/connectors'
import { http, fallback } from 'viem'

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: fallback([
      http('https://rpc.sepolia.org'),
      http('https://ethereum-sepolia-rpc.publicnode.com'),
    ]),
  },
})
