import { useState } from 'react';
import { MessageCircle, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';


interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  message: string;
  timestamp: Date;
}

export const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'agent',
      message: '¡Hola! Soy tu asistente de crédito. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const userMessage: ChatMessage = {
        id: String(messages.length + 1),
        type: 'user',
        message: inputValue,
        timestamp: new Date(),
      };

      setMessages([...messages, userMessage]);
      setInputValue('');

      // Simulate agent response
      setTimeout(() => {
        const agentMessage: ChatMessage = {
          id: String(messages.length + 2),
          type: 'agent',
          message: 'Gracias por tu mensaje. Un agente pronto estará disponible para ayudarte con más detalles.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMessage]);
      }, 1000);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          className="fixed bottom-6 right-6 z-30 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          className={`fixed right-0 top-0 z-40 h-screen w-full sm:w-96 bg-white shadow-2xl flex flex-col transform transition-all duration-300 ${
            isMinimized ? 'max-h-16' : 'max-h-screen'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-md flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Asistente CreditBank</h3>
                <p className="text-xs text-blue-100">En línea • Disponible 24/7</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-blue-500/20 rounded transition"
                aria-label={isMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-blue-500/20 rounded transition"
                aria-label="Cerrar chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.type === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <span
                        className={`text-xs mt-1 block ${
                          msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Escribe tu pregunta..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3"
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatPanel;
