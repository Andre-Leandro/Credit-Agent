import { useRef } from 'react'
import Header from './components/Header'
import ChatPanel from './components/ChatPanel'
import CollapsibleSimulator from './components/CollapsibleSimulator'
import CreditProgressBar from './components/CreditProgressBar'

function App() {
  const chatPanelRef = useRef<any>(null);

  const handleSimulatorSendMessage = (message: string) => {
    if (chatPanelRef.current) {
      chatPanelRef.current.sendMessageDirect(message);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <Header />

      {/* Main Layout: Sidebar + Content + Progress */}
      <div className="flex-1 flex overflow-hidden">
        {/* Simulador (Collapsible izquierda) */}
        <CollapsibleSimulator onSendMessage={handleSimulatorSendMessage} />

        {/* Centro: Chat - expandido */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatPanel ref={chatPanelRef} />
        </div>

        {/* Derecha: Barra de Progreso */}
        <div className="w-72 border-l border-gray-200 overflow-hidden hidden lg:block bg-white">
          <CreditProgressBar />
        </div>
      </div>
    </div>
  )
}

export default App
