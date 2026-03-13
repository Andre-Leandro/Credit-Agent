import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Home, DollarSign, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { useToast, ToastContainer } from './Toast';
import DocumentationUploader from './DocumentationUploader';
import { useRequest } from '../contexts/RequestContext';

interface CollapsibleSimulatorProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export const CollapsibleSimulator: React.FC<CollapsibleSimulatorProps> = ({ onSendMessage, isLoading = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { requestState } = useRequest();
  const [destination, setDestination] = useState('Construcción de segunda vivienda');
  const [years, setYears] = useState(15);
  const [propertyValue, setPropertyValue] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [salaryAccount, setSalaryAccount] = useState('No');
  const [cvsCap, setCvsCap] = useState('No');
  const { toasts, addToast, removeToast } = useToast();

  // Debug: mostrar qué panel se renderiza
  useEffect(() => {
    console.log('🎨 CollapsibleSimulator - Renderizando panel:', requestState === 'simulator' ? '📋 SIMULADOR' : '📄 DOCUMENTACION');
  }, [requestState]);

  const handleSimulation = () => {
    if (propertyValue === 0 || loanAmount === 0 || years === 0) {
      addToast('Por favor completa todos los campos', 'error');
      return;
    }

    const ltv = (loanAmount / propertyValue) * 100;

    if (ltv > 80) {
      addToast('LTV mayor a 80%. Crédito rechazado.', 'error');
      return;
    }
    
    // Formattear mensaje para el chat
    const mensaje = `Solicito evaluar mi crédito con los siguientes datos:

  Datos de la Solicitud
- Destino: ${destination}
- Valor de la Propiedad: $${propertyValue.toLocaleString('es-AR')}
- Monto del Crédito: $${loanAmount.toLocaleString('es-AR')}
- Plazo: ${years} años
- Haberes en BNA: ${salaryAccount}
- Opción Tope CVS: ${cvsCap}
¿Puedo proceder con la solicitud?`;

    // Enviar al chat
    onSendMessage(mensaje);
    
    // Limpiar formulario
    handleReset();
    setIsOpen(false);
    addToast('Datos enviados al chat', 'success');
  };

  const handleReset = () => {
    setDestination('Construcción de segunda vivienda');
    setYears(15);
    setPropertyValue(0);
    setLoanAmount(0);
    setSalaryAccount('No');
    setCvsCap('No');
  };

  const handleSendDocumentation = (_files: any[]) => {
    const mensaje = `Hola. Acá te paso los datos para continuar con mi solicitud de crédito:

📄 Documentos Adjuntos:
- DNI (Frente)
- DNI (Dorso)
- Último Recibo de Sueldo

Por favor, procede con la evaluación de mi solicitud.`;

    onSendMessage(mensaje);
    addToast('Documentos enviados al chat', 'success');
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
            <div className="flex-1 overflow-y-auto p-6">
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
                min="1"
                max="40"
                step="1"
                value={years === 0 ? '' : years}
                onChange={(e) => setYears(e.target.value === '' ? 0 : Number(e.target.value))}
                className="text-sm h-10"
                placeholder="15"
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
                min="0"
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
                min="0"
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

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};

export default CollapsibleSimulator;
