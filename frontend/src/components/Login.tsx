import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { useAuth } from '../contexts/AuthContext';
import { Home, Loader } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validación básica
    if (!email || !dni) {
      setError('Por favor completa todos los campos');
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    // Validación de DNI (8-9 dígitos)
    const dniRegex = /^[0-9]{8,9}$/;
    if (!dniRegex.test(dni.replace(/[.-]/g, ''))) {
      setError('Por favor ingresa un DNI válido (8-9 dígitos)');
      return;
    }

    setIsLoading(true);
    try {
      // Usar el mismo endpoint Lambda que CreditProgressBar
      const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;
      if (!lambdaUrl) {
        throw new Error('Lambda URL no configurada');
      }

      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_status',
          dni: dni,
          email: email
        })
      });

      const data = await response.json();

      if (data.status === 'success' && data.data) {
        const estado = data.data.estado || 'PRE_APROBACION';
        login(email, dni, estado);
      } else {
        setError('Error al autenticarse. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#10069f] to-[#1a0db5] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <div className="p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-[#10069f] rounded-lg">
              <Home className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-[#10069f]">CreditBank</h1>
          </div>

          <h2 className="text-center text-2xl font-semibold text-gray-800 mb-2">Bienvenido</h2>
          <p className="text-center text-gray-600 mb-6">Ingresa tus datos para continuar</p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1">
                DNI
              </label>
              <Input
                id="dni"
                type="text"
                placeholder="12345678"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/[^0-9.-]/g, ''))}
                className="w-full"
                maxLength={10}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#10069f] hover:bg-[#0d045c] text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Verificando...
                </span>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};
