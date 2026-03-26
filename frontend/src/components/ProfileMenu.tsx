import React, { useState } from 'react';
import { ChevronDown, LogOut, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { useChatHistory } from '../hooks/useChatHistory';

interface ProfileMenuProps {
  currentStatus?: string;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ currentStatus = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const { isEnabled: historyEnabled, toggleHistorySaving, clearChatHistory } = useChatHistory(user?.dni);

  const handleToggleHistory = (enabled: boolean) => {
    toggleHistorySaving(enabled);
    if (enabled) {
      addToast('✅ Historial guardado activado', 'success');
    } else {
      addToast('❌ Historial borrado', 'success');
    }
  };

  const MANUAL_ADVANCE_STATES = ['REVISION', 'BUSQUEDA_PROPIEDAD', 'TITULOS_CARGADOS', 'TASACION'];
  
  const nextStateMap: Record<string, string> = {
    'REVISION': 'BUSQUEDA_PROPIEDAD',
    'BUSQUEDA_PROPIEDAD': 'TITULOS_CARGADOS',
    'TITULOS_CARGADOS': 'TASACION',
    'TASACION': 'FINALIZADO',
  };

  const canAdvance = currentStatus && MANUAL_ADVANCE_STATES.includes(currentStatus.toUpperCase());
  const nextStatus = nextStateMap[currentStatus?.toUpperCase() || ''];

  const handleAdvanceStatus = async () => {
    if (!user?.dni || !currentStatus || !nextStatus) {
      addToast('No hay siguiente estado disponible', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;
      if (!lambdaUrl) {
        addToast('Lambda URL no configurada', 'error');
        setIsLoading(false);
        return;
      }

      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          dni: user.dni,
          email: user.email,
          new_status: nextStatus,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        addToast(`✅ Paso avanzado a: ${nextStatus}`, 'success');
        setIsOpen(false);
      } else {
        addToast(`❌ Error: ${data.message || 'No se pudo actualizar'}`, 'error');
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      addToast('Error al conectar con la base de datos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleDeleteProgress = async () => {
    if (!user?.dni) {
      addToast('No se encontro DNI para eliminar progreso', 'error');
      return;
    }

    setIsLoading(true);

    try {
      const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;
      if (!lambdaUrl) {
        addToast('Lambda URL no configurada', 'error');
        return;
      }

      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_user',
          dni: user.dni,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        clearChatHistory();
        addToast('✅ Progreso eliminado correctamente', 'success');
        setIsOpen(false);
      } else {
        addToast(`❌ Error: ${data.message || 'No se pudo eliminar el progreso'}`, 'error');
      }
    } catch (error) {
      console.error('Error al eliminar progreso:', error);
      addToast('Error al conectar con la base de datos', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Profile button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200 text-white group w-72"
      >
        <div className="flex flex-col items-start min-w-0">
          <p className="text-sm font-medium truncate">{user?.email}</p>
          <p className="text-xs text-white/70">{user?.dni}</p>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-2xl z-50 border border-gray-100 overflow-hidden">
          {/* Menu Items */}
          <div className="divide-y divide-gray-100">
            {/* Avanzar - solo si está en estado permitido */}
            {canAdvance && (
              <button
                onClick={handleAdvanceStatus}
                disabled={isLoading}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-[#10069f]" />
                  <p className="font-medium text-gray-900">Avanzar Paso</p>
                </div>
                {isLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#10069f] border-t-transparent"></div>
                )}
              </button>
            )}

            {/* Guardar Historial */}
            <button
              onClick={() => handleToggleHistory(!historyEnabled)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${historyEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <p className="font-medium text-gray-900">Guardar historial</p>
              </div>
              <span className="text-xs font-semibold text-gray-500">{historyEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {/* Eliminar progreso */}
            <button
              onClick={handleDeleteProgress}
              disabled={isLoading}
              className="w-full px-4 py-3 text-left hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-600" />
                <p className="font-medium text-black-700">Eliminar progreso</p>
              </div>
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
              )}
            </button>

            {/* Cerrar Sesión */}
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-3"
            >
              <LogOut className="w-5 h-5 text-[#10069f]" />
              <p className="font-medium text-gray-900">Cerrar Sesión</p>
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ProfileMenu;
