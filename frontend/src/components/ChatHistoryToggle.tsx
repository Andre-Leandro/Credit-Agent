import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChatHistory } from '../hooks/useChatHistory';
import { useToast } from './Toast';

export const ChatHistoryToggle: React.FC = () => {
  const { user } = useAuth();
  const { isEnabled, toggleHistorySaving } = useChatHistory(user?.dni);
  const { addToast } = useToast();

  const handleToggle = () => {
    toggleHistorySaving(!isEnabled);
    if (!isEnabled) {
      addToast('✅ Historial guardado activado', 'success');
    } else {
      addToast('❌ Historial borrado', 'success');
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium ${
        isEnabled
          ? 'bg-white/20 hover:bg-white/30 text-white'
          : 'bg-red-500/20 hover:bg-red-500/30 text-red-100'
      }`}
      title={isEnabled ? 'Historial guardado activo' : 'Historial guardado desactivado'}
    >
      <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
      {isEnabled ? 'Historial' : 'Sin historial'}
    </button>
  );
};

export default ChatHistoryToggle;
