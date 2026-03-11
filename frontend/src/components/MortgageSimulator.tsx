import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Home, DollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useToast, ToastContainer } from './Toast';

const MortgageSimulator: React.FC = () => {
  const [destination, setDestination] = useState('Construcción de segunda vivienda');
  const [years, setYears] = useState(15);
  const [propertyValue, setPropertyValue] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [salaryAccount, setSalaryAccount] = useState('No');
  const [cvsCap, setCvsCap] = useState('No');
  const [approved, setApproved] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const { toasts, addToast, removeToast } = useToast();

  const handleSimulation = () => {
    console.log('=== INICIO SIMULACION ===');
    console.log('propertyValue:', propertyValue);
    console.log('loanAmount:', loanAmount);
    console.log('years:', years);
    
    if (propertyValue === 0 || loanAmount === 0 || years === 0) {
      console.log('VALIDACION FALLO: Campos vacíos');
      addToast('Por favor completa todos los campos', 'error');
      setApproved(false);
      setRejected(false);
      return;
    }

    const ltv = (loanAmount / propertyValue) * 100;
    console.log('LTV:', ltv);

    if (ltv > 80) {
      console.log('RECHAZADO: LTV mayor a 80%');
      setApproved(false);
      setRejected(true);
      addToast('LTV mayor a 80%. Crédito rechazado.', 'error');
      return;
    }

    // Si llego aca, está aprobado
    console.log('APROBADO: Calculando cuota...');
    const annualRate = 0.04;
    const monthlyRate = annualRate / 12;
    const payments = years * 12;
    const payment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, payments)) / 
                    (Math.pow(1 + monthlyRate, payments) - 1);
    
    console.log('Cuota calculada:', payment);
    setMonthlyPayment(payment);
    setApproved(true);
    setRejected(false);
    addToast('¡Solicitud aprobada!', 'success');
  };

  const handleReset = () => {
    setDestination('Construcción de segunda vivienda');
    setYears(15);
    setPropertyValue(0);
    setLoanAmount(0);
    setSalaryAccount('No');
    setCvsCap('No');
    setApproved(false);
    setRejected(false);
    setMonthlyPayment(0);
  };

  console.log('=== RENDER ===');
  console.log('approved:', approved);
  console.log('rejected:', rejected);
  console.log('monthlyPayment:', monthlyPayment);

  return (
    <div className="w-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* FORMULARIO */}
          <div className="xl:col-span-2">
            <Card className="shadow-xl border-0">
              <CardHeader className="bg-[#10069f] text-white rounded-t-lg">
                <CardTitle className="text-2xl">Datos del Préstamo</CardTitle>
                <CardDescription className="text-white/70 text-base">
                  Completa los datos para simular tu crédito hipotecario
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                  <div className="space-y-3">
                    <Label htmlFor="destination" className="text-base font-semibold text-gray-900">
                      Destino del Crédito
                    </Label>
                    <Select 
                      id="destination"
                      value={destination} 
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full h-11 text-base"
                    >
                      <option value="Construcción de segunda vivienda">Construcción de segunda vivienda</option>
                      <option value="Compra de vivienda">Compra de vivienda</option>
                      <option value="Refraccionamiento">Refraccionamiento</option>
                      <option value="Mejoras del hogar">Mejoras del hogar</option>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="years" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#10069f]" />
                        Plazo (años)
                      </Label>
                      <Input 
                        id="years"
                        type="number"
                        min="1"
                        max="40"
                        step="1"
                        value={years === 0 ? '' : years}
                        onChange={(e) => setYears(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-base h-11"
                        placeholder="15"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="propertyValue" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Home className="w-5 h-5 text-[#10069f]" />
                        Valor de la Propiedad
                      </Label>
                      <Input 
                        id="propertyValue"
                        type="number"
                        min="0"
                        step="1000"
                        value={propertyValue === 0 ? '' : propertyValue}
                        onChange={(e) => setPropertyValue(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-base h-11"
                        placeholder="100000"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="loanAmount" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[#10069f]" />
                        Monto del Crédito
                      </Label>
                      <Input 
                        id="loanAmount"
                        type="number"
                        min="0"
                        step="1000"
                        value={loanAmount === 0 ? '' : loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-base h-11"
                        placeholder="70000"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="salaryAccount" className="text-base font-semibold text-gray-900">
                        ¿Posees Haberes en BNA?
                      </Label>
                      <Select 
                        id="salaryAccount"
                        value={salaryAccount} 
                        onChange={(e) => setSalaryAccount(e.target.value)}
                        className="w-full h-11"
                      >
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="cvsCap" className="text-base font-semibold text-gray-900">
                        Opción Tope CVS
                      </Label>
                      <Select 
                        id="cvsCap"
                        value={cvsCap} 
                        onChange={(e) => setCvsCap(e.target.value)}
                        className="w-full h-11"
                      >
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                    <Button 
                      onClick={handleReset}
                      className="flex-1 h-12 text-lg font-semibold"
                      variant="outline"
                    >
                      Limpiar
                    </Button>
                    <Button 
                      onClick={handleSimulation}
                      className="flex-1 h-12 text-lg font-semibold bg-[#10069f] hover:bg-[#0a0470]"
                      variant="default"
                    >
                      Simular Crédito
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* RESULTADOS */}
          <div>
            {approved && (
              <>
                <Alert variant="success" className="mb-6">
                  <CheckCircle2 className="h-6 w-6" />
                  <AlertTitle className="text-lg font-bold">¡Solicitud Aprobada!</AlertTitle>
                  <AlertDescription className="text-base mt-2">
                    Felicitaciones, cumples con los requisitos.
                  </AlertDescription>
                </Alert>

                <Card className="border-2 border-green-300 bg-green-50/50 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                    <CardTitle className="text-2xl">Detalles</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                        <p className="text-sm text-gray-600">Monto del Crédito</p>
                        <p className="text-2xl font-bold text-green-700">
                          ${loanAmount.toLocaleString('es-AR')}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                        <p className="text-sm text-gray-600">Cuota Mensual</p>
                        <p className="text-2xl font-bold text-green-700">
                          ${monthlyPayment.toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                        <p className="text-sm text-gray-600">Plazo</p>
                        <p className="text-2xl font-bold text-green-700">{years} años</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                        <p className="text-sm text-gray-600">LTV</p>
                        <p className="text-2xl font-bold text-green-700">
                          {((loanAmount / propertyValue) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {rejected && (
              <Alert variant="destructive">
                <XCircle className="h-6 w-6" />
                <AlertTitle className="text-lg font-bold">Solicitud Rechazada</AlertTitle>
                <AlertDescription className="text-base mt-2">
                  No cumples con los requisitos mínimos.
                </AlertDescription>
              </Alert>
            )}

            {!approved && !rejected && (
              <Card className="shadow-xl border-0 h-fit bg-[#10069f]/5">
                <CardHeader className="bg-[#10069f] text-white rounded-t-lg">
                  <CardTitle>Información</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <p className="text-gray-700 mb-4">
                    Completa el formulario y haz clic en "Simular Crédito".
                  </p>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p><strong>📋 Requisitos:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>LTV máximo: 80%</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default MortgageSimulator;