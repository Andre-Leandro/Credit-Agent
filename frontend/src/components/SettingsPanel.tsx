import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useChatHistory } from '../hooks/useChatHistory';

export const SettingsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();
  const { isEnabled: historyEnabled, toggleHistorySaving } = useChatHistory(user?.dni);

  const handleToggleHistory = (enabled: boolean) => {
    toggleHistorySaving(enabled);
    if (enabled) {
      addToast('✅ Guardado de historial activado', 'success');
    } else {
      addToast('❌ Guardado de historial desactivado y historial borrado', 'success');
    }
  };

  return (
    <div className="relative">
      {/* Botón de configuración */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 text-white relative"
        title="Opciones de configuración"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-2xl z-50 border border-gray-200">
          {/* Header del dropdown */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Configuración</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-4 space-y-4">
            {/* Info del usuario */}
            {user?.dni && (
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-600 font-semibold">DNI</p>
                <p className="text-sm font-bold text-blue-900 mt-1">{user.dni}</p>
              </div>
            )}

            {/* Toggle para guardar historial del chat */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-xs text-purple-600 font-semibold">GUARDAR HISTORIAL DEL CHAT</p>
                  <p className="text-xs text-purple-600 mt-1">Al desactivar se borrará todo el historial guardado</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={historyEnabled}
                    onChange={(e) => handleToggleHistory(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>

            {/* Información */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-600">
                💾 Cada DNI tiene su propio almacenamiento independiente. Tu historial se guarda únicamente en este navegador.
              </p>
            </div>

            {/* Botón para cerrar */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-all duration-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Overlay para cerrar dropdown al hacer click afuera */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SettingsPanel;
