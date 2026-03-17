import { Home, Menu, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminPanel from './AdminPanel';

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const { user, logout } = useAuth();

  // Obtener estado actual del usuario
  useEffect(() => {
    if (user?.estado) {
      setCurrentStatus(user.estado);
    }
  }, [user?.estado]);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b-4 border-[#10069f] bg-[#10069f] shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18 py-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-white rounded-lg shadow-md">
              <Home className="w-7 h-7 text-[#10069f]" strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-white">CreditBank</h1>
              <p className="text-sm text-white/70">Créditos Hipotecarios</p>
            </div>
          </div>

          {/* Right side actions */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <>
                {/* Admin Panel - Solo para estados específicos */}
                <AdminPanel 
                  key={refreshKey}
                  currentStatus={currentStatus} 
                  onStatusUpdated={() => setRefreshKey(k => k + 1)}
                />

                <div className="flex flex-col items-end">
                  <p className="text-sm text-white font-medium">{user.email}</p>
                  <p className="text-xs text-white/70">DNI: {user.dni}</p>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="text-white hover:bg-red-600/30 border border-white/30 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Salir
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 hover:bg-[#10069f]/20 rounded-lg transition"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && user && (
          <div className="md:hidden pb-4 border-t border-[#10069f]/50 space-y-2">
            <div className="px-4 py-2 border-b border-[#10069f]/50">
              <p className="text-sm text-white font-medium">{user.email}</p>
              <p className="text-xs text-white/70">DNI: {user.dni}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-white hover:bg-red-600/30 rounded flex items-center gap-2 my-1"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
