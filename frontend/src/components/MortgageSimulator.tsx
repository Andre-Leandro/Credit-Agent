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
  const [eligibility, setEligibility] = useState<string | null>(null);
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  const handleSimulation = () => {
    // Validación básica
    if (loanAmount <= 0) {
      addToast('El monto del crédito debe ser mayor a 0', 'error');
      setEligibility(null);
      return;
    }
    
    if (propertyValue < loanAmount) {
      addToast('El monto del crédito no puede ser mayor al valor de la vivienda', 'error');
      setEligibility(null);
      return;
    }
    
    if (years <= 0) {
      addToast('El plazo debe ser mayor a 0', 'error');
      setEligibility(null);
      return;
    }

    // Simulación de elegibilidad
    const loanToValue = (loanAmount / propertyValue) * 100;
    const qualifiesForSalaryAccount = salaryAccount === 'Sí';
    const canPayLoan = propertyValue > loanAmount;

    // Lógica de aprobación mejorada
    if (loanToValue > 80) {
      setEligibility('Rechazado');
      setMonthlyPayment(null);
    } else if (!qualifiesForSalaryAccount && loanToValue > 70) {
      setEligibility('Rechazado');
      setMonthlyPayment(null);
    } else if (canPayLoan) {
      setEligibility('Aprobado');
      addToast('¡Solicitud aprobada! Revisa los detalles a continuación.', 'success');
      
      // Cálculo de cuota mensual (aproximado - interés anual 4%)
      const annualRate = 0.04;
      const monthlyRate = annualRate / 12;
      const numberOfPayments = years * 12;
      const payment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
      setMonthlyPayment(payment);
    } else {
      setEligibility('Rechazado');
      setMonthlyPayment(null);
    }
  };

  const handleReset = () => {
    setDestination('Construcción de segunda vivienda');
    setYears(15);
    setPropertyValue(0);
    setLoanAmount(0);
    setSalaryAccount('No');
    setCvsCap('No');
    setEligibility(null);
    setMonthlyPayment(null);
  };

  return (
    <div className="w-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Main Content - Full Width */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left - Form (Wider) */}
          <div className="xl:col-span-2">
            <Card className="shadow-xl border-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="text-2xl">Datos del Préstamo</CardTitle>
                <CardDescription className="text-blue-100 text-base">
                  Completa los datos para simular tu crédito hipotecario
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-8">
                <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                  {/* Destino */}
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

                  {/* Grid para campos numéricos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {/* Plazo en años */}
                    <div className="space-y-3">
                      <Label htmlFor="years" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        Plazo (años)
                      </Label>
                      <Input
                        id="years"
                        type="number"
                        min="1"
                        max="40"
                        value={years}
                        onChange={(e) => setYears(Number(e.target.value))}
                        className="text-lg h-11"
                      />
                      <p className="text-sm text-gray-500">Entre 1 y 40 años</p>
                    </div>

                    {/* Valor de propiedad */}
                    <div className="space-y-3">
                      <Label htmlFor="propertyValue" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Home className="w-5 h-5 text-blue-600" />
                        Valor de la Vivienda
                      </Label>
                      <Input
                        id="propertyValue"
                        type="number"
                        min="0"
                        step="1000"
                        value={propertyValue === 0 ? '' : propertyValue}
                        onChange={(e) => setPropertyValue(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="text-lg h-11"
                        placeholder="ARS $0"
                      />
                    </div>
                  </div>

                  {/* Monto del crédito */}
                  <div className="space-y-3 p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <Label htmlFor="loanAmount" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      Monto del Crédito
                    </Label>
                    <Input
                      id="loanAmount"
                      type="number"
                      min="0"
                      step="1000"
                      value={loanAmount === 0 ? '' : loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="text-lg h-11"
                      placeholder="ARS $0"
                    />
                    {propertyValue > 0 && loanAmount > 0 && (
                      <div className="pt-3 border-t border-blue-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">LTV (Loan to Value):</span>
                          <span className="text-lg font-bold text-blue-600">
                            {((loanAmount / propertyValue) * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-full bg-white rounded-full h-2 border border-blue-200 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              (loanAmount / propertyValue) > 0.8 ? 'bg-red-500' :
                              (loanAmount / propertyValue) > 0.7 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((loanAmount / propertyValue) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grid para opciones */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Haberes en BNA */}
                    <div className="space-y-3">
                      <Label htmlFor="salaryAccount" className="text-base font-semibold text-gray-900">
                        Haberes en BNA
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
                      <p className="text-sm text-gray-500">Mejora tu elegibilidad</p>
                    </div>

                    {/* Opción CVS */}
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
                      <p className="text-sm text-gray-500">Protección de cuota</p>
                    </div>
                  </div>

                  {/* Buttons */}
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
                      className="flex-1 h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      variant="default"
                    >
                      Simular Crédito
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right - Results */}
          <div>
            {eligibility ? (
              <>
                {eligibility.startsWith('Aprobado') ? (
                  <>
                    <Alert variant="success" className="mb-6">
                      <CheckCircle2 className="h-6 w-6" />
                      <AlertTitle className="text-lg font-bold">¡Solicitud Aprobada!</AlertTitle>
                      <AlertDescription className="text-base mt-2">
                        Felicitaciones, cumples con los requisitos. Procede a completar tu solicitud con nuestro asesor.
                      </AlertDescription>
                    </Alert>

                    {monthlyPayment && (
                      <Card className="border-2 border-green-300 bg-green-50/50 shadow-xl">
                        <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                          <CardTitle className="text-2xl">Detalles de tu Préstamo</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-sm">
                              <p className="text-sm text-gray-600 mb-2">Monto del Crédito</p>
                              <p className="text-2xl font-bold text-green-700">
                                ${loanAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 0 })}
                              </p>
                            </div>
                            <div className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-sm">
                              <p className="text-sm text-gray-600 mb-2">Cuota Mensual</p>
                              <p className="text-2xl font-bold text-green-700">
                                ${monthlyPayment.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 0 })}
                              </p>
                            </div>
                            <div className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-sm">
                              <p className="text-sm text-gray-600 mb-2">Plazo</p>
                              <p className="text-2xl font-bold text-green-700">{years} años</p>
                              <p className="text-xs text-gray-500 mt-1">({years * 12} cuotas)</p>
                            </div>
                            <div className="bg-white p-6 rounded-lg border-2 border-green-200 shadow-sm">
                              <p className="text-sm text-gray-600 mb-2">LTV</p>
                              <p className="text-2xl font-bold text-green-700">
                                {((loanAmount / propertyValue) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
                            <p className="text-sm text-blue-900 mb-3">
                              <strong>⚠️ Nota Importante:</strong>
                            </p>
                            <p className="text-sm text-blue-800">
                              Esta es una simulación aproximada con una tasa de interés del 4% anual. Los montos, tasas de interés y términos finales pueden variar según políticas actuales del banco, historial crediticio y otros factores de elegibilidad.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-6 w-6" />
                    <AlertTitle className="text-lg font-bold">Solicitud Rechazada</AlertTitle>
                    <AlertDescription className="text-base mt-2">
                      Actualmente no cumples con los requisitos mínimos. Puedes intentar ajustando los parámetros o contactar a nuestro equipo de asesoría.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <Card className="shadow-xl border-0 h-fit bg-blue-50">
                <CardHeader className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle>Información</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <p className="text-gray-700 mb-4">
                    Completa el formulario a la izquierda y haz clic en "Simular Crédito" para ver los detalles de tu préstamo.
                  </p>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p><strong>📋 Requisitos mínimos:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>LTV máximo: 80%</li>
                      <li>Sin haberes BNA: LTV máximo 70%</li>
                      <li>Plazo: 1 a 40 años</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default MortgageSimulator;