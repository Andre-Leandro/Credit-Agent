import React, { useState } from 'react';
import { Upload, X, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from './Toast';
import { useRequest } from '../contexts/RequestContext';

interface UploadedDoc {
  id: string;
  name: string;
  file: File;
  type: 'dni_frente' | 'dni_dorso' | 'recibo';
}

interface DocumentationUploaderProps {
  onSendDocumentation: (files: UploadedDoc[]) => void;
  isLoading?: boolean;
}

export const DocumentationUploader: React.FC<DocumentationUploaderProps> = ({ 
  onSendDocumentation, 
  isLoading = false
}) => {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { addToast } = useToast();
  const { setRequestState } = useRequest();

  const documentTypes = [
    { id: 'dni_frente', label: 'DNI - Frente', required: true },
    { id: 'dni_dorso', label: 'DNI - Dorso', required: true },
    { id: 'recibo', label: 'Último Recibo de Sueldo', required: true },
  ] as const;

  type DocType = typeof documentTypes[number]['id'];

  const handleFiles = (files: FileList) => {
    const newFiles = Array.from(files);
    
    newFiles.forEach((file) => {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        addToast('Solo se aceptan imágenes y PDF', 'error');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        addToast('El archivo no puede pesar más de 10MB', 'error');
        return;
      }

      const fileType = document.querySelector(`input[data-file-type]`) as HTMLInputElement;
      if (!fileType?.dataset.fileType) {
        addToast('Por favor selecciona el tipo de documento', 'error');
        return;
      }

      const docId = fileType.dataset.fileType as DocType;
      
      setUploadedDocs((prev) => [
        ...prev.filter((doc) => doc.type !== docId),
        {
          id: `${docId}-${Date.now()}`,
          name: file.name,
          file: file,
          type: docId,
        },
      ]);

      addToast(`Archivo "${file.name}" cargado`, 'success');
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, docType: DocType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      
      files.forEach((file) => {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          addToast('Solo se aceptan imágenes y PDF', 'error');
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          addToast('El archivo no puede pesar más de 10MB', 'error');
          return;
        }

        setUploadedDocs((prev) => [
          ...prev.filter((doc) => doc.type !== docType),
          {
            id: `${docType}-${Date.now()}`,
            name: file.name,
            file: file,
            type: docType,
          },
        ]);
      });

      addToast('Archivo cargado correctamente', 'success');
    }
  };

  const removeDocument = (id: string) => {
    setUploadedDocs((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleSend = () => {
    const requiredDocs = ['dni_frente', 'dni_dorso', 'recibo'];
    const uploadedTypes = uploadedDocs.map((doc) => doc.type);

    const missing = requiredDocs.filter((type) => !uploadedTypes.includes(type as DocType));

    if (missing.length > 0) {
      addToast(`Faltan documentos: ${missing.join(', ')}`, 'error');
      return;
    }

    onSendDocumentation(uploadedDocs);
    setUploadedDocs([]);
  };

  const allDocumentsUploaded = uploadedDocs.length === 3;

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2 mt-6">Carga de Documentación</h2>
        <p className="text-sm text-gray-600 mb-6">Sube los documentos requeridos para continuar</p>

        <div className="space-y-4">
          {documentTypes.map((docType) => {
            const uploaded = uploadedDocs.find((doc) => doc.type === docType.id);
            return (
              <div
                key={docType.id}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={(e) => handleDrop(e, docType.id as DocType)}
                className={`relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer ${
                  dragActive
                    ? 'border-[#10069f] bg-blue-50'
                    : uploaded
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-[#10069f]'
                }`}
              >
                {uploaded ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{docType.label}</p>
                        <p className="text-xs text-gray-600">{uploaded.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeDocument(uploaded.id)}
                      className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">{docType.label}</p>
                      <p className="text-xs text-gray-500">Arrastra aquí o haz click</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                      className="hidden"
                      data-file-type={docType.id}
                      disabled={isLoading}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botones */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
        <Button
          onClick={handleSend}
          disabled={!allDocumentsUploaded || isLoading}
          className="w-full h-10 text-sm font-semibold bg-[#10069f] hover:bg-[#0a0470] disabled:opacity-50"
          variant="default"
        >
          Enviar al Agente
        </Button>

        <Button
          onClick={() => setRequestState('simulator')}
          disabled={isLoading}
          className="w-full h-10 text-sm font-semibold"
          variant="outline"
        >
          Volver al Simulador
        </Button>
      </div>
    </div>
  );
};

export default DocumentationUploader;
