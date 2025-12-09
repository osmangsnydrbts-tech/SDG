import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Wallet, ArrowUpRight, ArrowDownLeft, Smartphone, FileMinus, Loader2, CheckCircle } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';
import FormattedInput from '../components/FormattedInput';

const EmployeeDashboard: React.FC = () => {
  const { currentUser, treasuries, fetchRecentTransactions, companies, users, eWallets, addExpense } = useStore();
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const navigate = useNavigate();
  
  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCurrency, setExpenseCurrency] = useState<'EGP' | 'SDG'>('EGP');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const myTreasury = treasuries.find(t => t.employee_id === currentUser?.id);
  
  const myWalletsBalance = eWallets
    .filter(w => w.employee_id === currentUser?.id && w.is_active)
    .reduce((sum, w) => sum + w.balance, 0);

  useEffect(() => {
    if (currentUser?.id) {
      fetchRecentTransactions(currentUser.id).then(setRecentTransactions);
    }
  }, [currentUser, treasuries]); // Re-fetch when treasuries update (signal of new tx)

  const getCompany = (companyId: number) => companies.find(c => c.id === companyId);
  const getEmployee = (empId?: number) => users.find(u => u.id === empId);

  const handleAddExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser?.id || isLoading) return;
      setIsLoading(true);
      setMsg('');
      
      try {
          const res = await addExpense(
              currentUser.id,
              expenseCurrency,
              parseFloat(expenseAmount),
              expenseDesc
          );
          
          if (res.success) {
              setMsg(res.message);
              setExpenseAmount('');
              setExpenseDesc('');
              // Update list
              fetchRecentTransactions(currentUser.id).then(setRecentTransactions);
              setTimeout(() => { setShowExpenseModal(false); setMsg(''); }, 1000);
          } else {
              setMsg(res.message);
          }
      } catch (err) {
          setMsg('حدث خطأ');
      } finally {
          setIsLoading(false);
      }
  };

  const getTransactionIcon = (type: string) => {
      if (type === 'exchange' || type === 'e_wallet' || type === 'treasury_withdraw' || type === 'wallet_withdrawal') {
          return { icon: <ArrowUpRight size={16} />, bg: 'bg-red-100', text: 'text-red-600' };
      } else if (type === 'expense') {
          return { icon: <FileMinus size={16} />, bg: 'bg-orange-100', text: 'text-orange-600' };
      } else {
          return { icon: <ArrowDownLeft size={16} />, bg: 'bg-green-100', text: 'text-green-600' };
      }
  };

  const getTransactionLabel = (type: string) => {
      switch(type) {
          case 'exchange': return 'صرف عملة';
          case 'e_wallet': return 'تحويل قديم'; // Legacy
          case 'wallet_deposit': return 'إيداع محفظة';
          case 'wallet_withdrawal': return 'سحب محفظة';
          case 'treasury_feed': return 'تغذية خزينة';
          case 'wallet_feed': return 'تغذية محفظة';
          case 'expense': return 'منصرفات';
          default: return 'سحب رصيد';
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
                <p className="text-xl font-bold text-blue-700">{myTreasury?.egp_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-400 mb-1">سوداني (SDG)</p>
                <p className="text-xl font-bold text-emerald-700">{myTreasury?.sdg_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="p-3 bg-pink-50 rounded-xl flex justify-between items-center">
                <div>
                    <p className="text-xs text-pink-400 mb-1 flex items-center gap-1"><Smartphone size={12}/> رصيد المحافظ</p>
                    <p className="text-xl font-bold text-pink-700">{myWalletsBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</p>
                </div>
                <button onClick={() => navigate('/wallet-transfer')} className="text-xs bg-white text-pink-600 px-3 py-1 rounded-lg shadow-sm font-bold">تحويل</button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
          <button onClick={() => navigate('/exchange')} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 transition transform active:scale-95">
            <ArrowRightLeft size={24}/><span className="font-bold">صرف عملة</span>
          </button>
          
          <button onClick={() => setShowExpenseModal(true)} className="bg-orange-500 text-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 transition transform active:scale-95">
            <FileMinus size={24}/><span className="font-bold">تسجيل منصرف</span>
          </button>
      </div>

      <div>
          <h3 className="font-bold text-gray-800 mb-3">آخر العمليات</h3>
          <div className="space-y-3">
              {recentTransactions.map(t => {
                  const style = getTransactionIcon(t.type);
                  return (
                    <div key={t.id} onClick={() => setViewTransaction(t)} className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 transition active:scale-95">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${style.bg} ${style.text}`}>{style.icon}</div>
                            <div>
                                <p className="text-sm font-bold">{getTransactionLabel(t.type)}</p>
                                <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{t.from_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xs">{t.from_currency}</span></p>
                            {t.description && <p className="text-xs text-gray-400 truncate max-w-[100px]">{t.description}</p>}
                        </div>
                    </div>
                  );
              })}
              {recentTransactions.length === 0 && <p className="text-center text-gray-400 text-sm">لا توجد عمليات اليوم</p>}
          </div>
      </div>

      {viewTransaction && (
        <ReceiptModal transaction={viewTransaction} company={getCompany(viewTransaction.company_id)} employee={getEmployee(viewTransaction.employee_id)} onClose={() => setViewTransaction(null)} />
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-in slide-in-from-bottom-4">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><FileMinus className="text-orange-500"/> تسجيل منصرف</h3>
                <p className="text-xs text-gray-500 mb-4">يتم خصم المبلغ من خزينة الموظف</p>

                <form onSubmit={handleAddExpense} className="space-y-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button type="button" onClick={() => setExpenseCurrency('EGP')} className={`flex-1 py-2 rounded-md text-sm font-bold transition ${expenseCurrency === 'EGP' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>مصري EGP</button>
                        <button type="button" onClick={() => setExpenseCurrency('SDG')} className={`flex-1 py-2 rounded-md text-sm font-bold transition ${expenseCurrency === 'SDG' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>سوداني SDG</button>
                    </div>

                    <FormattedInput value={expenseAmount} onChange={setExpenseAmount} className="w-full p-3 border rounded-xl text-lg font-bold" placeholder="المبلغ" autoFocus required />
                    <input type="text" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="بند الصرف (مثال: نثريات، غداء...)" required />

                    {msg && <div className={`p-2 rounded text-center text-sm font-bold ${msg.includes('بنجاح') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>{msg}</div>}

                    <div className="flex gap-2">
                        <button disabled={isLoading} className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 className="animate-spin" size={20}/> : 'تسجيل'}
                        </button>
                        <button type="button" onClick={() => setShowExpenseModal(false)} className="bg-gray-100 text-gray-700 px-6 rounded-xl font-bold">إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
