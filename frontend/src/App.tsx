import { useRef } from 'react'
import { useAuth } from './contexts/AuthContext'
import { Login } from './components/Login'
import Header from './components/Header'
import ChatPanel from './components/ChatPanel'
import CollapsibleSimulator from './components/CollapsibleSimulator'
import CreditProgressBar from './components/CreditProgressBar'

function App() {
  const { user, isLoading } = useAuth();
  const chatPanelRef = useRef<any>(null);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#10069f]"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

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

        {/* Spacer izquierdo invisible para simetría */}
        <div className="w-72 hidden lg:block" />

        {/* Centro: Chat - centrado */}
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
