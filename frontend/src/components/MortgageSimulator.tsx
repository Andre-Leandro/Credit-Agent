import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Home, DollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react';

const MortgageSimulator: React.FC = () => {
  const [destination, setDestination] = useState('Construcción de segunda vivienda');
  const [years, setYears] = useState(15);
  const [propertyValue, setPropertyValue] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [salaryAccount, setSalaryAccount] = useState('No');
  const [cvsCap, setCvsCap] = useState('No');
  const [eligibility, setEligibility] = useState<string | null>(null);
  const [monthlyPayment, setMonthlyPayment] = useState<number | null>(null);

  const handleSimulation = () => {
    // Validación básica
    if (loanAmount <= 0) {
      setEligibility('Error: El monto del crédito debe ser mayor a 0');
      return;
    }
    
    if (propertyValue < loanAmount) {
      setEligibility('Error: El monto del crédito no puede ser mayor al valor de la vivienda');
      return;
    }
    
    if (years <= 0) {
      setEligibility('Error: El plazo debe ser mayor a 0');
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Home className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Simulador de Crédito</h1>
          </div>
          <p className="text-lg text-gray-600">Calcula tu crédito hipotecario de forma rápida y sencilla</p>
        </div>

        {/* Main Form Card */}
        <Card className="shadow-xl mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle>Datos del Préstamo</CardTitle>
            <CardDescription className="text-blue-100">
              Completa los datos para simular tu crédito hipotecario
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
              {/* Destino */}
              <div className="space-y-2">
                <Label htmlFor="destination" className="text-base font-semibold">
                  Destino del Crédito
                </Label>
                <Select 
                  id="destination"
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full"
                >
                  <option value="Construcción de segunda vivienda">Construcción de segunda vivienda</option>
                  <option value="Compra de vivienda">Compra de vivienda</option>
                  <option value="Refraccionamiento">Refraccionamiento</option>
                  <option value="Mejoras del hogar">Mejoras del hogar</option>
                </Select>
              </div>

              {/* Grid para campos numéricos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Plazo en años */}
                <div className="space-y-2">
                  <Label htmlFor="years" className="text-base font-semibold">
                    <Clock className="w-4 h-4 inline mr-2" />
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
                <div className="space-y-2">
                  <Label htmlFor="propertyValue" className="text-base font-semibold">
                    <Home className="w-4 h-4 inline mr-2" />
                    Valor de la Vivienda ($)
                  </Label>
                  <Input
                    id="propertyValue"
                    type="number"
                    min="0"
                    step="1000"
                    value={propertyValue}
                    onChange={(e) => setPropertyValue(Number(e.target.value))}
                    className="text-lg h-11"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Monto del crédito */}
              <div className="space-y-2">
                <Label htmlFor="loanAmount" className="text-base font-semibold">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Monto del Crédito ($)
                </Label>
                <Input
                  id="loanAmount"
                  type="number"
                  min="0"
                  step="1000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="text-lg h-11"
                  placeholder="0"
                />
                {propertyValue > 0 && loanAmount > 0 && (
                  <p className="text-sm text-gray-500">
                    LTV: {((loanAmount / propertyValue) * 100).toFixed(2)}%
                  </p>
                )}
              </div>

              {/* Grid para opciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Haberes en BNA */}
                <div className="space-y-2">
                  <Label htmlFor="salaryAccount" className="text-base font-semibold">
                    Haberes en BNA
                  </Label>
                  <Select 
                    id="salaryAccount"
                    value={salaryAccount} 
                    onChange={(e) => setSalaryAccount(e.target.value)}
                  >
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </Select>
                </div>

                {/* Opción CVS */}
                <div className="space-y-2">
                  <Label htmlFor="cvsCap" className="text-base font-semibold">
                    Opción Tope CVS
                  </Label>
                  <Select 
                    id="cvsCap"
                    value={cvsCap} 
                    onChange={(e) => setCvsCap(e.target.value)}
                  >
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                  </Select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <Button 
                  onClick={handleSimulation}
                  className="flex-1 h-12 text-lg font-semibold"
                  variant="default"
                >
                  Simular
                </Button>
                <Button 
                  onClick={handleReset}
                  className="flex-1 h-12 text-lg font-semibold"
                  variant="outline"
                >
                  Limpiar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {eligibility && (
          <div className="space-y-4">
            {eligibility.startsWith('Aprobado') ? (
              <>
                <Alert variant="success">
                  <CheckCircle2 className="h-6 w-6" />
                  <AlertTitle className="text-lg font-bold">¡Solicitud Aprobada!</AlertTitle>
                  <AlertDescription className="text-base mt-2">
                    ¡Felicitaciones! Tu solicitud de crédito ha sido aprobada.
                  </AlertDescription>
                </Alert>

                {monthlyPayment && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-900">Detalles del Préstamo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-green-200">
                          <p className="text-sm text-gray-600 mb-1">Monto del Crédito</p>
                          <p className="text-2xl font-bold text-green-700">
                            ${loanAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-green-200">
                          <p className="text-sm text-gray-600 mb-1">Cuota Mensual (Aprox.)</p>
                          <p className="text-2xl font-bold text-green-700">
                            ${monthlyPayment.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-green-200">
                          <p className="text-sm text-gray-600 mb-1">Plazo</p>
                          <p className="text-2xl font-bold text-green-700">{years} años</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-green-200">
                          <p className="text-sm text-gray-600 mb-1">LTV</p>
                          <p className="text-2xl font-bold text-green-700">
                            {((loanAmount / propertyValue) * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                        <p className="text-sm text-blue-900">
                          <strong>Nota:</strong> Esta es una simulación aproximada. La tasa de interés y términos finales pueden variar según políticas actuales del banco.
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
                  {eligibility.startsWith('Error') ? eligibility : 'No cumples con los requisitos para este crédito en este momento. Intenta ajustando los parámetros.'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MortgageSimulator;