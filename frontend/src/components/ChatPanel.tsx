import { useState, useRef } from 'react';
import { MessageCircle, Send, X, Minimize2, Maximize2, Paperclip, File, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';


interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  message: string;
  timestamp: Date;
  files?: File[];
}

interface UploadedFile {
  file: File;
  name: string;
  size: string;
}

export const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'agent',
      message: '¡Hola! Soy tu asistente de crédito. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).map((file) => ({
        file,
        name: file.name,
        size: formatFileSize(file.size),
      }));
      setUploadedFiles([...uploadedFiles, ...newFiles]);
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSendMessage = () => {
    if (inputValue.trim() || uploadedFiles.length > 0) {
      const userMessage: ChatMessage = {
        id: String(messages.length + 1),
        type: 'user',
        message: inputValue,
        timestamp: new Date(),
        files: uploadedFiles.map((uf) => uf.file),
      };

      setMessages([...messages, userMessage]);
      setInputValue('');
      setUploadedFiles([]);

      // Simulate agent response
      setTimeout(() => {
        const agentMessage: ChatMessage = {
          id: String(messages.length + 2),
          type: 'agent',
          message: uploadedFiles.length > 0 
            ? `Gracias por enviar ${uploadedFiles.length} archivo(s). Un agente pronto revisará los documentos y estará disponible para ayudarte con más detalles.`
            : 'Gracias por tu mensaje. Un agente pronto estará disponible para ayudarte con más detalles.',
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
                      {msg.files && msg.files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <File className="w-3 h-3" />
                              <span className={msg.type === 'user' ? 'text-blue-100' : 'text-gray-600'}>
                                {file.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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
                {/* Archivos Cargados */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Archivos cargados ({uploadedFiles.length}):
                    </p>
                    <div className="space-y-2">
                      {uploadedFiles.map((uploadedFile, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white p-2 rounded border border-blue-100 text-xs"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <File className="w-3 h-3 text-blue-600" />
                            <span className="text-gray-700 truncate">
                              {uploadedFile.name}
                            </span>
                            <span className="text-gray-500 text-xs">({uploadedFile.size})</span>
                          </div>
                          <button
                            onClick={() => removeFile(idx)}
                            className="p-1 hover:bg-red-100 rounded transition"
                            aria-label="Eliminar archivo"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input de texto y botones */}
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
                    aria-label="Cargar archivo"
                    title="Cargar archivo"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
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

                {/* Input de archivo oculto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
                />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatPanel;
