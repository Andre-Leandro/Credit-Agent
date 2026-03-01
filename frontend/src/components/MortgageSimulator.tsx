import React, { useState } from 'react';
import './MortgageSimulator.css';

const MortgageSimulator: React.FC = () => {
  const [destination, setDestination] = useState('Construcción de segunda vivienda');
  const [years, setYears] = useState(15);
  const [propertyValue, setPropertyValue] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [salaryAccount, setSalaryAccount] = useState('No');
  const [cvsCap, setCvsCap] = useState('No');
  const [eligibility, setEligibility] = useState<string | null>(null);

  const handleSimulation = () => {
    // Placeholder logic for eligibility
    if (loanAmount > 0 && propertyValue > loanAmount && years > 0) {
      setEligibility('Aprobado');
    } else {
      setEligibility('Rechazado');
    }
  };

  return (
    <div className="mortgage-simulator">
      <h1>Simulador de Crédito Hipotecario</h1>
      <form onSubmit={(e) => e.preventDefault()}>
        <label>
          Destino:
          <select value={destination} onChange={(e) => setDestination(e.target.value)}>
            <option value="Construcción de segunda vivienda">Construcción de segunda vivienda</option>
            <option value="Compra de vivienda">Compra de vivienda</option>
          </select>
        </label>

        <label>
          Plazo en años:
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
          />
        </label>

        <label>
          Valor de la vivienda en Pesos:
          <input
            type="number"
            value={propertyValue}
            onChange={(e) => setPropertyValue(Number(e.target.value))}
          />
        </label>

        <label>
          Monto del crédito a solicitar en pesos:
          <input
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(Number(e.target.value))}
          />
        </label>

        <label>
          Titular/es cobra/n haberes en BNA:
          <select value={salaryAccount} onChange={(e) => setSalaryAccount(e.target.value)}>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
        </label>

        <label>
          Adhiere opción tope CVS:
          <select value={cvsCap} onChange={(e) => setCvsCap(e.target.value)}>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
        </label>

        <button type="button" onClick={handleSimulation}>
          Simular
        </button>
      </form>

      {eligibility && (
        <div className={`eligibility-result ${eligibility === 'Aprobado' ? 'approved' : 'rejected'}`}>
          <h2>Resultado: {eligibility}</h2>
        </div>
      )}
    </div>
  );
};

export default MortgageSimulator;