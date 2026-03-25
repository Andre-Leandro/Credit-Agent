import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Home, DollarSign, Clock, FileText, X, ZoomIn } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { useToast, ToastContainer } from './Toast';
import DocumentationUploader from './DocumentationUploader';
import { PropertyDocumentsUploader } from './PropertyDocumentsUploader';
import { PropertySearchForm } from './PropertySearchForm';
import { useRequest } from '../contexts/RequestContext';
import { useAuth } from '../contexts/AuthContext';

interface CollapsibleSimulatorProps {
  onSendMessage: (message: string, files?: File[]) => void;
  isLoading?: boolean;
}

export const CollapsibleSimulator: React.FC<CollapsibleSimulatorProps> = ({ onSendMessage, isLoading = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [documentTab, setDocumentTab] = useState<'personal' | 'propiedad'>('personal');
  const { requestState } = useRequest();
  const { user } = useAuth();
  const [destination, setDestination] = useState('Construcción de segunda vivienda');
  const [years, setYears] = useState(15);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [propertyValue, setPropertyValue] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [salaryAccount, setSalaryAccount] = useState('No');
  const [cvsCap, setCvsCap] = useState('No');
  const { toasts, removeToast } = useToast();

  // Estados para documentos
  const REVIEW_STATES = ['REVISION', 'BUSQUEDA_PROPIEDAD', 'TITULOS_CARGADOS', 'TASACION', 'FINALIZADO'];
  const isInReviewState = user?.estado && REVIEW_STATES.includes(user.estado.toUpperCase());
  const isBusquedaPropiedadState = user?.estado && user.estado.toUpperCase() === 'BUSQUEDA_PROPIEDAD';
  const isTitulosCargadosState = user?.estado && user.estado.toUpperCase() === 'TITULOS_CARGADOS';
  const isTasacionState = user?.estado && user.estado.toUpperCase() === 'TASACION';
  const isFinalizadoState = user?.estado && user.estado.toUpperCase() === 'FINALIZADO';
  
  // Fotos personales y de propiedad
  const fotosPersonales = user?.fotos_visibles ? (Array.isArray(user.fotos_visibles) ? user.fotos_visibles : [user.fotos_visibles]) : [];
  const fotosPropiedad = (user as any)?.fotos_visibles_propiedad ? (Array.isArray((user as any).fotos_visibles_propiedad) ? (user as any).fotos_visibles_propiedad : [(user as any).fotos_visibles_propiedad]) : [];
  
  // Usar fotos según la tab seleccionada en TASACION y FINALIZADO
  const fotosActuales = (isTasacionState || isFinalizadoState)
    ? (documentTab === 'personal' ? fotosPersonales : fotosPropiedad)
    : fotosPersonales;

  // Debug: mostrar qué panel se renderiza
  useEffect(() => {
    console.log('🎨 CollapsibleSimulator - Renderizando panel:', requestState === 'simulator' ? '📋 SIMULADOR' : '📄 DOCUMENTACION');
  }, [requestState]);

  // Resetear pan y zoom cuando se abre una nueva imagen
  useEffect(() => {
    if (zoomImage) {
      setPanX(0);
      setPanY(0);
      setZoomScale(1);
      setIsDragging(false);
    }
  }, [zoomImage]);

  // Handlers para pan (mover imagen) - Solo cuando está presionado el botón
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (zoomScale <= 1 || e.button !== 0) return; // Solo botón izquierdo y si es zoom
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return; // Solo mover si está presionado
    e.preventDefault();
    e.stopPropagation();
    const newPanX = e.clientX - dragStart.x;
    const newPanY = e.clientY - dragStart.y;
    setPanX(newPanX);
    setPanY(newPanY);
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const handleContainerMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);
  };

  const handleSimulation = () => {
    if (propertyValue === 0 || loanAmount === 0 || years === 0 || monthlyIncome === 0) {
      return;
    }
    
    // Formattear mensaje para el chat
    const mensaje = `Solicito evaluar mi crédito con los siguientes datos:

  Datos de la Solicitud
- Destino: ${destination}
- Valor de la Propiedad: $${propertyValue.toLocaleString('es-AR')}
- Monto del Crédito: $${loanAmount.toLocaleString('es-AR')}
- Plazo: ${years} años
- Ingreso Mensual: $${monthlyIncome.toLocaleString('es-AR')}
- Haberes en BNA: ${salaryAccount}
- Opción Tope CVS: ${cvsCap}
¿Puedo proceder con la solicitud?`;

    // Enviar al chat
    onSendMessage(mensaje);
    
    // Limpiar formulario
    handleReset();
    setIsOpen(false);
  };

  const handleReset = () => {
    setDestination('Construcción de segunda vivienda');
    setYears(15);
    setMonthlyIncome(0);
    setPropertyValue(0);
    setLoanAmount(0);
    setSalaryAccount('No');
    setCvsCap('No');
  };

  const handleSendDocumentation = (files: any[]) => {
    const mensaje = `Hola. Acá te paso los datos para continuar con mi solicitud de crédito:

Documentos Adjuntos:
- DNI (Frente)
- DNI (Dorso)
- Último Recibo de Sueldo

Por favor, procede con la evaluación de mi solicitud.`;

    // Convertir UploadedDoc[] a File[]
    const fileObjects = files.map((doc) => doc.file);
    
    onSendMessage(mensaje, fileObjects);
  };

  const handleSendPropertyDocumentation = (files: any[]) => {
    const mensaje = `Hola. Acá te paso los documentos de la propiedad para continuar con mi solicitud de crédito:

Documentos Adjuntos:
- Título de Propiedad
- Plano de la Propiedad

Por favor, procede con la evaluación.`;

    // Convertir UploadedDoc[] a File[]
    const fileObjects = files.map((doc) => doc.file);
    
    onSendMessage(mensaje, fileObjects);
  };

  return (
    <>
      {/* Panel desplegable */}
      <div
        className={`fixed left-0 top-16 bottom-0 z-30 bg-white shadow-2xl transform transition-all duration-300 ${
          isOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full'
        } overflow-hidden flex flex-col`}
      >
        {requestState === 'simulator' ? (
          <>
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarGutter: 'stable' }}>
              <h2 className="text-xl font-bold text-gray-900 mb-6 mt-6">Simulador de Crédito</h2>
          
          <div className="space-y-5">
            {/* Destino */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900">
                Destino del Crédito
              </Label>
              <Select 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                className="w-full h-10 text-sm"
              >
                <option value="Construcción de segunda vivienda">Construcción de segunda vivienda</option>
                <option value="Compra de vivienda">Compra de vivienda</option>
                <option value="Refraccionamiento">Refraccionamiento</option>
                <option value="Mejoras del hogar">Mejoras del hogar</option>
              </Select>
            </div>

            {/* Plazo */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#10069f]" />
                Plazo (años)
              </Label>
              <Input 
                type="number"
                step="1"
                value={years === 0 ? '' : years}
                onChange={(e) => setYears(e.target.value === '' ? 0 : Number(e.target.value))}
                className="text-sm h-10"
                placeholder="15"
                disabled={isLoading}
              />
            </div>

            {/* Ingreso Mensual */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#10069f]" />
                Ingreso Mensual
              </Label>
              <Input 
                type="number"
                step="1000"
                value={monthlyIncome === 0 ? '' : monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value === '' ? 0 : Number(e.target.value))}
                className="text-sm h-10"
                placeholder="50000"
                disabled={isLoading}
              />
            </div>

            {/* Propiedad */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-[#10069f]" />
                Valor de la Propiedad
              </Label>
              <Input 
                type="number"
                step="1000"
                value={propertyValue === 0 ? '' : propertyValue}
                onChange={(e) => setPropertyValue(e.target.value === '' ? 0 : Number(e.target.value))}
                className="text-sm h-10"
                placeholder="100000"
                disabled={isLoading}
              />
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#10069f]" />
                Monto del Crédito
              </Label>
              <Input 
                type="number"
                step="1000"
                value={loanAmount === 0 ? '' : loanAmount}
                onChange={(e) => setLoanAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                className="text-sm h-10"
                placeholder="70000"
                disabled={isLoading}
              />
            </div>

            {/* Cuenta de Haberes */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900">
                ¿Posees Haberes en BNA?
              </Label>
              <Select 
                value={salaryAccount} 
                onChange={(e) => setSalaryAccount(e.target.value)}
                className="w-full h-10 text-sm"
                disabled={isLoading}
              >
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </Select>
            </div>

            {/* CVS */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-900">
                Opción Tope CVS
              </Label>
              <Select 
                value={cvsCap} 
                onChange={(e) => setCvsCap(e.target.value)}
                className="w-full h-10 text-sm"
                disabled={isLoading}
              >
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
          <Button 
            onClick={handleSimulation}
            disabled={isLoading}
            className="w-full h-10 text-sm font-semibold bg-[#10069f] hover:bg-[#0a0470] disabled:opacity-50"
            variant="default"
          >
            Enviar al Chat
          </Button>
          
          <Button 
            onClick={handleReset}
            disabled={isLoading}
            className="w-full h-10 text-sm font-semibold"
            variant="outline"
          >
            Limpiar
          </Button>
        </div>
        </>
        ) : isBusquedaPropiedadState ? (
          <PropertySearchForm
            onSendMessage={onSendMessage}
            isLoading={isLoading}
          />
        ) : isTitulosCargadosState ? (
          <PropertyDocumentsUploader
            onSendDocumentation={handleSendPropertyDocumentation}
            isLoading={isLoading}
          />
        ) : isInReviewState ? (
          // Vista de Documentos Cargados para estados de revisión
          <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarGutter: 'stable' }}>
            <h2 className="text-xl font-bold text-gray-900 mb-6 mt-6">Documentos Cargados</h2>
            
            {/* Tabs - Solo mostrar en TASACION y FINALIZADO */}
            {(isTasacionState || isFinalizadoState) && (
              <div className="flex justify-center mb-6">
                <div className="inline-flex gap-0 border-b border-gray-200">
                  <button
                    onClick={() => setDocumentTab('personal')}
                    className={`px-4 py-2 font-semibold text-sm relative ${
                      documentTab === 'personal'
                        ? 'text-[#10069f]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={{
                      borderBottom: documentTab === 'personal' ? '2px solid #10069f' : 'none'
                    }}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => setDocumentTab('propiedad')}
                    className={`px-4 py-2 font-semibold text-sm relative ${
                      documentTab === 'propiedad'
                        ? 'text-[#10069f]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    style={{
                      borderBottom: documentTab === 'propiedad' ? '2px solid #10069f' : 'none'
                    }}
                  >
                    Propiedad
                  </button>
                </div>
              </div>
            )}
            
            {fotosActuales.length > 0 ? (
              <div className="space-y-3">
                {fotosActuales.map((foto: string, index: number) => (
                  <div key={index} className="flex flex-col">
                    <button
                      onClick={() => {
                        setZoomImage(foto);
                        setZoomScale(1);
                      }}
                      className="relative block w-full p-0 m-0 bg-gray-200 hover:opacity-90 transition-opacity cursor-zoom-in group rounded-t-lg overflow-hidden"
                    >
                      <img 
                        src={foto} 
                        alt={`Documento ${index + 1}`} 
                        className="w-full h-auto object-contain max-h-96 m-0 block" 
                      />
                      <div className="absolute top-2 right-2 bg-black/50 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </button>

                    <div className="px-3 py-2.5 m-0 bg-white border border-gray-200 rounded-b-lg border-t-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#10069f]" />
                        <span className="text-sm text-gray-700 font-medium">Documento {index + 1}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  No hay documentos cargados aún.
                </p>
              </div>
            )}
          </div>
        ) : (
          <DocumentationUploader
            onSendDocumentation={handleSendDocumentation}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed left-0 top-1/2 transform -translate-y-1/2 z-40 p-2 bg-[#10069f] text-white rounded-r-lg shadow-lg hover:shadow-xl transition-all duration-300 ${
          isOpen ? 'translate-x-80' : 'translate-x-0'
        }`}
        aria-label="Toggle simulador"
        disabled={isLoading}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>

      {/* Modal de Zoom */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="relative bg-black rounded-lg shadow-2xl max-w-4xl w-full">
            {/* Botón cerrar */}
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all text-white"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Contenedor de imagen con scroll */}
            <div
              className={`flex items-center justify-center overflow-auto max-h-screen ${
                isDragging && zoomScale > 1 ? 'cursor-grabbing' : zoomScale > 1 ? 'cursor-grab' : 'cursor-default'
              }`}
              onMouseMove={handleImageMouseMove}
              onMouseUp={handleContainerMouseUp}
              onMouseLeave={handleImageMouseUp}
              style={{ userSelect: 'none' }}
            >
              <img
                src={zoomImage}
                alt="Zoom"
                className="w-full h-auto object-contain"
                style={{
                  transform: `scale(${zoomScale}) translate(${panX}px, ${panY}px)`,
                  transformOrigin: 'center',
                  userSelect: 'none',
                  touchAction: 'none',
                  cursor: isDragging && zoomScale > 1 ? 'grabbing' : zoomScale > 1 ? 'grab' : 'default'
                }}
                onMouseDown={handleImageMouseDown}
                draggable={false}
              />
            </div>

            {/* Controles de zoom */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/50 rounded-lg p-3 backdrop-blur-sm">
              <button
                onClick={() => {
                  setZoomScale(Math.max(1, zoomScale - 0.2));
                  setPanX(0);
                  setPanY(0);
                }}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-all text-sm font-medium"
              >
                −
              </button>
              <span className="text-white text-sm font-medium min-w-16 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                onClick={() => {
                  setZoomScale(Math.min(3, zoomScale + 0.2));
                }}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-all text-sm font-medium"
              >
                +
              </button>
              <div className="w-px h-6 bg-white/20"></div>
              <button
                onClick={() => {
                  setZoomScale(1);
                  setPanX(0);
                  setPanY(0);
                }}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded transition-all text-sm font-medium"
              >
                Ajustar
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default CollapsibleSimulator;
