import React from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const { currentUser, treasuries, transactions } = useStore();
  const navigate = useNavigate();

  const myTreasury = treasuries.find(t => t.employee_id === currentUser?.id);
  const myTransactions = transactions
    .filter(t => t.employee_id === currentUser?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Treasury Cards */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm text-gray-500 mb-3 flex items-center gap-2">
            <Wallet size={16} /> رصيد الخزينة (عهدة)
        </h3>
        <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-400 mb-1">مصري (EGP)</p>
                <p className="text-xl font-bold text-blue-700">{myTreasury?.egp_balance.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-400 mb-1">سوداني (SDG)</p>
                <p className="text-xl font-bold text-emerald-700">{myTreasury?.sdg_balance.toLocaleString()}</p>
            </div>
        </div>
      </div>

      <button 
        onClick={() => navigate('/exchange')}
        className="w-full bg-blue-600 text-white p-5 rounded-2xl shadow-lg flex items-center justify-between transition transform active:scale-95"
      >
        <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg"><ArrowRightLeft size={24}/></div>
            <div className="text-right">
                <h3 className="font-bold text-lg">عملية صرف جديدة</h3>
                <p className="text-blue-100 text-xs">سوداني / مصري</p>
            </div>
        </div>
        <ArrowUpRight size={24} className="bg-white text-blue-600 rounded-full p-1" />
      </button>

      <div>
          <h3 className="font-bold text-gray-800 mb-3">آخر العمليات</h3>
          <div className="space-y-3">
              {myTransactions.map(t => (
                  <div key={t.id} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${t.from_currency === 'SDG' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                              {t.from_currency === 'SDG' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div>
                              <p className="text-sm font-bold">{t.type === 'exchange' ? 'صرف عملة' : 'تحويل'}</p>
                              <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                      </div>
                      <div className="text-right">
                          <p className="text-sm font-bold">{t.from_amount.toLocaleString()} <span className="text-xs">{t.from_currency}</span></p>
                          {t.to_amount && <p className="text-xs text-gray-500">➜ {t.to_amount.toLocaleString()} {t.to_currency}</p>}
                      </div>
                  </div>
              ))}
              {myTransactions.length === 0 && <p className="text-center text-gray-400 text-sm">لا توجد عمليات اليوم</p>}
          </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;