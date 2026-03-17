import React, { useState } from 'react';
import { Settings, ChevronDown, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

interface AdminPanelProps {
  currentStatus?: string;
  onStatusUpdated?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentStatus, onStatusUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();

  // Estados que permiten avance manual
  const MANUAL_ADVANCE_STATES = ['REVISION', 'BUSQUEDA_PROPIEDAD', 'TITULOS_CARGADOS', 'TASACION'];
  
  const nextStateMap: Record<string, string> = {
    'REVISION': 'BUSQUEDA_PROPIEDAD',
    'BUSQUEDA_PROPIEDAD': 'TITULOS_CARGADOS',
    'TITULOS_CARGADOS': 'TASACION',
    'TASACION': 'FINALIZADO',
  };

  // Solo mostrar si está en uno de los estados permitidos
  const canAdvance = currentStatus && MANUAL_ADVANCE_STATES.includes(currentStatus.toUpperCase());

  const handleAdvanceStatus = async () => {
    if (!user?.dni || !currentStatus) {
      addToast('Falta información del usuario', 'error');
      return;
    }

    const newStatus = nextStateMap[currentStatus.toUpperCase()];
    if (!newStatus) {
      addToast('No hay siguiente estado', 'error');
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
          new_status: newStatus,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        addToast(`✅ Estado actualizado a: ${newStatus}`, 'success');
        setIsOpen(false);
        onStatusUpdated?.();
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

  if (!canAdvance) {
    return null; // No mostrar si no puede avanzar
  }

  return (
    <div className="relative">
      {/* Botón de configuración */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200 text-white relative"
        title="Opciones de administración"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-2xl z-50 border border-gray-200">
          {/* Header del dropdown */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Avance Manual</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-4 space-y-4">
            {/* Info del paso actual */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold">PASO ACTUAL</p>
              <p className="text-sm font-bold text-blue-900 mt-1">{currentStatus}</p>
            </div>

            {/* Info del siguiente paso */}
            {nextStateMap[currentStatus?.toUpperCase() || ''] && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-xs text-green-600 font-semibold">SIGUIENTE PASO</p>
                <p className="text-sm font-bold text-green-900 mt-1">
                  {nextStateMap[currentStatus?.toUpperCase() || '']}
                </p>
              </div>
            )}

            {/* Advertencia */}
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-amber-700">
                ⚠️ Esta acción simulará el avance manual de un paso. Se actualizará en la base de datos.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAdvanceStatus}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 rotate-90" />
                    Avanzar
                  </>
                )}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-900 font-semibold py-2 px-4 rounded-lg transition-all duration-200"
              >
                Salir
              </button>
            </div>
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

export default AdminPanel;
