
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { FileText, Filter, Eye, XCircle, Calendar, ListFilter, TrendingDown, ArrowRightLeft, User, ArrowUpRight, ArrowDownLeft, Smartphone, ShoppingCart, Ban } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

type TabType = 'breakdown' | 'exchange' | 'treasury' | 'expenses' | 'wallet' | 'sales' | 'cancelled';

const Reports: React.FC = () => {
  const { transactions, currentUser, users, companies, cancelTransaction, eWallets } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('breakdown');
  
  // Filters
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedEmp, setSelectedEmp] = useState<string>('all');
  
  // Modal
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  const getEmployeeName = (empId?: number) => users.find(u => u.id === empId)?.full_name || '-';
  const getCompany = (companyId: number) => companies.find(c => c.id === companyId);
  const getEmployee = (empId?: number) => users.find(u => u.id === empId);

  const getWalletInfo = (walletId?: number) => {
      const w = eWallets.find(x => x.id === walletId);
      return w ? `${w.provider} (${w.phone_number})` : 'محفظة محذوفة';
  };

  const handleCancel = async (id: number) => {
      // Prompt for cancellation reason (Required by new audit logic)
      const reason = window.prompt('الرجاء إدخال سبب الإلغاء (مطلوب):');
      
      if (reason === null) return; // User pressed cancel
      if (reason.trim() === '') {
          alert('يجب كتابة سبب للإلغاء!');
          return;
      }

      if (window.confirm('هل أنت متأكد من إلغاء العملية؟ سيتم عكس المبالغ المالية وتوثيق الإجراء في السجل.')) {
          await cancelTransaction(id, reason);
      }
  };

  const setFilterToday = () => {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
  };

  const setFilterMonth = () => {
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
  };

  // Helper for integer formatting (No decimals)
  const fmt = (num: number) => Math.round(num).toLocaleString();

  // Filter Logic
  const getFilteredTransactions = () => {
      return transactions.filter(t => {
        // NOTE: For the 'cancelled' tab, we want ONLY cancelled. For other tabs, we usually hide them.
        // Logic handled in tab section below.

        let roleMatch = false;
        if (currentUser?.role === 'super_admin') roleMatch = true;
        else if (currentUser?.role === 'admin') roleMatch = t.company_id === currentUser.company_id;
        else roleMatch = t.employee_id === currentUser?.id;

        if (!roleMatch) return false;

        if (selectedEmp !== 'all') {
            if (t.employee_id !== parseInt(selectedEmp)) return false;
        }

        const txDate = new Date(t.created_at).setHours(0,0,0,0);
        const start = new Date(startDate).setHours(0,0,0,0);
        const end = new Date(endDate).setHours(23,59,59,999);

        if (txDate < start || txDate > end) return false;

        return true;
      });
  };

  const allFiltered = getFilteredTransactions();
  
  // Active Transactions (Not Cancelled)
  const activeTx = allFiltered.filter(t => !t.is_cancelled);
  
  // Cancelled Transactions
  const cancelledTx = allFiltered.filter(t => t.is_cancelled);

  const exchangeTx = activeTx.filter(t => t.type === 'exchange');
  const treasuryTx = activeTx.filter(t => ['treasury_feed', 'treasury_withdraw'].includes(t.type));
  const expenseTx = activeTx.filter(t => t.type === 'expense');
  const salesTx = activeTx.filter(t => t.type === 'sale');
  const walletTx = activeTx.filter(t => ['wallet_feed', 'wallet_transfer'].includes(t.type));

  const stats = {
      receivedSdg: exchangeTx.filter(t => t.from_currency === 'SDG').reduce((sum, t) => sum + t.from_amount, 0),
      receivedEgp: exchangeTx.filter(t => t.from_currency === 'EGP').reduce((sum, t) => sum + t.from_amount, 0),
      totalExpensesEgp: expenseTx.filter(t => t.from_currency === 'EGP').reduce((sum, t) => sum + t.from_amount, 0),
      totalExpensesSdg: expenseTx.filter(t => t.from_currency === 'SDG').reduce((sum, t) => sum + t.from_amount, 0),
      totalSales: salesTx.reduce((sum, t) => sum + t.from_amount, 0),
      totalCurrencies: 0
  };
  
  stats.totalCurrencies = stats.receivedSdg + stats.receivedEgp;

  const CardRow = ({ t }: { t: Transaction }) => {
    const isWallet = ['wallet_feed', 'wallet_transfer'].includes(t.type);
    const isCancelled = t.is_cancelled;
    
    return (
        <div className={`p-4 rounded-xl shadow-sm border flex flex-col gap-3 relative overflow-hidden group transition-all ${isCancelled ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <span className="bg-white/50 px-2 py-0.5 rounded-full border border-gray-200">{new Date(t.created_at).toLocaleDateString('ar-EG')}</span>
                    <span>{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-lg border border-gray-200">
                    <User size={12} />
                    <span>{getEmployeeName(t.employee_id)}</span>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div>
                     {isCancelled ? (
                         <div className="text-red-600 font-bold flex items-center gap-2">
                             <Ban size={20} />
                             <span>عملية ملغاة</span>
                         </div>
                     ) : t.type === 'expense' ? (
                        <div className="text-red-600">
                             <span className="text-xs font-bold block mb-1 flex items-center gap-1"><TrendingDown size={14}/> منصرف</span>
                             <span className="text-xl font-bold">{fmt(t.from_amount)} {t.from_currency}</span>
                        </div>
                     ) : t.type === 'sale' ? (
                        <div className="text-purple-600">
                             <span className="text-xs font-bold block mb-1 flex items-center gap-1"><ShoppingCart size={14}/> بيع: {t.product_name}</span>
                             <span className="text-xl font-bold">{fmt(t.from_amount)} {t.from_currency}</span>
                        </div>
                     ) : t.type === 'exchange' ? (
                         <div className="text-green-600">
                             <span className="text-xs font-bold block mb-1 flex items-center gap-1"><ArrowDownLeft size={14}/> استلام</span>
                             <span className="text-xl font-bold">{fmt(t.from_amount)} {t.from_currency}</span>
                         </div>
                     ) : isWallet ? (
                        <div className="text-pink-600">
                             <span className="text-xs font-bold block mb-1 flex items-center gap-1">
                                {t.type === 'wallet_feed' ? 'تغذية' : t.wallet_type === 'withdraw' ? 'سحب' : t.wallet_type === 'deposit' ? 'إيداع' : 'صرف'}
                             </span>
                             <span className="text-xs block text-gray-500 mb-1">{getWalletInfo(t.wallet_id)}</span>
                             <span className="text-xl font-bold">{fmt(t.from_amount)} {t.from_currency}</span>
                        </div>
                     ) : (
                         <div className={t.type === 'treasury_feed' ? 'text-green-600' : 'text-red-600'}>
                             <span className="text-xs font-bold block mb-1">{t.type === 'treasury_feed' ? 'إيداع خزينة' : 'سحب خزينة'}</span>
                             <span className="text-xl font-bold">{fmt(t.from_amount)} {t.from_currency}</span>
                         </div>
                     )}
                </div>

                <div className="text-right">
                    {t.type === 'exchange' && t.to_amount && (
                        <div className={isCancelled ? 'text-red-400 opacity-75' : 'text-red-500'}>
                            <span className="text-xs font-bold block mb-1 flex items-center justify-end gap-1">تسليم <ArrowUpRight size={14}/></span>
                            <span className="text-xl font-bold">{fmt(t.to_amount)} {t.to_currency}</span>
                        </div>
                    )}
                    {(t.type === 'expense' || t.type.includes('treasury')) && (
                        <div className="text-gray-400 text-xs max-w-[150px] truncate">
                            {t.description || '-'}
                        </div>
                    )}
                    {isWallet && t.commission && t.commission > 0 && (
                         <div className="text-green-600 text-xs font-bold mt-1">
                            + {fmt(t.commission)} عمولة
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center border-t border-gray-200/50 pt-3 mt-1">
                 <div className="text-xs font-mono text-gray-400">
                     #{t.receipt_number || t.id}
                 </div>
                 <div className="flex gap-2">
                     {!isCancelled && (
                         <button onClick={() => setViewTransaction(t)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition" title="عرض الإيصال">
                             <Eye size={16} />
                         </button>
                     )}
                     
                     {/* Show Cancel Button ONLY if Not Cancelled AND User is Admin */}
                     {!isCancelled && currentUser?.role === 'admin' && (
                        <button onClick={() => handleCancel(t.id)} className="p-2 text-orange-500 bg-orange-50 hover:bg-orange-100 rounded-lg transition" title="إلغاء العملية">
                            <XCircle size={16} />
                        </button>
                     )}

                     {isCancelled && (
                         <span className="text-xs text-red-500 font-bold bg-white px-2 py-1 rounded border border-red-200">
                             تم الإلغاء
                         </span>
                     )}
                 </div>
            </div>
            
            <div className={`absolute right-0 top-0 bottom-0 w-1 ${isCancelled ? 'bg-red-600' : t.type === 'expense' ? 'bg-red-500' : t.type === 'sale' ? 'bg-purple-500' : t.type === 'exchange' ? 'bg-blue-500' : isWallet ? 'bg-pink-500' : 'bg-emerald-500'}`}></div>
        </div>
    );
  };

  const companyEmployees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee');

  return (
    <div className="space-y-6 pb-10">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                <Filter size={20} className="text-blue-600" /> فلترة التقارير
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><Calendar size={14}/> الفترة الزمنية</label>
                    <div className="flex gap-2 items-center">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 p-2 border rounded-lg bg-gray-50 text-sm font-bold" />
                        <span className="text-gray-400 font-bold">:</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 p-2 border rounded-lg bg-gray-50 text-sm font-bold" />
                    </div>
                    <div className="flex gap-2 text-xs overflow-x-auto pb-1 no-scrollbar">
                        <button onClick={setFilterToday} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 font-bold whitespace-nowrap">اليوم</button>
                        <button onClick={setFilterMonth} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 font-bold whitespace-nowrap">هذا الشهر</button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><ListFilter size={14}/> الموظف</label>
                    <select 
                        value={selectedEmp} 
                        onChange={(e) => setSelectedEmp(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-gray-50 text-sm h-[42px] font-bold text-gray-700"
                    >
                        <option value="all">كل الموظفين</option>
                        {companyEmployees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-gray-200 overflow-x-auto shadow-sm no-scrollbar">
            <button onClick={() => setActiveTab('breakdown')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'breakdown' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <FileText size={16}/> الملخص
            </button>
            <button onClick={() => setActiveTab('sales')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'sales' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <ShoppingCart size={16}/> المبيعات
            </button>
            <button onClick={() => setActiveTab('wallet')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'wallet' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Smartphone size={16}/> المحافظ
            </button>
            <button onClick={() => setActiveTab('exchange')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'exchange' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <ArrowRightLeft size={16}/> الصرف
            </button>
             <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'expenses' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <TrendingDown size={16}/> المنصرفات
            </button>
            <button onClick={() => setActiveTab('cancelled')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'cancelled' ? 'bg-red-100 text-red-600 shadow-md border border-red-200' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Ban size={16}/> ملغاة
            </button>
        </div>

        {activeTab === 'breakdown' && (
             <div className="space-y-4 animate-in fade-in duration-300">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-r-orange-500">
                         <h4 className="text-xs text-gray-500 mb-1 font-bold">وارد سوداني</h4>
                         <p className="text-xl font-bold text-gray-800">{fmt(stats.receivedSdg)}</p>
                     </div>
                     <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-r-blue-600">
                         <h4 className="text-xs text-gray-500 mb-1 font-bold">وارد مصري</h4>
                         <p className="text-xl font-bold text-gray-800">{fmt(stats.receivedEgp)}</p>
                     </div>
                     <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-r-purple-500">
                         <h4 className="text-xs text-gray-500 mb-1 font-bold">إجمالي المبيعات</h4>
                         <p className="text-xl font-bold text-gray-800">{fmt(stats.totalSales)} EGP</p>
                     </div>
                     <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-r-red-500">
                         <h4 className="text-xs text-gray-500 mb-1 font-bold">إجمالي المنصرفات</h4>
                         <p className="text-xl font-bold text-red-600">{fmt(stats.totalExpensesEgp)} EGP</p>
                     </div>
                 </div>
             </div>
        )}

        {activeTab === 'sales' && (
            <div className="space-y-3 animate-in fade-in duration-300">
                {salesTx.map(t => <CardRow key={t.id} t={t} />)}
                {salesTx.length === 0 && <div className="text-center text-gray-400 py-10">لا توجد مبيعات</div>}
            </div>
        )}
        
        {activeTab === 'wallet' && (
            <div className="space-y-3 animate-in fade-in duration-300">
                {walletTx.map(t => <CardRow key={t.id} t={t} />)}
                {walletTx.length === 0 && <div className="text-center text-gray-400 py-10">لا توجد بيانات</div>}
            </div>
        )}

        {activeTab === 'expenses' && (
            <div className="space-y-3 animate-in fade-in duration-300">
                {expenseTx.map(t => <CardRow key={t.id} t={t} />)}
                {expenseTx.length === 0 && <div className="text-center text-gray-400 py-10">لا توجد بيانات</div>}
            </div>
        )}

        {activeTab === 'exchange' && (
            <div className="space-y-3 animate-in fade-in duration-300">
                {exchangeTx.map(t => <CardRow key={t.id} t={t} />)}
                {exchangeTx.length === 0 && <div className="text-center text-gray-400 py-10">لا توجد بيانات</div>}
            </div>
        )}

        {activeTab === 'treasury' && (
             <div className="space-y-3 animate-in fade-in duration-300">
                 {treasuryTx.map(t => <CardRow key={t.id} t={t} />)}
                 {treasuryTx.length === 0 && <div className="text-center text-gray-400 py-10">لا توجد بيانات</div>}
             </div>
        )}

        {activeTab === 'cancelled' && (
             <div className="space-y-3 animate-in fade-in duration-300">
                 {cancelledTx.map(t => <CardRow key={t.id} t={t} />)}
                 {cancelledTx.length === 0 && <div className="text-center text-gray-400 py-10">لا توجد عمليات ملغاة</div>}
             </div>
        )}

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

export default Reports;
