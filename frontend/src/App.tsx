import Header from './components/Header'
import ChatPanel from './components/ChatPanel'
import MortgageSimulator from './components/MortgageSimulator'

function App() {
  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <MortgageSimulator />
      </main>

      {/* Chat Panel */}
      <ChatPanel />
    </div>
  )
}

export default App
