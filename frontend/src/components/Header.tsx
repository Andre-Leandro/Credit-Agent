import { Home, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b-4 border-blue-600 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18 py-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-md">
              <Home className="w-7 h-7 text-blue-600" strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-white">CreditBank</h1>
              <p className="text-sm text-blue-100">Simulador de Créditos Hipotecarios</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-white hover:text-blue-100 font-medium transition">
              Simulador
            </button>
            <button onClick={() => {}} className="text-white hover:text-blue-100 font-medium transition">
              Acerca de
            </button>
            <button onClick={() => {}} className="text-white hover:text-blue-100 font-medium transition">
              Contacto
            </button>
          </nav>

          {/* Right side actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-white hover:bg-blue-500/20 border border-blue-300"
            >
              Iniciar Sesión
            </Button>
            <Button
              variant="default"
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
            >
              Solicitar Crédito
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 hover:bg-blue-500/20 rounded-lg transition"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-blue-500">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="block w-full text-left px-4 py-2 text-white hover:bg-blue-500/20 rounded my-1">
              Simulador
            </button>
            <button onClick={() => {}} className="block w-full text-left px-4 py-2 text-white hover:bg-blue-500/20 rounded my-1">
              Acerca de
            </button>
            <button onClick={() => {}} className="block w-full text-left px-4 py-2 text-white hover:bg-blue-500/20 rounded my-1">
              Contacto
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
