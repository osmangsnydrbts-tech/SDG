
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { FileText, Filter, Eye, XCircle, Calendar, ListFilter, TrendingDown, ArrowRightLeft, User, ArrowUp, ArrowDown, Smartphone, ShoppingCart, Ban, Info, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

type TabType = 'breakdown' | 'exchange' | 'treasury' | 'expenses' | 'wallet' | 'sales' | 'cancelled';

const Reports: React.FC = () => {
  const { transactions, currentUser, users, companies, cancelTransaction, eWallets, showToast } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('breakdown');
  
  // Filters
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedEmp, setSelectedEmp] = useState<string>('all');
  
  // Modals
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<number | null>(null); // Holds ID of tx to cancel
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const getEmployeeName = (empId?: number) => users.find(u => u.id === empId)?.full_name || '-';
  const getCompany = (companyId: number) => companies.find(c => c.id === companyId);
  const getEmployee = (empId?: number) => users.find(u => u.id === empId);

  const getWalletInfo = (walletId?: number) => {
      const w = eWallets.find(x => x.id === walletId);
      return w ? `${w.provider} (${w.phone_number})` : 'محفظة محذوفة';
  };

  const handleCancelClick = (id: number) => {
      setShowCancelModal(id);
      setCancelReason('');
  };

  const submitCancellation = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!showCancelModal) return;

      if (!cancelReason.trim()) {
          showToast('يجب كتابة سبب للإلغاء', 'error');
          return;
      }

      setIsCancelling(true);
      const res = await cancelTransaction(showCancelModal, cancelReason);
      setIsCancelling(false);
      
      if (res.success) {
          setShowCancelModal(null);
          setCancelReason('');
          showToast(res.message, 'success');
      } else {
          showToast(res.message, 'error');
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

  // Helper for integer formatting
  const fmt = (num: number) => Math.round(num).toLocaleString();

  // Filter Logic
  const getFilteredTransactions = () => {
      return transactions.filter(t => {
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
  
  // Cancelled Transactions (Ensure explicit check)
  const cancelledTx = allFiltered.filter(t => t.is_cancelled === true);

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

  // Visual Logic Helper
  const getTxStyle = (t: Transaction) => {
    let typeLabel = '';
    let isPositive = false; // Green (In/Down), False = Red (Out/Up)

    switch(t.type) {
        case 'treasury_feed':
            typeLabel = 'إيداع خزينة';
            isPositive = true;
            break;
        case 'treasury_withdraw':
            typeLabel = 'سحب خزينة';
            isPositive = false;
            break;
        case 'expense':
            typeLabel = 'منصرف';
            isPositive = false;
            break;
        case 'sale':
            typeLabel = `بيع: ${t.product_name}`;
            isPositive = true;
            break;
        case 'wallet_feed':
            typeLabel = 'تغذية محفظة';
            isPositive = false; // Money leaving treasury
            break;
        case 'wallet_transfer':
            if (t.wallet_type === 'deposit') {
                typeLabel = 'إيداع في محفظة';
                isPositive = true; // Customer gave money -> Treasury Up
            } else if (t.wallet_type === 'withdraw') {
                typeLabel = 'سحب من محفظة';
                isPositive = false; // We gave money -> Treasury Down
            } else {
                typeLabel = 'صرف عبر محفظة';
                isPositive = true; // Exchange implies we took money to swap
            }
            break;
        case 'exchange':
            typeLabel = 'صرف عملة';
            isPositive = true; // Default to green for exchange entry
            break;
        default:
            typeLabel = 'عملية';
            isPositive = true;
    }

    return {
        label: typeLabel,
        colorClass: isPositive ? 'text-green-600' : 'text-red-600',
        bgClass: isPositive ? 'bg-green-50' : 'bg-red-50',
        Icon: isPositive ? ArrowDown : ArrowUp,
        borderColor: isPositive ? 'border-green-200' : 'border-red-200',
        stripe: isPositive ? 'bg-green-500' : 'bg-red-500'
    };
  };

  const CardRow = ({ t }: { t: Transaction }) => {
    const isCancelled = t.is_cancelled === true;
    const style = getTxStyle(t);
    const TxIcon = style.Icon;

    if (isCancelled) {
        return (
            <div className="p-4 rounded-xl shadow-sm border border-red-200 bg-red-50 flex flex-col gap-3 relative overflow-hidden">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <span>{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                        <div className="flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
                            <User size={12} />
                            <span>{getEmployeeName(t.employee_id)}</span>
                        </div>
                    </div>
                    <span className="text-xs text-red-500 font-bold bg-white px-2 py-1 rounded border border-red-200 flex items-center gap-1">
                         <Ban size={12}/> تم الإلغاء
                    </span>
                </div>
                <div className="text-red-700 font-bold">
                    <div className="flex items-center gap-2 mb-1">
                        <span>{style.label}</span>
                    </div>
                    {t.cancellation_reason && (
                        <div className="text-xs font-normal bg-white/60 p-2 rounded-lg flex items-start gap-1">
                            <Info size={14} className="mt-0.5 shrink-0"/>
                            <span>السبب: {t.cancellation_reason}</span>
                        </div>
                    )}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-600"></div>
            </div>
        );
    }
    
    return (
        <div className={`p-4 rounded-xl shadow-sm border flex flex-col gap-3 relative overflow-hidden group transition-all bg-white border-gray-100`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{new Date(t.created_at).toLocaleDateString('ar-EG')}</span>
                    <span>{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    <User size={12} />
                    <span>{getEmployeeName(t.employee_id)}</span>
                </div>
            </div>

            <div className="flex justify-between items-center">
                <div className={style.colorClass}>
                     <span className="text-xs font-bold block mb-1 flex items-center gap-1">
                        <TxIcon size={16} /> {style.label}
                     </span>
                     <span className="text-xl font-bold">{fmt(t.from_amount)} {t.from_currency}</span>
                     
                     {t.type.includes('wallet') && (
                        <span className="text-xs block text-gray-400 mt-1">{getWalletInfo(t.wallet_id)}</span>
                     )}
                     
                     {(t.type === 'expense' || t.type.includes('treasury')) && t.description && (
                        <span className="text-xs block text-gray-400 mt-1 max-w-[150px] truncate">{t.description}</span>
                     )}
                </div>

                <div className="text-right">
                    {t.type === 'exchange' && t.to_amount && (
                        <div className="text-gray-500">
                            <span className="text-xs font-bold block mb-1 flex items-center justify-end gap-1">تسليم للعميل <ArrowUp size={14} className="text-red-400"/></span>
                            <span className="text-xl font-bold text-gray-700">{fmt(t.to_amount)} {t.to_currency}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-1">
                 <div className="text-xs font-mono text-gray-400">
                     #{t.receipt_number || t.id}
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => setViewTransaction(t)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition" title="عرض الإيصال">
                         <Eye size={16} />
                     </button>
                     
                     {currentUser?.role === 'admin' && (
                        <button 
                            onClick={() => handleCancelClick(t.id)} 
                            className="p-2 rounded-lg transition flex items-center gap-1 text-orange-500 bg-orange-50 hover:bg-orange-100"
                            title="إلغاء العملية"
                        >
                            <XCircle size={16} />
                        </button>
                     )}
                 </div>
            </div>
            
            <div className={`absolute right-0 top-0 bottom-0 w-1 ${style.stripe}`}></div>
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
            <button onClick={() => setActiveTab('treasury')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'treasury' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <FileText size={16}/> الخزينة
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

        {/* Tab Content Logic */}
        {[
            { tab: 'sales', data: salesTx, empty: 'لا توجد مبيعات' },
            { tab: 'wallet', data: walletTx, empty: 'لا توجد بيانات محافظ' },
            { tab: 'expenses', data: expenseTx, empty: 'لا توجد منصرفات' },
            { tab: 'exchange', data: exchangeTx, empty: 'لا توجد عمليات صرف' },
            { tab: 'treasury', data: treasuryTx, empty: 'لا توجد عمليات خزينة' },
            { tab: 'cancelled', data: cancelledTx, empty: 'لا توجد عمليات ملغاة' }
        ].map(section => (
            activeTab === section.tab && (
                <div key={section.tab} className="space-y-3 animate-in fade-in duration-300">
                    {section.data.map(t => <CardRow key={t.id} t={t} />)}
                    {section.data.length === 0 && <div className="text-center text-gray-400 py-10">{section.empty}</div>}
                </div>
            )
        ))}

        {viewTransaction && (
            <ReceiptModal 
                transaction={viewTransaction} 
                company={getCompany(viewTransaction.company_id)} 
                employee={getEmployee(viewTransaction.employee_id)} 
                onClose={() => setViewTransaction(null)} 
            />
        )}

        {/* Custom Cancellation Modal */}
        {showCancelModal && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                    <div className="text-center mb-6">
                        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">إلغاء العملية</h3>
                        <p className="text-sm text-gray-500 mt-2">هل أنت متأكد من رغبتك في إلغاء هذه العملية؟ سيتم عكس المبالغ المالية فوراً.</p>
                    </div>

                    <form onSubmit={submitCancellation}>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-700 mb-1">سبب الإلغاء (مطلوب)</label>
                            <input 
                                type="text" 
                                autoFocus
                                value={cancelReason}
                                onChange={e => setCancelReason(e.target.value)}
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                placeholder="مثال: خطأ في المبلغ، إرجاع..."
                                required
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                type="submit" 
                                disabled={isCancelling}
                                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 flex items-center justify-center gap-2"
                            >
                                {isCancelling ? <Loader2 size={18} className="animate-spin" /> : 'تأكيد الإلغاء'}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => { setShowCancelModal(null); setCancelReason(''); }}
                                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200"
                            >
                                تراجع
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default Reports;
