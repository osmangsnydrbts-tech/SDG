
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { FileText, Download, Filter, Calculator, Search, Eye, Trash2, Calendar, ListFilter, TrendingDown, TrendingUp, Wallet, Banknote, ArrowRightLeft, ArrowUpRight, ArrowDownLeft, X, ChevronLeft, Coins, PieChart } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

type TabType = 'breakdown' | 'transactions';

interface DetailViewData {
  title: string;
  transactions: Transaction[];
  total: number;
  currency: string;
  theme: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'indigo';
  valueKey: 'from_amount' | 'commission';
}

const Reports: React.FC = () => {
  const { transactions, currentUser, users, companies, deleteTransaction } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('breakdown');
  
  // Filtering States
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [detailView, setDetailView] = useState<DetailViewData | null>(null);

  // Helpers
  const getEmployeeName = (empId?: number) => {
      if (!empId) return '-';
      return users.find(u => u.id === empId)?.full_name || 'Unknown';
  };

  const getCompany = (companyId: number) => companies.find(c => c.id === companyId);
  const getEmployee = (empId?: number) => users.find(u => u.id === empId);

  const handleDelete = async (id: number) => {
      if (window.confirm('هل أنت متأكد من حذف هذه العملية؟ سيتم عكس التأثير المالي على الخزينة.')) {
          await deleteTransaction(id);
          // If detailed view is open, close it to avoid stale data
          setDetailView(null);
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
      setStartDate('2024-01-01');
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

        // 2. Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const receiptMatch = t.receipt_number?.toLowerCase().includes(query);
            const descMatch = t.description?.toLowerCase().includes(query);
            const empName = getEmployeeName(t.employee_id).toLowerCase();
            const empMatch = empName.includes(query);
            
            if (!receiptMatch && !descMatch && !empMatch) return false;
        }

        // 3. Date Range
        const txDate = new Date(t.created_at).setHours(0,0,0,0);
        const start = new Date(startDate).setHours(0,0,0,0);
        const end = new Date(endDate).setHours(23,59,59,999);

        if (txDate < start || txDate > end) return false;

        // 4. Type Check
        if (selectedType !== 'all') {
            if (selectedType === 'exchange' && t.type !== 'exchange') return false;
            
            if (selectedType === 'e_wallet') {
                if (t.type !== 'e_wallet' && t.type !== 'wallet_deposit' && t.type !== 'wallet_withdrawal' && t.type !== 'wallet_feed') return false;
            }

            if (selectedType === 'treasury' && !['treasury_feed', 'treasury_withdraw'].includes(t.type)) return false;
            if (selectedType === 'expense' && t.type !== 'expense') return false;
        }

        return true;
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const filtered = getFilteredTransactions();

  // --- Derived Lists for Breakdown ---
  const lists = {
      exchangeSdg: filtered.filter(t => t.type === 'exchange' && t.from_currency === 'SDG'),
      exchangeEgp: filtered.filter(t => t.type === 'exchange' && t.from_currency === 'EGP'),
      walletDep: filtered.filter(t => t.type === 'wallet_deposit'),
      walletWith: filtered.filter(t => t.type === 'wallet_withdrawal'),
      commissions: filtered.filter(t => (t.commission || 0) > 0),
      expEgp: filtered.filter(t => t.type === 'expense' && t.from_currency === 'EGP'),
      expSdg: filtered.filter(t => t.type === 'expense' && t.from_currency === 'SDG'),
  };

  const totals = {
      exchangeSdg: lists.exchangeSdg.reduce((s, t) => s + t.from_amount, 0),
      exchangeEgp: lists.exchangeEgp.reduce((s, t) => s + t.from_amount, 0),
      walletDep: lists.walletDep.reduce((s, t) => s + t.from_amount, 0),
      walletWith: lists.walletWith.reduce((s, t) => s + t.from_amount, 0),
      commissions: lists.commissions.reduce((s, t) => s + (t.commission || 0), 0),
      expEgp: lists.expEgp.reduce((s, t) => s + t.from_amount, 0),
      expSdg: lists.expSdg.reduce((s, t) => s + t.from_amount, 0),
  };

  const openDetail = (
      title: string, 
      transactions: Transaction[], 
      total: number, 
      currency: string, 
      theme: DetailViewData['theme'],
      valueKey: 'from_amount' | 'commission' = 'from_amount'
  ) => {
      setDetailView({ title, transactions, total, currency, theme, valueKey });
  };

  const handleExport = () => {
    const headers = ["ID", "التاريخ", "الموظف", "النوع", "من عملة", "المبلغ", "إلى عملة", "المبلغ", "العمولة", "الوصف / البيان", "رقم الإشعار"];
    
    const rows = filtered.map(t => [
        t.id,
        new Date(t.created_at).toLocaleDateString('ar-EG') + ' ' + new Date(t.created_at).toLocaleTimeString('ar-EG'),
        getEmployeeName(t.employee_id),
        getTxTypeLabel(t.type),
        t.from_currency || '-',
        Math.round(t.from_amount),
        t.to_currency || '-',
        t.to_amount ? Math.round(t.to_amount) : '-',
        t.commission ? Math.round(t.commission) : 0,
        t.description ? `"${t.description}"` : '-',
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
    link.setAttribute("download", `Full_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTxTypeLabel = (type: string) => {
      switch(type) {
          case 'exchange': return 'صرف عملة';
          case 'expense': return 'منصرفات';
          case 'treasury_feed': return 'إيداع خزينة';
          case 'treasury_withdraw': return 'سحب خزينة';
          case 'wallet_deposit': return 'إيداع محفظة';
          case 'wallet_withdrawal': return 'سحب محفظة';
          case 'wallet_feed': return 'تغذية محفظة';
          default: return type;
      }
  };

  const getTxColor = (type: string) => {
       if (type === 'exchange') return 'bg-blue-100 text-blue-700';
       if (type === 'expense') return 'bg-orange-100 text-orange-700';
       if (type === 'wallet_deposit') return 'bg-green-100 text-green-700';
       if (type === 'wallet_withdrawal') return 'bg-red-100 text-red-700';
       if (type.includes('withdraw')) return 'bg-red-100 text-red-700';
       return 'bg-gray-100 text-gray-700';
  };

  // Reusable Summary Card Component
  const SummaryCard = ({ 
    title, 
    amount, 
    currency, 
    icon: Icon, 
    theme, 
    onClick 
  }: { 
    title: string, 
    amount: number, 
    currency: string, 
    icon: any, 
    theme: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'indigo', 
    onClick: () => void 
  }) => {
      const themes = {
          blue: 'bg-blue-50 border-blue-100 text-blue-700 hover:border-blue-300',
          green: 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:border-emerald-300',
          red: 'bg-red-50 border-red-100 text-red-700 hover:border-red-300',
          orange: 'bg-orange-50 border-orange-100 text-orange-700 hover:border-orange-300',
          purple: 'bg-purple-50 border-purple-100 text-purple-700 hover:border-purple-300',
          indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:border-indigo-300',
      };

      const iconThemes = {
          blue: 'bg-blue-200 text-blue-700',
          green: 'bg-emerald-200 text-emerald-700',
          red: 'bg-red-200 text-red-700',
          orange: 'bg-orange-200 text-orange-700',
          purple: 'bg-purple-200 text-purple-700',
          indigo: 'bg-indigo-200 text-indigo-700',
      };

      return (
          <div 
            onClick={onClick}
            className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-95 group ${themes[theme]}`}
          >
              <div className="flex justify-between items-start mb-3">
                  <div className={`p-3 rounded-xl ${iconThemes[theme]}`}>
                      <Icon size={24} />
                  </div>
                  <div className="bg-white/60 p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                      <ChevronLeft size={20} />
                  </div>
              </div>
              <div>
                  <h4 className="font-bold text-sm opacity-80 mb-1">{title}</h4>
                  <p className="text-2xl font-black tracking-tight" dir="ltr">
                      {amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} 
                      <span className="text-xs font-bold opacity-60 ml-1">{currency}</span>
                  </p>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
        {/* Controls Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <Filter size={20} className="text-blue-600" /> فلترة التقارير
                </h2>
                <button 
                    onClick={handleExport}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-green-700 transition shadow-sm"
                >
                    <Download size={16} /> تصدير Excel
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative md:col-span-4">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Search size={18} className="text-gray-400" />
                    </span>
                    <input 
                        type="text" 
                        placeholder="بحث (اسم الموظف، رقم الإشعار، الوصف...)" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition"
                    />
                </div>

                {/* Date Range */}
                <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><Calendar size={14}/> الفترة الزمنية</label>
                    <div className="flex gap-2 items-center">
                        <input 
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="flex-1 p-2 border rounded-lg bg-gray-50 text-sm"
                        />
                        <span className="text-gray-400">إلى</span>
                        <input 
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="flex-1 p-2 border rounded-lg bg-gray-50 text-sm"
                        />
                    </div>
                    <div className="flex gap-2 text-xs">
                        <button onClick={setFilterToday} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">اليوم</button>
                        <button onClick={setFilterMonth} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">هذا الشهر</button>
                        <button onClick={setFilterAll} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200">الكل</button>
                    </div>
                </div>

                {/* Type Filter */}
                <div className="md:col-span-2 space-y-2">
                    <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><ListFilter size={14}/> نوع العملية</label>
                    <select 
                        value={selectedType} 
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-gray-50 text-sm h-[40px]"
                    >
                        <option value="all">عرض كل العمليات</option>
                        <option value="exchange">صرف عملة فقط</option>
                        <option value="expense">منصرفات فقط</option>
                        <option value="e_wallet">محافظ إلكترونية</option>
                        <option value="treasury">حركة خزينة</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-gray-200">
            <button onClick={() => setActiveTab('breakdown')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition ${activeTab === 'breakdown' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                الملخص المالي
            </button>
            <button onClick={() => setActiveTab('transactions')} className={`flex-1 py-3 px-4 text-sm font-bold rounded-lg transition ${activeTab === 'transactions' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                سجل العمليات (الكل)
            </button>
        </div>

        {/* ================= Detailed Breakdown Tab ================= */}
        {activeTab === 'breakdown' && (
             <div className="space-y-6 animate-in fade-in duration-300">
                 
                 {/* Section: Exchange */}
                 <div className="space-y-3">
                    <h3 className="text-gray-500 font-bold text-sm flex items-center gap-2 px-1">
                        <ArrowRightLeft size={16}/> عمليات الصرف (شراء)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard 
                            title="مقبوضات سوداني (شراء مصري)" 
                            amount={totals.exchangeSdg} 
                            currency="SDG" 
                            icon={ArrowDownLeft} 
                            theme="blue"
                            onClick={() => openDetail('مقبوضات سوداني', lists.exchangeSdg, totals.exchangeSdg, 'SDG', 'blue')}
                        />
                         <SummaryCard 
                            title="مقبوضات مصري (شراء سوداني)" 
                            amount={totals.exchangeEgp} 
                            currency="EGP" 
                            icon={ArrowDownLeft} 
                            theme="indigo"
                            onClick={() => openDetail('مقبوضات مصري', lists.exchangeEgp, totals.exchangeEgp, 'EGP', 'indigo')}
                        />
                    </div>
                 </div>

                 {/* Section: Wallets */}
                 <div className="space-y-3">
                    <h3 className="text-gray-500 font-bold text-sm flex items-center gap-2 px-1">
                        <Wallet size={16}/> المحافظ الإلكترونية
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard 
                            title="صافي العمولات" 
                            amount={totals.commissions} 
                            currency="EGP" 
                            icon={Coins} 
                            theme="purple"
                            onClick={() => openDetail('عمولات المحافظ', lists.commissions, totals.commissions, 'EGP', 'purple', 'commission')}
                        />
                        <SummaryCard 
                            title="إيداعات (استلام كاش)" 
                            amount={totals.walletDep} 
                            currency="EGP" 
                            icon={ArrowDownLeft} 
                            theme="green"
                            onClick={() => openDetail('إيداعات المحافظ', lists.walletDep, totals.walletDep, 'EGP', 'green')}
                        />
                        <SummaryCard 
                            title="سحوبات (دفع كاش)" 
                            amount={totals.walletWith} 
                            currency="EGP" 
                            icon={ArrowUpRight} 
                            theme="red"
                            onClick={() => openDetail('سحوبات المحافظ', lists.walletWith, totals.walletWith, 'EGP', 'red')}
                        />
                    </div>
                 </div>

                 {/* Section: Expenses */}
                 <div className="space-y-3">
                    <h3 className="text-gray-500 font-bold text-sm flex items-center gap-2 px-1">
                        <TrendingDown size={16}/> المصروفات
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SummaryCard 
                            title="مصروفات (مصري)" 
                            amount={totals.expEgp} 
                            currency="EGP" 
                            icon={FileText} 
                            theme="orange"
                            onClick={() => openDetail('مصروفات (EGP)', lists.expEgp, totals.expEgp, 'EGP', 'orange')}
                        />
                         <SummaryCard 
                            title="مصروفات (سوداني)" 
                            amount={totals.expSdg} 
                            currency="SDG" 
                            icon={FileText} 
                            theme="orange"
                            onClick={() => openDetail('مصروفات (SDG)', lists.expSdg, totals.expSdg, 'SDG', 'orange')}
                        />
                    </div>
                 </div>

                 <div className="pt-4 text-center text-gray-400 text-sm">
                     عدد العمليات: {filtered.length}
                 </div>
             </div>
        )}

        {/* ================= All Transactions Log ================= */}
        {activeTab === 'transactions' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-in fade-in duration-300">
                <div className="p-4 bg-gray-50 font-bold border-b text-sm text-gray-700 flex justify-between items-center">
                    <span>سجل كل العمليات</span>
                    <span className="text-xs font-normal bg-white px-2 py-1 rounded border shadow-sm">{filtered.length} عملية</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="p-4">الوقت</th>
                                <th className="p-4">الموظف</th>
                                <th className="p-4">نوع العملية</th>
                                <th className="p-4">التفاصيل المالية</th>
                                <th className="p-4">رقم الإشعار / ملاحظات</th>
                                <th className="p-4 text-center">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map(t => (
                                <tr key={t.id} className="hover:bg-blue-50/50 transition-colors">
                                    {/* Date & Time */}
                                    <td className="p-4 text-gray-600 whitespace-nowrap">
                                        <div className="font-bold text-gray-900">{new Date(t.created_at).toLocaleDateString('ar-EG')}</div>
                                        <div className="text-xs text-gray-400 font-mono">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</div>
                                    </td>

                                    {/* Employee */}
                                    <td className="p-4 font-medium text-gray-800 whitespace-nowrap">
                                        {getEmployeeName(t.employee_id)}
                                    </td>

                                    {/* Type Badge */}
                                    <td className="p-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTxColor(t.type)}`}>
                                            {getTxTypeLabel(t.type)}
                                        </span>
                                    </td>

                                    {/* Financial Details */}
                                    <td className="p-4">
                                        {t.type === 'exchange' ? (
                                            <div className="flex flex-col gap-1 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 w-4">من:</span>
                                                    <span className="font-bold text-gray-800 text-sm" dir="ltr">{Math.round(t.from_amount).toLocaleString()} {t.from_currency}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 w-4">إلى:</span>
                                                    <span className="font-bold text-blue-600 text-sm" dir="ltr">{Math.round(t.to_amount || 0).toLocaleString()} {t.to_currency}</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded w-fit">سعر: {t.rate}</span>
                                            </div>
                                        ) : t.type === 'expense' ? (
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-red-600 text-sm" dir="ltr">-{Math.round(t.from_amount).toLocaleString()} {t.from_currency}</span>
                                            </div>
                                        ) : ['wallet_deposit', 'wallet_withdrawal', 'wallet_feed'].includes(t.type) ? (
                                            <div className="flex flex-col gap-1">
                                                <span className={`font-bold text-sm ${t.type === 'wallet_withdrawal' ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
                                                    {t.type === 'wallet_withdrawal' ? '-' : '+'}{Math.round(t.from_amount).toLocaleString()} {t.from_currency}
                                                </span>
                                                {t.commission ? <span className="text-[10px] text-green-600">+ {t.commission} عمولة</span> : null}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <span className={`font-bold text-sm ${t.type.includes('withdraw') ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
                                                     {t.type.includes('withdraw') ? '-' : '+'}{Math.round(t.from_amount).toLocaleString()} {t.from_currency}
                                                </span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Receipt / Notes */}
                                    <td className="p-4 text-sm text-gray-600">
                                        <div className="flex flex-col gap-1">
                                            {t.receipt_number && <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-500 w-fit">#{t.receipt_number}</span>}
                                            {t.description && <span className="text-xs italic truncate max-w-[150px]">{t.description}</span>}
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setViewTransaction(t)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-colors" title="عرض الإشعار">
                                                <Eye size={18} />
                                            </button>
                                            {currentUser?.role === 'admin' && (
                                                <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors" title="حذف العملية">
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center">
                                        <div className="flex flex-col items-center text-gray-300">
                                            <Search size={48} className="mb-2 opacity-50"/>
                                            <p className="font-bold text-lg">لا توجد عمليات</p>
                                            <p className="text-sm">حاول تغيير معايير البحث أو الفترة الزمنية</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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

        {/* Detailed List Modal */}
        {detailView && (
            <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
                    {/* Header */}
                    <div className={`p-5 border-b rounded-t-2xl flex justify-between items-center bg-gray-50`}>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <PieChart size={20} className="text-gray-500"/> 
                                {detailView.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                الفترة من {new Date(startDate).toLocaleDateString('ar-EG')} إلى {new Date(endDate).toLocaleDateString('ar-EG')}
                            </p>
                        </div>
                        <button onClick={() => setDetailView(null)} className="p-2 hover:bg-gray-200 rounded-full transition">
                            <X size={20} className="text-gray-600" />
                        </button>
                    </div>
                    
                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50 text-gray-500 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 rounded-r-lg">التاريخ</th>
                                    <th className="p-3">الموظف</th>
                                    <th className="p-3">البيان / الوصف</th>
                                    <th className="p-3 rounded-l-lg text-left">المبلغ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {detailView.transactions.map(t => {
                                    const amount = detailView.valueKey === 'commission' ? (t.commission || 0) : t.from_amount;
                                    return (
                                        <tr key={t.id} className="hover:bg-gray-50 transition">
                                            <td className="p-3 whitespace-nowrap">
                                                <div className="font-bold text-gray-800">{new Date(t.created_at).toLocaleDateString('ar-EG')}</div>
                                                <div className="text-xs text-gray-400 font-mono">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="p-3 font-medium text-gray-700">{getEmployeeName(t.employee_id)}</td>
                                            <td className="p-3">
                                                <div className="text-gray-600 text-xs font-medium bg-gray-100 w-fit px-2 py-1 rounded">
                                                    {t.description || getTxTypeLabel(t.type)}
                                                </div>
                                                {t.receipt_number && <div className="text-[10px] text-gray-400 mt-1">#{t.receipt_number}</div>}
                                            </td>
                                            <td className="p-3 text-left">
                                                <span className="font-bold text-gray-900" dir="ltr">
                                                    {Math.round(amount).toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                 {detailView.transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center p-12 text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Filter size={32} className="opacity-20"/>
                                                <span>لا توجد تفاصيل لهذه الفترة</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Footer */}
                    <div className="p-5 border-t bg-gray-50 rounded-b-2xl flex justify-between items-center">
                        <span className="text-gray-500 font-medium">الإجمالي الكلي:</span>
                        <div className="text-xl font-black text-gray-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                            {detailView.total.toLocaleString(undefined, { maximumFractionDigits: 0 })} 
                            <span className="text-sm font-bold text-gray-400 ml-1">{detailView.currency}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Reports;
