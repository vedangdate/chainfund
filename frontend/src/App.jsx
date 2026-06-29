import { useState, useCallback } from 'react'
import { useReadContract } from 'wagmi'
import contractData from './contract.json'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import CampaignGrid from './components/CampaignGrid.jsx'
import CreateCampaignModal from './components/CreateCampaignModal.jsx'
import Toasts from './components/Toasts.jsx'
import Footer from './components/Footer.jsx'

export default function App() {
  const [showModal, setShowModal] = useState(false)

  const openModal = useCallback(() => setShowModal(true), [])
  const closeModal = useCallback(() => setShowModal(false), [])

  // Read campaign count for the hero stat (same query as CampaignGrid — react-query deduplicates)
  const { data: countData } = useReadContract({
    address: contractData.address,
    abi: contractData.abi,
    functionName: 'campaignCount',
  })

  return (
    <>
      <Header onCreateClick={openModal} />

      <main style={{ flex: 1 }}>
        <Hero campaignCount={countData} onCreateClick={openModal} />
        <CampaignGrid />
      </main>

      <Footer />

      {showModal && (
        <CreateCampaignModal
          onClose={closeModal}
          onSuccess={closeModal}
        />
      )}

      <Toasts />
    </>
  )
}
