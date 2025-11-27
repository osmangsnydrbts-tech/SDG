
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Wallet, ArrowUpRight, ArrowDownLeft, Smartphone } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

const EmployeeDashboard: React.FC = () => {
  const { currentUser, treasuries, transactions, companies, users, eWallets } = useStore();
  const navigate = useNavigate();
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  const myTreasury = treasuries.find(t => t.employee_id === currentUser?.id);
  const myTransactions = transactions
    .filter(t => t.employee_id === currentUser?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const myWalletsBalance = eWallets
    .filter(w => w.employee_id === currentUser?.id && w.is_active)
    .reduce((sum, w) => sum + w.balance, 0);

  const getCompany = (companyId: number) => companies.find(c => c.id === companyId);
  const getEmployee = (empId?: number) => users.find(u => u.id === empId);

  const getTransactionIcon = (type: string) => {
      if (type === 'exchange' || type === 'e_wallet' || type === 'treasury_withdraw') {
          // Money Leaving (Red Arrow Up)
          return { icon: <ArrowUpRight size={16} />, bg: 'bg-red-100', text: 'text-red-600' };
      } else {
          // Money Coming In (Green Arrow Down)
          return { icon: <ArrowDownLeft size={16} />, bg: 'bg-green-100', text: 'text-green-600' };
      }
  };

  return (
    <div className="space-y-6">
      {/* Treasury Cards */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm text-gray-500 mb-3 flex items-center gap-2">
            <Wallet size={16} /> رصيد الخزينة
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
        
        {/* Wallet Balance Section */}
        <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="p-3 bg-pink-50 rounded-xl flex justify-between items-center">
                <div>
                    <p className="text-xs text-pink-400 mb-1 flex items-center gap-1"><Smartphone size={12}/> رصيد المحافظ</p>
                    <p className="text-xl font-bold text-pink-700">{myWalletsBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP</p>
                </div>
                <button 
                    onClick={() => navigate('/wallet-transfer')}
                    className="text-xs bg-white text-pink-600 px-3 py-1 rounded-lg shadow-sm font-bold"
                >
                    تحويل
                </button>
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
              {myTransactions.map(t => {
                  const style = getTransactionIcon(t.type);
                  return (
                    <div 
                        key={t.id} 
                        onClick={() => setViewTransaction(t)}
                        className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 transition active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${style.bg} ${style.text}`}>
                                {style.icon}
                            </div>
                            <div>
                                <p className="text-sm font-bold">
                                    {t.type === 'exchange' ? 'صرف عملة' : 
                                     t.type === 'e_wallet' ? 'تحويل محفظة' : 
                                     t.type === 'treasury_feed' ? 'تغذية خزينة' : 'سحب رصيد'}
                                </p>
                                <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{t.from_amount.toLocaleString()} <span className="text-xs">{t.from_currency}</span></p>
                            {t.to_amount && <p className="text-xs text-gray-500">➜ {t.to_amount.toLocaleString()} {t.to_currency}</p>}
                        </div>
                    </div>
                  );
              })}
              {myTransactions.length === 0 && <p className="text-center text-gray-400 text-sm">لا توجد عمليات اليوم</p>}
          </div>
      </div>

      {viewTransaction && (
        <ReceiptModal 
            transaction={viewTransaction} 
            company={getCompany(viewTransaction.company_id)} 
            employee={getEmployee(viewTransaction.employee_id)} 
            onClose={() => setViewTransaction(null)} 
        />
      )}
    </div>
  );
};

export default EmployeeDashboard;
