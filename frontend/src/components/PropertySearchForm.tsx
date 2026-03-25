import React, { useState } from 'react';
import { MapPin, Home, DoorOpen } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select } from './ui/select';
import { useToast } from './Toast';

interface PropertySearchFormProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export const PropertySearchForm: React.FC<PropertySearchFormProps> = ({ 
  onSendMessage, 
  isLoading = false 
}) => {
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState('Departamento');
  const [environments, setEnvironments] = useState('1');
  const { addToast } = useToast();

  const propertyTypes = [
    'Departamento',
    'Casa',
    'Lote',
    'Local Comercial',
    'Oficina',
    'Penthouse',
    'Duplex',
    'Terraza',
  ];

  const handleSend = () => {
    if (!address.trim()) {
      addToast('Por favor completa la dirección', 'error');
      return;
    }

    if (!environments || parseInt(environments) <= 0) {
      addToast('Por favor especifica la cantidad de ambientes', 'error');
      return;
    }

    const mensaje = `Necesito búsqueda de propiedad con los siguientes criterios:

Información de la Propiedad
- Dirección: ${address}
- Tipo de Propiedad: ${propertyType}
- Ambientes: ${environments}

Por favor, ayúdame a buscar propiedades que cumplan con estos requisitos.`;

    onSendMessage(mensaje);
    handleReset();
    addToast('Criterios de búsqueda enviados al chat', 'success');
  };

  const handleReset = () => {
    setAddress('');
    setPropertyType('Departamento');
    setEnvironments('1');
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 mt-6">Búsqueda de Propiedad</h2>

        <div className="space-y-5">
          {/* Dirección */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#10069f]" />
              Dirección 
            </Label>
            <Input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="text-sm h-10"
              placeholder="Ej: Calle principales 1234, Zona/Barrio"
              disabled={isLoading}
            />
          </div>

          {/* Tipo de Propiedad */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Home className="w-4 h-4 text-[#10069f]" />
              Tipo de Propiedad
            </Label>
            <Select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="w-full h-10 text-sm"
              disabled={isLoading}
            >
              {propertyTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </div>

          {/* Ambientes */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-[#10069f]" />
              Cantidad de Ambientes
            </Label>
            <Input
              type="number"
              step="1"
              min="1"
              value={environments === '0' ? '' : environments}
              onChange={(e) => setEnvironments(e.target.value === '' ? '0' : e.target.value)}
              className="text-sm h-10"
              placeholder="1"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
        <Button
          onClick={handleSend}
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
    </div>
  );
};
