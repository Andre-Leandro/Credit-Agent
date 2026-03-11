import React from 'react';
import { CheckCircle2, Circle, FileText, CheckCircle, Target, Award } from 'lucide-react';

interface ProgressCheckpoint {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'pending';
}

export const CreditProgressBar: React.FC = () => {
  const checkpoints: ProgressCheckpoint[] = [
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
      id: 'doc-approval',
      label: 'Revisión',
      description: 'Aprobación de docs',
      icon: <CheckCircle className="w-5 h-5" />,
      status: 'pending'
    },
    {
      id: 'final-approval',
      label: 'Aprobación',
      description: 'Aprobación final',
      icon: <Award className="w-5 h-5" />,
      status: 'pending'
    }
  ];

  return (
    <div className="w-full h-full bg-gradient-to-b from-[#f5f3ff] to-white p-6 overflow-y-auto">
      <div className="flex flex-col gap-8">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Progreso del Crédito</h3>
          <p className="text-sm text-gray-600">Seguimiento de tu solicitud</p>
        </div>

        <div className="space-y-0">
          {checkpoints.map((checkpoint, index) => (
            <div key={checkpoint.id} className="relative">
              {/* Conector vertical */}
              {index < checkpoints.length - 1 && (
                <div
                  className={`absolute left-6 top-12 w-0.5 h-12 ${
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
                  className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
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
                    className={`font-semibold transition-colors ${
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
                    className={`text-xs transition-colors ${
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
