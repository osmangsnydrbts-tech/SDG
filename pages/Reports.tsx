
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { FileText, Download, Filter, Search, Eye, Trash2, Calendar, ListFilter, TrendingDown, ArrowRightLeft, Landmark, Clock, User, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

type TabType = 'exchange' | 'treasury' | 'expenses' | 'breakdown';

const Reports: React.FC = () => {
  const { transactions, currentUser, users, companies, deleteTransaction } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('breakdown');
  
  // Filtering States
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  // Helper to get employee name
  const getEmployeeName = (empId?: number) => {
      if (!empId) return '-';
      return users.find(u => u.id === empId)?.full_name || 'Unknown';
  };

  const getCompany = (companyId: number) => {
      return companies.find(c => c.id === companyId);
  };

  const getEmployee = (empId?: number) => {
      return users.find(u => u.id === empId);
  };

  const handleDelete = async (id: number) => {
      if (window.confirm('هل أنت متأكد من حذف هذه العملية؟ سيتم استرداد المبلغ إلى خزينة الموظف.')) {
          await deleteTransaction(id);
      }
  };

  // Quick Filter Handlers
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

  const setFilterAll = () => {
      setStartDate('2024-01-01'); // Arbitrary past date
      setEndDate(new Date().toISOString().split('T')[0]);
  };

  // Base Filter Logic
  const getFilteredTransactions = () => {
      return transactions.filter(t => {
        // 1. Role Check
        let roleMatch = false;
        if (currentUser?.role === 'super_admin') roleMatch = true;
        else if (currentUser?.role === 'admin') roleMatch = t.company_id === currentUser.company_id;
        else roleMatch = t.employee_id === currentUser?.id;

        if (!roleMatch) return false;

        // 2. Search Query Check (Receipt Number)
        if (searchQuery) {
            return t.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase());
        }

        // 3. Date Range Check
        const txDate = new Date(t.created_at).setHours(0,0,0,0);
        const start = new Date(startDate).setHours(0,0,0,0);
        const end = new Date(endDate).setHours(23,59,59,999); // End of the day

        if (txDate < start || txDate > end) return false;

        // 4. Type Check
        if (selectedType !== 'all') {
            if (selectedType === 'exchange' && t.type !== 'exchange') return false;
            if (selectedType === 'expense' && t.type !== 'expense') return false;
            
            if (selectedType === 'e_wallet') {
                if (t.type !== 'e_wallet' && t.type !== 'wallet_deposit' && t.type !== 'wallet_withdrawal') return false;
            }

            if (selectedType === 'treasury' && !['treasury_feed', 'treasury_withdraw'].includes(t.type)) return false;
        }

        return true;
      });
  };

  const filtered = getFilteredTransactions();
  
  // Derived lists based on filtered data
  const exchangeTx = filtered.filter(t => t.type === 'exchange');
  const treasuryTx = filtered.filter(t => ['treasury_feed', 'treasury_withdraw'].includes(t.type));
  const expenseTx = filtered.filter(t => t.type === 'expense');

  // --- STATS CALCULATION ---
  const stats = {
      exchangeCount: exchangeTx.length,
      receivedSdg: exchangeTx.filter(t => t.from_currency === 'SDG').reduce((sum, t) => sum + t.from_amount, 0),
      receivedEgp: exchangeTx.filter(t => t.from_currency === 'EGP').reduce((sum, t) => sum + t.from_amount, 0),
      // Fix wallet logic: calculate commission from deposits/withdrawals
      walletCommission: filtered.filter(t => t.commission).reduce((sum, t) => sum + (t.commission || 0), 0),
      totalExpensesEgp: expenseTx.filter(t => t.from_currency === 'EGP').reduce((sum, t) => sum + t.from_amount, 0),
      totalExpensesSdg: expenseTx.filter(t => t.from_currency === 'SDG').reduce((sum, t) => sum + t.from_amount, 0),
  };

  const handleExport = () => {
    const headers = ["ID", "التاريخ", "الموظف", "النوع", "من", "المبلغ", "إلى", "المبلغ", "السعر", "العمولة", "رقم الإشعار"];
    
    // Export based on active tab or all filtered
    let dataToExport = filtered;
    if (activeTab === 'exchange') dataToExport = exchangeTx;
    if (activeTab === 'treasury') dataToExport = treasuryTx;
    if (activeTab === 'expenses') dataToExport = expenseTx;

    const rows = dataToExport.map(t => [
        t.id,
        new Date(t.created_at).toLocaleDateString('ar-EG') + ' ' + new Date(t.created_at).toLocaleTimeString('ar-EG'),
        getEmployeeName(t.employee_id),
        t.type,
        t.from_currency || '-',
        t.from_amount,
        t.to_currency || '-',
        t.to_amount || '-',
        t.rate || '-',
        t.commission || 0,
        t.receipt_number || '-'
    ]);

    const csvContent = [
        headers.join(","), 
        ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `report_${activeTab}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CardRow = ({ t, type }: { t: Transaction, type: 'exchange' | 'expense' | 'treasury' }) => {
    const isExchange = type === 'exchange';
    const isExpense = type === 'expense';
    
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 relative overflow-hidden group">
            {/* Header: Date & User */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                    <Clock size={12} />
                    <span>{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{new Date(t.created_at).toLocaleDateString('ar-EG')}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                    <User size={12} />
                    <span>{getEmployeeName(t.employee_id)}</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex justify-between items-center">
                {/* Right Side: Amount IN or Expense */}
                <div>
                     {isExpense ? (
                        <div className="text-red-600">
                             <span className="text-xs font-bold block mb-1 flex items-center gap-1"><TrendingDown size={14}/> منصرف</span>
                             <span className="text-xl font-bold">{t.from_amount.toLocaleString()} {t.from_currency}</span>
                        </div>
                     ) : isExchange ? (
                         <div className="text-green-600">
                             <span className="text-xs font-bold block mb-1 flex items-center gap-1"><ArrowDownLeft size={14}/> استلام</span>
                             <span className="text-xl font-bold">{t.from_amount.toLocaleString()} {t.from_currency}</span>
                         </div>
                     ) : (
                         <div className={t.type === 'treasury_feed' ? 'text-green-600' : 'text-red-600'}>
                             <span className="text-xs font-bold block mb-1">{t.type === 'treasury_feed' ? 'إيداع خزينة' : 'سحب خزينة'}</span>
                             <span className="text-xl font-bold">{t.from_amount.toLocaleString()} {t.from_currency}</span>
                         </div>
                     )}
                </div>

                {/* Left Side: Amount OUT or Description */}
                <div className="text-right">
                    {isExchange && t.to_amount && (
                        <div className="text-red-500">
                            <span className="text-xs font-bold block mb-1 flex items-center justify-end gap-1">تسليم <ArrowUpRight size={14}/></span>
                            <span className="text-xl font-bold">{t.to_amount.toLocaleString()} {t.to_currency}</span>
                        </div>
                    )}
                    {isExpense && (
                         <div className="text-gray-500 text-sm max-w-[150px] truncate text-left">
                            {t.description}
                         </div>
                    )}
                    {type === 'treasury' && (
                        <div className="text-gray-400 text-xs max-w-[150px] truncate">
                            {t.description || '-'}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer: Receipt & Actions */}
            <div className="flex justify-between items-center border-t border-gray-50 pt-3 mt-1">
                 <div className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
                     #{t.receipt_number || t.id}
                 </div>
                 <div className="flex gap-2">
                     {isExchange && (
                         <button onClick={() => setViewTransaction(t)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition" title="عرض الإيصال">
                             <Eye size={16} />
                         </button>
                     )}
                     {currentUser?.role === 'admin' && (
                         <button onClick={() => handleDelete(t.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition" title="حذف">
                             <Trash2 size={16} />
                         </button>
                     )}
                 </div>
            </div>
            
            {/* Side Indicator Stripe */}
            <div className={`absolute right-0 top-0 bottom-0 w-1 ${isExpense ? 'bg-red-500' : isExchange ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
        </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
        {/* Controls Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                    <Filter size={20} className="text-blue-600" /> فلترة التقارير
                </h2>
                <div className="flex gap-2 w-full sm:w-auto">
                     <button 
                        onClick={handleExport}
                        className="flex-1 sm:flex-none bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition shadow-sm font-bold"
                    >
                        <Download size={16} /> تصدير
                    </button>
                </div>
            </div>
            
            {/* Search Box */}
            <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Search size={18} className="text-gray-400" />
                </span>
                <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="بحث برقم الإشعار..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition"
                />
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Range */}
                <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><Calendar size={14}/> الفترة الزمنية</label>
                    <div className="flex gap-2 items-center">
                        <div className="flex-1">
                            <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-gray-50 text-sm font-bold text-gray-700"
                            />
                        </div>
                        <span className="text-gray-400 font-bold">إلى</span>
                        <div className="flex-1">
                            <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-gray-50 text-sm font-bold text-gray-700"
                            />
                        </div>
                    </div>
                    {/* Quick Date Buttons */}
                    <div className="flex gap-2 text-xs overflow-x-auto pb-1 no-scrollbar">
                        <button onClick={setFilterToday} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 font-bold whitespace-nowrap">اليوم</button>
                        <button onClick={setFilterMonth} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 font-bold whitespace-nowrap">هذا الشهر</button>
                        <button onClick={setFilterAll} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 font-bold whitespace-nowrap">الكل</button>
                    </div>
                </div>

                {/* Transaction Type */}
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><ListFilter size={14}/> نوع العملية</label>
                    <select 
                        value={selectedType} 
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-gray-50 text-sm h-[42px] font-bold text-gray-700"
                    >
                        <option value="all">كل العمليات</option>
                        <option value="exchange">صرف عملة</option>
                        <option value="expense">منصرفات</option>
                        <option value="e_wallet">محفظة إلكترونية</option>
                        <option value="treasury">حركة خزينة</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 overflow-x-auto shadow-sm no-scrollbar">
            <button onClick={() => setActiveTab('breakdown')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'breakdown' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <FileText size={16}/> الملخص
            </button>
            <button onClick={() => setActiveTab('exchange')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'exchange' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <ArrowRightLeft size={16}/> الصرف
            </button>
            <button onClick={() => setActiveTab('treasury')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'treasury' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Landmark size={16}/> الخزينة
            </button>
            <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition flex items-center justify-center gap-2 ${activeTab === 'expenses' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                <TrendingDown size={16}/> المنصرفات
            </button>
        </div>

        {/* Detailed Breakdown Tab */}
        {activeTab === 'breakdown' && (
             <div className="space-y-4 animate-in fade-in duration-300">
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     {/* SDG Income */}
                     <div className="bg-white p-5 rounded-xl shadow-sm border-r-4 border-r-orange-500">
                         <h4 className="text-xs text-gray-500 mb-1 font-bold">مقبوضات سوداني (SDG)</h4>
                         <p className="text-2xl font-bold text-gray-800">{stats.receivedSdg.toLocaleString()}</p>
                     </div>

                     {/* EGP Income */}
                     <div className="bg-white p-5 rounded-xl shadow-sm border-r-4 border-r-blue-500">
                         <h4 className="text-xs text-gray-500 mb-1 font-bold">مقبوضات مصري (EGP)</h4>
                         <p className="text-2xl font-bold text-gray-800">{stats.receivedEgp.toLocaleString()}</p>
                     </div>

                     {/* Commissions */}
                     <div className="bg-white p-5 rounded-xl shadow-sm border-r-4 border-r-green-500">
                         <h4 className="text-xs text-gray-500 mb-1 font-bold">أرباح العمولات (EGP)</h4>
                         <p className="text-2xl font-bold text-green-700">{stats.walletCommission.toLocaleString()}</p>
                     </div>

                     {/* Expenses */}
                     <div className="bg-white p-5 rounded-xl shadow-sm border-r-4 border-r-red-500">
                         <h4 className="text-xs text-gray-500 mb-1 font-bold">إجمالي المنصرفات</h4>
                         <div className="flex flex-col">
                            <span className="text-red-600 font-bold">{stats.totalExpensesEgp.toLocaleString()} EGP</span>
                            <span className="text-red-600 font-bold text-sm">{stats.totalExpensesSdg.toLocaleString()} SDG</span>
                         </div>
                     </div>
                 </div>
                 
                 <div className="text-center text-gray-400 text-sm py-4">
                    اختر أحد التبويبات أعلاه لعرض التفاصيل الكاملة
                 </div>
             </div>
        )}

        {/* Expenses Log - Card View */}
        {activeTab === 'expenses' && (
            <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                    <span>عدد العمليات: {expenseTx.length}</span>
                </div>
                {expenseTx.map((t) => (
                    <CardRow key={t.id} t={t} type="expense" />
                ))}
                {expenseTx.length === 0 && <div className="text-center text-gray-400 py-10">لا توجد بيانات</div>}
            </div>
        )}

        {/* Exchange Log - Card View */}
        {activeTab === 'exchange' && (
            <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                     <span>عدد العمليات: {exchangeTx.length}</span>
                </div>
                {exchangeTx.map((t) => (
                    <CardRow key={t.id} t={t} type="exchange" />
                ))}
                {exchangeTx.length === 0 && <div className="text-center text-gray-400 py-10">لا توجد بيانات</div>}
            </div>
        )}

        {/* Treasury Log - Card View */}
        {activeTab === 'treasury' && (
             <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                     <span>عدد العمليات: {treasuryTx.length}</span>
                </div>
                 {treasuryTx.map((t) => (
                    <CardRow key={t.id} t={t} type="treasury" />
                 ))}
                 {treasuryTx.length === 0 && <div className="text-center text-gray-400 py-10">لا توجد بيانات</div>}
             </div>
        )}

        {/* Receipt Viewer */}
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
