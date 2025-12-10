
import React from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, ArrowRightLeft, Landmark, BarChart3, Building, Smartphone, Settings } from 'lucide-react';
import Toast from './Toast';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { currentUser, logout, companies, toast, hideToast } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentCompany = currentUser?.company_id 
    ? companies.find(c => c.id === currentUser.company_id) 
    : null;

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <button 
        onClick={() => navigate(to)}
        className={`flex flex-col items-center justify-center w-full py-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[10px] mt-1 font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={hideToast} 
        />
      )}

      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
             {currentCompany?.logo ? (
                <img src={currentCompany.logo} alt="Logo" className="w-10 h-10 rounded-full bg-white object-cover" />
             ) : (
                <div className="bg-white/20 p-2 rounded-full">
                    <Building size={20} className="text-white" />
                </div>
             )}
             <div className="flex flex-col">
                <h1 className="text-lg font-bold">{title}</h1>
                <span className="text-xs text-blue-100">{currentUser?.full_name}</span>
             </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-blue-700 rounded-full text-blue-100 hover:text-white transition">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 pb-24 overflow-y-auto no-scrollbar">
        {children}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full z-10 pb-safe shadow-top-lg">
        <div className="flex justify-around items-center h-16">
          {currentUser?.role === 'super_admin' && (
             <NavItem to="/super-admin" icon={Home} label="الرئيسية" />
          )}

          {currentUser?.role === 'admin' && (
            <>
              <NavItem to="/admin" icon={Home} label="الرئيسية" />
              <NavItem to="/admin/treasury" icon={Landmark} label="الخزينة" />
              <NavItem to="/reports" icon={BarChart3} label="التقارير" />
            </>
          )}

          {currentUser?.role === 'employee' && (
            <>
              <NavItem to="/employee" icon={Home} label="الرئيسية" />
              <NavItem to="/exchange" icon={ArrowRightLeft} label="الصرف" />
              <NavItem to="/wallet-transfer" icon={Smartphone} label="تحويل" />
              <NavItem to="/reports" icon={BarChart3} label="التقارير" />
            </>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
