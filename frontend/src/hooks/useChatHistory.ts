import { useState, useCallback, useEffect } from 'react';

interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  message: string;
  timestamp: Date;
  files?: File[];
}

// Claves de localStorage con formato: key_${DNI}
const getChatHistoryKey = (dni: string) => `chat_history_${dni}`;
const getChatHistoryEnabledKey = (dni: string) => `chat_history_enabled_${dni}`;

export const useChatHistory = (dni?: string) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [, setForceUpdate] = useState(0);

  const userDni = dni || '';

  // Cargar el estado de habilitación desde localStorage al montar o cuando cambia el DNI
  useEffect(() => {
    if (!userDni) return;
    
    const stored = localStorage.getItem(getChatHistoryEnabledKey(userDni));
    if (stored !== null) {
      setIsEnabled(stored === 'true');
    } else {
      setIsEnabled(true);
    }
  }, [userDni]);

  // Cargar historial del chat desde localStorage
  const loadChatHistory = useCallback((): ChatMessage[] => {
    if (!isEnabled || !userDni) return [];
    
    try {
      const stored = localStorage.getItem(getChatHistoryKey(userDni));
      if (stored) {
        const messages = JSON.parse(stored);
        // Convertir timestamp de string a Date
        return messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })) as ChatMessage[];
      }
    } catch (error) {
      console.error('Error cargando historial del chat:', error);
    }
    return [];
  }, [isEnabled, userDni]);

  // Guardar historial del chat en localStorage
  const saveChatHistory = useCallback((messages: ChatMessage[]): void => {
    if (!isEnabled || !userDni) return;

    try {
      // No guardar archivos en localStorage por su tamaño
      const messagesToSave = messages.map((msg) => ({
        ...msg,
        files: undefined,
      }));
      localStorage.setItem(getChatHistoryKey(userDni), JSON.stringify(messagesToSave));
    } catch (error) {
      console.error('Error guardando historial del chat:', error);
    }
  }, [isEnabled, userDni]);

  // Limpiar historial del chat
  const clearChatHistory = useCallback((): void => {
    if (!userDni) return;
    
    try {
      localStorage.removeItem(getChatHistoryKey(userDni));
    } catch (error) {
      console.error('Error limpiando historial del chat:', error);
    }
  }, [userDni]);

  // Toggle para habilitar/deshabilitar guardar historial
  const toggleHistorySaving = useCallback((enabled: boolean): void => {
    if (!userDni) return;
    
    setIsEnabled(enabled);
    try {
      localStorage.setItem(getChatHistoryEnabledKey(userDni), String(enabled));
      if (!enabled) {
        // Al desactivar, borrar TODO el historial
        localStorage.removeItem(getChatHistoryKey(userDni));
      }
      // Forzar actualización en componentes que usan este hook
      setForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error('Error al cambiar preferencia de historial:', error);
    }
  }, [userDni]);

  return {
    isEnabled,
    loadChatHistory,
    saveChatHistory,
    clearChatHistory,
    toggleHistorySaving,
  };
};
