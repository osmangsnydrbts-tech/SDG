
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  FileText, Download, Filter, Search, Eye, Trash2, Calendar, 
  ListFilter, TrendingDown, Wallet, ArrowRightLeft, 
  ArrowUpRight, ArrowDownLeft, X, ChevronLeft, Coins, PieChart,
  Banknote, ArrowUpCircle, ArrowDownCircle, Activity,
  Briefcase
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

type TabType = 'breakdown' | 'transactions';

interface DetailViewData {
  title: string;
  transactions: Transaction[];
  total: number;
  count: number;
  currency: string;
  theme: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'indigo' | 'teal' | 'gray';
  valueKey?: 'from_amount' | 'commission' | 'to_amount';
}

const Reports: React.FC = () => {
  const { transactions, currentUser, users, companies, deleteTransaction } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('breakdown');
  
  // Filtering States
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
          setDetailView(null); // Close detail view to prevent stale data
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

        return true;
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const filtered = getFilteredTransactions();

  // --- Derived Lists for Breakdown ---
  const lists = {
      // Exchange
      exchangeSdg: filtered.filter(t => t.type === 'exchange' && t.from_currency === 'SDG'),
      exchangeEgp: filtered.filter(t => t.type === 'exchange' && t.from_currency === 'EGP'),
      
      // Wallet
      walletDep: filtered.filter(t => t.type === 'wallet_deposit'), // Agent Deposit (Buying E-money)
      walletWith: filtered.filter(t => t.type === 'wallet_withdrawal'), // Agent Withdraw (Selling E-money)
      commissions: filtered.filter(t => (t.commission || 0) > 0),
      walletFeed: filtered.filter(t => t.type === 'wallet_feed'),

      // Expenses
      expEgp: filtered.filter(t => t.type === 'expense' && t.from_currency === 'EGP'),
      expSdg: filtered.filter(t => t.type === 'expense' && t.from_currency === 'SDG'),
      
      // Treasury (Internal)
      treasuryIn: filtered.filter(t => t.type === 'treasury_feed'),
      treasuryOut: filtered.filter(t => t.type === 'treasury_withdraw'),
  };

  const totals = {
      exchangeSdg: lists.exchangeSdg.reduce((s, t) => s + t.from_amount, 0),
      exchangeEgp: lists.exchangeEgp.reduce((s, t) => s + t.from_amount, 0),
      
      walletDep: lists.walletDep.reduce((s, t) => s + t.from_amount, 0),
      walletWith: lists.walletWith.reduce((s, t) => s + t.from_amount, 0),
      commissions: lists.commissions.reduce((s, t) => s + (t.commission || 0), 0),
      walletFeed: lists.walletFeed.reduce((s, t) => s + t.from_amount, 0),
      
      expEgp: lists.expEgp.reduce((s, t) => s + t.from_amount, 0),
      expSdg: lists.expSdg.reduce((s, t) => s + t.from_amount, 0),
      
      treasuryIn: lists.treasuryIn.reduce((s, t) => s + t.from_amount, 0),
      treasuryOut: lists.treasuryOut.reduce((s, t) => s + t.from_amount, 0),
  };

  const openDetail = (
      title: string, 
      transactions: Transaction[], 
      total: number, 
      currency: string, 
      theme: DetailViewData['theme'],
      valueKey: 'from_amount' | 'commission' | 'to_amount' = 'from_amount'
  ) => {
      setDetailView({ 
          title, 
          transactions, 
          total, 
          count: transactions.length,
          currency, 
          theme, 
          valueKey 
      });
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

  // --- REUSABLE CARD COMPONENT ---
  const SummaryCard = ({ 
    title, 
    amount, 
    count,
    currency, 
    icon: Icon, 
    theme, 
    onClick 
  }: { 
    title: string, 
    amount: number, 
    count: number,
    currency: string, 
    icon: any, 
    theme: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'indigo' | 'teal' | 'gray', 
    onClick: () => void 
  }) => {
      const themes = {
          blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' },
          green: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
          red: { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50' },
          orange: { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50' },
          purple: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50' },
          indigo: { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50' },
          teal: { bg: 'bg-teal-500', text: 'text-teal-600', light: 'bg-teal-50' },
          gray: { bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50' },
      };

      const t = themes[theme];

      return (
          <div 
            onClick={onClick}
            className="relative bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group overflow-hidden"
          >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.bg}`}></div>
              <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${t.light} ${t.text} transition-colors`}>
                      <Icon size={26} />
                  </div>
                  <div className="text-right">
                      <span className="text-xs font-bold text-gray-400 block mb-0.5">عدد العمليات</span>
                      <span className="text-sm font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">{count}</span>
                  </div>
              </div>
              
              <div>
                  <h4 className="text-gray-500 text-sm font-bold mb-1">{title}</h4>
                  <div className="flex items-baseline gap-1">
                      <p className="text-2xl font-black text-gray-800 tracking-tight" dir="ltr">
                          {amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <span className="text-xs font-bold text-gray-400">{currency}</span>
                  </div>
              </div>

              <div className="absolute right-0 bottom-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <Icon size={80} className={t.text} />
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6">
        {/* Controls Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                    <PieChart size={24} className="text-blue-600" /> تقارير الأداء المالي
                </h2>
                <div className="flex gap-2">
                     <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('breakdown')} 
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'breakdown' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                        >
                            <Activity size={16} className="inline-block ml-1"/> الملخص
                        </button>
                        <button 
                            onClick={() => setActiveTab('transactions')} 
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'transactions' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                        >
                            <ListFilter size={16} className="inline-block ml-1"/> السجل
                        </button>
                    </div>
                    <button 
                        onClick={handleExport}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-emerald-700 transition shadow-sm font-bold"
                    >
                        <Download size={18} /> تصدير
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-gray-50">
                {/* Search */}
                <div className="md:col-span-4 relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Search size={18} className="text-gray-400" />
                    </span>
                    <input 
                        type="text" 
                        placeholder="بحث (اسم، رقم، بيان...)" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition"
                    />
                </div>

                {/* Date Range */}
                <div className="md:col-span-5 flex gap-2 items-center bg-gray-50 p-1 rounded-xl border border-gray-200">
                    <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 bg-transparent border-none text-sm focus:ring-0 p-1"
                    />
                    <span className="text-gray-300">|</span>
                    <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 bg-transparent border-none text-sm focus:ring-0 p-1"
                    />
                </div>

                {/* Quick Filters */}
                <div className="md:col-span-3 flex gap-2 justify-end">
                    <button onClick={setFilterToday} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition">اليوم</button>
                    <button onClick={setFilterMonth} className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition">الشهر</button>
                    <button onClick={setFilterAll} className="flex-1 px-3 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-200 transition">الكل</button>
                </div>
            </div>
        </div>

        {/* ================= Detailed Breakdown Tab ================= */}
        {activeTab === 'breakdown' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 
                 {/* Section: Exchange */}
                 <div className="space-y-4">
                    <h3 className="text-gray-800 font-extrabold text-lg flex items-center gap-2">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><ArrowRightLeft size={20}/></div>
                        عمليات الصرف (Buying/Selling)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <SummaryCard 
                            title="شراء مصري (مقبوضات سوداني)" 
                            amount={totals.exchangeSdg} 
                            count={lists.exchangeSdg.length}
                            currency="SDG" 
                            icon={Banknote} 
                            theme="indigo"
                            onClick={() => openDetail('شراء مصري (وارد سوداني)', lists.exchangeSdg, totals.exchangeSdg, 'SDG', 'indigo')}
                        />
                         <SummaryCard 
                            title="شراء سوداني (مقبوضات مصري)" 
                            amount={totals.exchangeEgp} 
                            count={lists.exchangeEgp.length}
                            currency="EGP" 
                            icon={Banknote} 
                            theme="blue"
                            onClick={() => openDetail('شراء سوداني (وارد مصري)', lists.exchangeEgp, totals.exchangeEgp, 'EGP', 'blue')}
                        />
                    </div>
                 </div>

                 {/* Section: Wallets */}
                 <div className="space-y-4">
                    <h3 className="text-gray-800 font-extrabold text-lg flex items-center gap-2">
                        <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Wallet size={20}/></div>
                        المحافظ الإلكترونية
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <SummaryCard 
                            title="إيداعات للعملاء (شراء رصيد)" 
                            amount={totals.walletDep} 
                            count={lists.walletDep.length}
                            currency="EGP" 
                            icon={ArrowDownLeft} 
                            theme="green"
                            onClick={() => openDetail('إيداعات المحافظ (عملاء)', lists.walletDep, totals.walletDep, 'EGP', 'green')}
                        />
                        <SummaryCard 
                            title="سحوبات للعملاء (بيع رصيد)" 
                            amount={totals.walletWith} 
                            count={lists.walletWith.length}
                            currency="EGP" 
                            icon={ArrowUpRight} 
                            theme="red"
                            onClick={() => openDetail('سحوبات المحافظ (عملاء)', lists.walletWith, totals.walletWith, 'EGP', 'red')}
                        />
                        <SummaryCard 
                            title="صافي العمولات المكتسبة" 
                            amount={totals.commissions} 
                            count={lists.commissions.length}
                            currency="EGP" 
                            icon={Coins} 
                            theme="purple"
                            onClick={() => openDetail('عمولات المحافظ', lists.commissions, totals.commissions, 'EGP', 'purple', 'commission')}
                        />
                         <SummaryCard 
                            title="تغذية محافظ (سيولة داخلية)" 
                            amount={totals.walletFeed} 
                            count={lists.walletFeed.length}
                            currency="EGP" 
                            icon={Activity} 
                            theme="teal"
                            onClick={() => openDetail('تغذية المحافظ (سيولة)', lists.walletFeed, totals.walletFeed, 'EGP', 'teal')}
                        />
                    </div>
                 </div>

                 {/* Section: Expenses & Treasury */}
                 <div className="space-y-4">
                    <h3 className="text-gray-800 font-extrabold text-lg flex items-center gap-2">
                        <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><TrendingDown size={20}/></div>
                        المصروفات وحركة الخزينة
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        <SummaryCard 
                            title="المصروفات (مصري)" 
                            amount={totals.expEgp} 
                            count={lists.expEgp.length}
                            currency="EGP" 
                            icon={FileText} 
                            theme="orange"
                            onClick={() => openDetail('سجل المصروفات (EGP)', lists.expEgp, totals.expEgp, 'EGP', 'orange')}
                        />
                         <SummaryCard 
                            title="المصروفات (سوداني)" 
                            amount={totals.expSdg} 
                            count={lists.expSdg.length}
                            currency="SDG" 
                            icon={FileText} 
                            theme="orange"
                            onClick={() => openDetail('سجل المصروفات (SDG)', lists.expSdg, totals.expSdg, 'SDG', 'orange')}
                        />
                        <SummaryCard 
                            title="تغذية الخزينة (وارد)" 
                            amount={totals.treasuryIn} 
                            count={lists.treasuryIn.length}
                            currency="N/A" 
                            icon={ArrowDownCircle} 
                            theme="gray"
                            onClick={() => openDetail('عمليات إيداع الخزينة', lists.treasuryIn, totals.treasuryIn, 'EGP', 'gray')}
                        />
                         <SummaryCard 
                            title="سحب من الخزينة (صادر)" 
                            amount={totals.treasuryOut} 
                            count={lists.treasuryOut.length}
                            currency="N/A" 
                            icon={ArrowUpCircle} 
                            theme="gray"
                            onClick={() => openDetail('عمليات سحب الخزينة', lists.treasuryOut, totals.treasuryOut, 'EGP', 'gray')}
                        />
                    </div>
                 </div>
             </div>
        )}

        {/* ================= All Transactions Log ================= */}
        {activeTab === 'transactions' && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 animate-in fade-in duration-300">
                <div className="p-5 bg-white border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">سجل العمليات التفصيلي</h3>
                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{filtered.length} عملية</span>
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
                                <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
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
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getTxColor(t.type).replace('text-', 'border-').replace('bg-', 'bg-opacity-20 ')}`}>
                                            {getTxTypeLabel(t.type)}
                                        </span>
                                    </td>

                                    {/* Financial Details */}
                                    <td className="p-4">
                                        {t.type === 'exchange' ? (
                                            <div className="flex flex-col gap-1 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 w-6">من:</span>
                                                    <span className="font-bold text-gray-800 text-sm" dir="ltr">{Math.round(t.from_amount).toLocaleString()} {t.from_currency}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-400 w-6">إلى:</span>
                                                    <span className="font-bold text-blue-600 text-sm" dir="ltr">{Math.round(t.to_amount || 0).toLocaleString()} {t.to_currency}</span>
                                                </div>
                                                {t.rate && <span className="text-[10px] text-gray-400 bg-gray-50 px-1 rounded w-fit border">سعر: {t.rate}</span>}
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
                                                {t.commission ? <span className="text-[10px] text-green-600 bg-green-50 px-1 rounded w-fit">+ {t.commission} عمولة</span> : null}
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
                                            {t.receipt_number && <span className="font-mono bg-yellow-50 text-yellow-700 border border-yellow-100 px-2 py-0.5 rounded text-xs w-fit">#{t.receipt_number}</span>}
                                            {t.description && <span className="text-xs italic truncate max-w-[150px] text-gray-500">{t.description}</span>}
                                        </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setViewTransaction(t)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="عرض الإشعار">
                                                <Eye size={18} />
                                            </button>
                                            {currentUser?.role === 'admin' && (
                                                <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="حذف العملية">
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
            <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200 backdrop-blur-sm">
                <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-6 border border-gray-200">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 rounded-t-3xl">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="bg-blue-600 w-1 h-6 rounded-full"></div>
                                <h3 className="font-extrabold text-gray-800 text-xl">
                                    {detailView.title}
                                </h3>
                            </div>
                            <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
                                <Calendar size={14} />
                                الفترة: {new Date(startDate).toLocaleDateString('ar-EG')} - {new Date(endDate).toLocaleDateString('ar-EG')}
                            </p>
                        </div>
                        <button onClick={() => setDetailView(null)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition text-gray-400">
                            <X size={24} />
                        </button>
                    </div>
                    
                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-0">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-gray-50 text-gray-500 font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 text-xs uppercase tracking-wider">التاريخ</th>
                                    <th className="p-4 text-xs uppercase tracking-wider">الموظف</th>
                                    <th className="p-4 text-xs uppercase tracking-wider">البيان / الوصف</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-left">المبلغ ({detailView.currency})</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {detailView.transactions.map((t, idx) => {
                                    const amount = detailView.valueKey === 'commission' ? (t.commission || 0) : t.from_amount;
                                    return (
                                        <tr key={t.id} className={`hover:bg-blue-50/30 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                            <td className="p-4 whitespace-nowrap">
                                                <div className="font-bold text-gray-800">{new Date(t.created_at).toLocaleDateString('ar-EG')}</div>
                                                <div className="text-xs text-gray-400 font-mono mt-0.5">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</div>
                                            </td>
                                            <td className="p-4 font-medium text-gray-700">{getEmployeeName(t.employee_id)}</td>
                                            <td className="p-4">
                                                <div className="text-gray-700 font-medium text-sm">
                                                    {t.description || getTxTypeLabel(t.type)}
                                                </div>
                                                {t.receipt_number && (
                                                    <span className="inline-block mt-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                                        #{t.receipt_number}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-left">
                                                <span className="font-bold text-lg text-gray-900 font-mono" dir="ltr">
                                                    {Math.round(amount).toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                 {detailView.transactions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center p-16 text-gray-400">
                                            <div className="flex flex-col items-center gap-3">
                                                <Filter size={40} className="opacity-20"/>
                                                <span className="font-medium">لا توجد تفاصيل لهذه الفترة</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Footer */}
                    <div className="p-6 border-t bg-gray-50/80 rounded-b-3xl flex justify-between items-center backdrop-blur-sm">
                        <div className="text-gray-500 font-medium text-sm">
                            عدد العمليات: <span className="font-bold text-gray-800">{detailView.count}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-gray-600 font-bold">الإجمالي الكلي:</span>
                            <div className="text-2xl font-black text-blue-600 bg-white px-5 py-2 rounded-xl shadow-sm border border-blue-100">
                                {detailView.total.toLocaleString(undefined, { maximumFractionDigits: 0 })} 
                                <span className="text-sm font-bold text-gray-400 ml-2 uppercase">{detailView.currency}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Reports;
