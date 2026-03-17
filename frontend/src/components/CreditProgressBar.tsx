import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, FileText, CheckCircle, Target, Award, Search, FileCheck, Home} from 'lucide-react';

interface ProgressCheckpoint {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending';
}

interface ProgressData {
  estado?: string;
  monto_credito?: number;
  plazo_anos?: number;
  valor_propiedad?: number;
  [key: string]: any;
}

export const CreditProgressBar: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<ProgressCheckpoint[]>([
    {
      id: 'preapproval',
      label: 'Pre-aprobación',
      description: 'Evaluación inicial',
      icon: <Target className="w-5 h-5" />,
      status: 'pending'
    },
    {
      id: 'documents',
      label: 'Documentación',
      description: 'Subida de archivos',
      icon: <FileText className="w-5 h-5" />,
      status: 'pending'
    },
    {
      id: 'credit-analysis',
      label: 'Análisis Crediticio',
      description: 'Revisión por colaborador humano',
      icon: <CheckCircle className="w-5 h-5" />,
      status: 'pending'
    },
    {
      id: 'property-search',
      label: 'Búsqueda de Vivienda',
      description: 'Identificación de propiedad',
      icon: <Search className="w-5 h-5" />,
      status: 'pending'
    },
    {
      id: 'titles-plans',
      label: 'Títulos y Planos',
      description: 'Documentación de propiedad',
      icon: <FileCheck className="w-5 h-5" />,
      status: 'pending'
    },
    {
      id: 'appraisal',
      label: 'Tasación',
      description: 'Evaluación del inmueble',
      icon: <Home className="w-5 h-5" />,
      status: 'pending'
    },
    {
      id: 'completed',
      label: 'Finalizado',
      description: 'Crédito aprobado',
      icon: <Award className="w-5 h-5" />,
      status: 'pending'
    }
  ]);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);

  // Obtener el progreso del Lambda (silencioso)
  const obtenerProgreso = async () => {
    try {
      // Obtener el usuario del localStorage
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      const dniGuardado = user?.dni;

      if (!dniGuardado) return;

      const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;
      if (!lambdaUrl) return;

      const respuesta = await fetch(lambdaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          "action": "get_status",
          "dni": dniGuardado
        })
      });

      const data = await respuesta.json();

      console.log('📡 Respuesta completa de Lambda:', data);

      if (data.status === "success" && data.data) {
        console.log('✅ Datos recibidos correctamente:', data.data);
        setProgressData(data.data);
        actualizarUI(data.data);
      } else {
        console.warn('⚠️ Respuesta inesperada de Lambda:', data);
      }
    } catch (err) {
      console.error('❌ Error en obtenerProgreso:', err);
      // Silencioso - no mostrar errores
    }
  };

  // Actualizar UI basado en el estado
  const actualizarUI = (data: ProgressData) => {
    const estado = (data.estado || '').toUpperCase();
    
    // DEBUG: Printear el estado que se recibe
    console.log('🔍 Estado recibido de Lambda:', {
      estado_raw: data.estado,
      estado_uppercase: estado,
      datos_completos: data,
      timestamp: new Date().toISOString()
    });
    
    const nuevoCheckpoints = checkpoints.map(cp => {
      let status: 'completed' | 'current' | 'pending' = 'pending';

      // Mapear estados de DynamoDB a estados de UI (coincidiendo con los nombres exactos)
      switch (estado) {
        case 'PREAPROBACION':
          console.log('✓ Entró en PRE_APROBACION');
          if (cp.id === 'preapproval') status = 'current';
          break;
        case 'DOCUMENTACION':
          console.log('✓ Entró en DOCUMENTACION');
          if (cp.id === 'preapproval') status = 'completed';
          if (cp.id === 'documents') status = 'current';
          break;
        case 'REVISION':
          console.log('✓ Entró en REVISION');
          if (cp.id === 'preapproval' || cp.id === 'documents') status = 'completed';
          if (cp.id === 'credit-analysis') status = 'current';
          break;
        case 'BUSQUEDA_PROPIEDAD':
          console.log('✓ Entró en BUSQUEDA_PROPIEDAD');
          if (cp.id === 'preapproval' || cp.id === 'documents' || cp.id === 'credit-analysis') status = 'completed';
          if (cp.id === 'property-search') status = 'current';
          break;
        case 'TITULOS_CARGADOS':
          console.log('✓ Entró en TITULOS_CARGADOS');
          if (cp.id === 'preapproval' || cp.id === 'documents' || cp.id === 'credit-analysis' || cp.id === 'property-search') status = 'completed';
          if (cp.id === 'titles-plans') status = 'current';
          break;
        case 'TASACION':
          console.log('✓ Entró en TASACION');
          if (cp.id === 'preapproval' || cp.id === 'documents' || cp.id === 'credit-analysis' || cp.id === 'property-search' || cp.id === 'titles-plans') status = 'completed';
          if (cp.id === 'appraisal') status = 'current';
          break;
        case 'FINALIZADO':
          console.log('✓ Entró en FINALIZADO/COMPLETADO/APROBADO');
          status = 'completed';
          break;
        default:
          console.warn('⚠️ Estado no reconocido:', estado);
      }

      return { ...cp, status };
    });

    console.log('📊 Checkpoints actualizados:', nuevoCheckpoints);
    setCheckpoints(nuevoCheckpoints);
  };

  // Cargar progreso al montar y cada 10 segundos (silencioso)
  useEffect(() => {
    obtenerProgreso();
    const intervalo = setInterval(obtenerProgreso, 10000); // 10 segundos
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-b from-[#f5f3ff] to-white p-6 overflow-y-auto">
      <div className="flex flex-col gap-8">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Progreso del Crédito</h3>
          <p className="text-sm text-gray-600">Seguimiento de tu solicitud</p>
          
          {progressData && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-800 space-y-1">
              <p><strong>Monto:</strong> ${progressData.monto_credito?.toLocaleString() || 'N/A'}</p>
              <p><strong>Propiedad:</strong> ${progressData.valor_propiedad?.toLocaleString() || 'N/A'}</p>
              <p><strong>Plazo:</strong> {progressData.plazo_anos} años</p>
              <p><strong>Estado:</strong> <span className="font-semibold">{progressData.estado}</span></p>
            </div>
          )}
        </div>

        <div className="space-y-0">
          {checkpoints.map((checkpoint, index) => (
            <div key={checkpoint.id} className="relative">
              {/* Conector vertical */}
              {index < checkpoints.length - 1 && (
                <div
                  className={`absolute left-6 top-12 w-0.5 h-12 transition-all duration-500 ${
                    checkpoint.status === 'completed'
                      ? 'bg-gradient-to-b from-green-400 to-green-300'
                      : checkpoint.status === 'current'
                      ? 'bg-gradient-to-b from-[#10069f] to-[#0a0470]'
                      : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Checkpoint */}
              <div className="flex items-start gap-4 pb-4">
                {/* Icono */}
                <div
                  className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    checkpoint.status === 'completed'
                      ? 'bg-green-100 text-green-600 ring-2 ring-green-300'
                      : checkpoint.status === 'current'
                      ? 'bg-[#f5f3ff] text-[#10069f] ring-2 ring-[#10069f] animate-pulse'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {checkpoint.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : checkpoint.status === 'current' ? (
                    checkpoint.icon
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 pt-1">
                  <h4
                    className={`font-semibold transition-colors duration-500 ${
                      checkpoint.status === 'completed'
                        ? 'text-green-700'
                        : checkpoint.status === 'current'
                        ? 'text-[#10069f]'
                        : 'text-gray-500'
                    }`}
                  >
                    {checkpoint.label}
                  </h4>
                  <p
                    className={`text-xs transition-colors duration-500 ${
                      checkpoint.status === 'completed'
                        ? 'text-green-600'
                        : checkpoint.status === 'current'
                        ? 'text-[#10069f]'
                        : 'text-gray-400'
                    }`}
                  >
                    {checkpoint.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreditProgressBar;