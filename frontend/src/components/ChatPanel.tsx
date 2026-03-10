import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Paperclip, File, Loader, MessageSquare, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useChatAgent } from '../hooks/useChatAgent';

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

const ChatPanel = forwardRef<any, {}>((_, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { sendMessage, isLoading, error } = useChatAgent();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'agent',
      message: '¡Hola! Soy tu asistente de crédito. Puedes usar el simulador de la izquierda para obtener una pre-aprobación, o escribeme aquí directamente. ¿En qué puedo ayudarte?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Exponer el método sendMessageDirect a través del ref
  useImperativeHandle(ref, () => ({
    sendMessageDirect: async (message: string) => {
      if (message.trim()) {
        const userMessage: ChatMessage = {
          id: String(messages.length + 1),
          type: 'user',
          message: message,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);

        const response = await sendMessage({
          message: message,
          files: [],
        });

        const agentMessage: ChatMessage = {
          id: String(messages.length + 2),
          type: 'agent',
          message: response.success 
            ? response.message 
            : `Error: ${response.error || 'No se pudo conectar con el agente'}`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, agentMessage]);
      }
    }
  }));

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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() || uploadedFiles.length > 0) {
      const filesToSend = uploadedFiles.map((uf) => uf.file);

      const userMessage: ChatMessage = {
        id: String(messages.length + 1),
        type: 'user',
        message: inputValue,
        timestamp: new Date(),
        files: filesToSend,
      };

      setMessages([...messages, userMessage]);
      setInputValue('');
      setUploadedFiles([]);

      const response = await sendMessage({
        message: inputValue,
        files: filesToSend,
      });

      const agentMessage: ChatMessage = {
        id: String(messages.length + 2),
        type: 'agent',
        message: response.success 
          ? response.message 
          : `Error: ${response.error || 'No se pudo conectar con el agente'}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 flex justify-center">
        <div className="w-full max-w-3xl px-6 py-6 space-y-4 pb-6 mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md px-4 py-3 rounded-lg ${
                  msg.type === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                {msg.files && msg.files.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-300/30 space-y-1">
                    {msg.files.map((file, idx) => (
                      <div key={idx} className="text-xs flex items-center gap-1">
                        <File className="w-3 h-3" />
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
                <p className={`text-xs mt-2 ${
                  msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {msg.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 border border-gray-200 rounded-lg rounded-bl-none px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm">El asistente está escribiendo...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white flex-shrink-0 flex justify-center p-6">
        <div className="w-full max-w-3xl space-y-3 mx-auto">
          {/* Uploaded Files Preview */}
          {uploadedFiles.length > 0 && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Archivos adjuntos:</p>
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((uf, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700"
                  >
                    <File className="w-3 h-3 text-blue-600" />
                    <span>{uf.name}</span>
                    <span className="text-gray-400">({uf.size})</span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="ml-1 text-gray-400 hover:text-gray-600 transition"
                      aria-label="Remover archivo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 rounded-lg border border-red-200 p-3">
              <p className="text-xs font-semibold text-red-700">Error: {error}</p>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-blue-600"
              aria-label="Adjuntar archivo"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              aria-label="Seleccionar archivo"
            />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje aquí..."
              className="flex-1 h-11 border-gray-300"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputValue.trim() && uploadedFiles.length === 0)}
              className="px-4 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

ChatPanel.displayName = 'ChatPanel';

export default ChatPanel;
