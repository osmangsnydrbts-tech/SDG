
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { FileText, Download, Filter, Calculator, Search, Eye, Trash2, Calendar, ListFilter, TrendingDown, TrendingUp, AlertOctagon } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

type TabType = 'exchange' | 'treasury' | 'breakdown';

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
      if (window.confirm('هل أنت متأكد من حذف هذه العملية؟ سيتم عكس التأثير المالي على الخزينة.')) {
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

        // 2. Search Query Check (Receipt Number or Description)
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const receiptMatch = t.receipt_number?.toLowerCase().includes(query);
            const descMatch = t.description?.toLowerCase().includes(query);
            if (!receiptMatch && !descMatch) return false;
        }

        // 3. Date Range Check
        const txDate = new Date(t.created_at).setHours(0,0,0,0);
        const start = new Date(startDate).setHours(0,0,0,0);
        const end = new Date(endDate).setHours(23,59,59,999); // End of the day

        if (txDate < start || txDate > end) return false;

        // 4. Type Check
        if (selectedType !== 'all') {
            // Grouping types for cleaner filtering
            if (selectedType === 'exchange' && t.type !== 'exchange') return false;
            
            if (selectedType === 'e_wallet') {
                if (t.type !== 'e_wallet' && t.type !== 'wallet_deposit' && t.type !== 'wallet_withdrawal') return false;
            }

            if (selectedType === 'treasury' && !['treasury_feed', 'treasury_withdraw'].includes(t.type)) return false;
            if (selectedType === 'expense' && t.type !== 'expense') return false;
            if (selectedType === 'wallet_feed' && t.type !== 'wallet_feed') return false;
        }

        return true;
      });
  };

  const filtered = getFilteredTransactions();
  
  // Derived lists based on filtered data
  const exchangeTx = filtered.filter(t => t.type === 'exchange');
  const treasuryTx = filtered.filter(t => ['treasury_feed', 'treasury_withdraw', 'expense'].includes(t.type));
  const walletTx = filtered.filter(t => ['e_wallet', 'wallet_deposit', 'wallet_withdrawal', 'wallet_feed'].includes(t.type));

  // --- STATS CALCULATION ---
  const stats = {
      exchangeCount: exchangeTx.length,
      // Buying SDG (Customer gave SDG, took EGP)
      receivedSdg: exchangeTx.filter(t => t.from_currency === 'SDG').reduce((sum, t) => sum + t.from_amount, 0),
      // Buying EGP (Customer gave EGP, took SDG)
      receivedEgp: exchangeTx.filter(t => t.from_currency === 'EGP').reduce((sum, t) => sum + t.from_amount, 0),
      
      // Commissions
      walletCommission: walletTx.reduce((sum, t) => sum + (t.commission || 0), 0),

      // Expenses
      expensesEgp: filtered.filter(t => t.type === 'expense' && t.from_currency === 'EGP').reduce((sum, t) => sum + t.from_amount, 0),
      expensesSdg: filtered.filter(t => t.type === 'expense' && t.from_currency === 'SDG').reduce((sum, t) => sum + t.from_amount, 0),
  };

  const handleExport = () => {
    const headers = ["ID", "التاريخ", "الموظف", "النوع", "من", "المبلغ", "إلى", "المبلغ", "السعر", "العمولة", "الوصف", "رقم الإشعار"];
    
    // Export based on active tab or all filtered
    const dataToExport = activeTab === 'exchange' ? exchangeTx : activeTab === 'treasury' ? treasuryTx : filtered;

    const rows = dataToExport.map(t => [
        t.id,
        new Date(t.created_at).toLocaleDateString('ar-EG') + ' ' + new Date(t.created_at).toLocaleTimeString('ar-EG'),
        getEmployeeName(t.employee_id),
        t.type,
        t.from_currency || '-',
        Math.round(t.from_amount),
        t.to_currency || '-',
        t.to_amount ? Math.round(t.to_amount) : '-',
        t.rate || '-',
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
    link.setAttribute("download", `report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTxTypeLabel = (type: string) => {
      switch(type) {
          case 'exchange': return 'صرف عملة';
          case 'expense': return 'منصرفات';
          case 'treasury_feed': return 'تغذية خزينة';
          case 'treasury_withdraw': return 'سحب خزينة';
          case 'wallet_deposit': return 'إيداع محفظة';
          case 'wallet_withdrawal': return 'سحب محفظة';
          case 'wallet_feed': return 'تغذية محفظة';
          default: return type;
      }
  };

  return (
    <div className="space-y-6">
        {/* Controls Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <Filter size={20} className="text-blue-600" /> تصفية البيانات
                </h2>
                <button 
                    onClick={handleExport}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-green-700 transition shadow-sm"
                >
                    <Download size={16} /> Excel
                </button>
            </div>
            
            {/* Search Box */}
            <div className="relative">
                <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Search size={18} className="text-gray-400" />
                </span>
                <input 
                    type="text" 
                    placeholder="بحث برقم الإشعار أو الوصف..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition"
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
                                className="w-full p-2 border rounded-lg bg-gray-50 text-sm"
                            />
                        </div>
                        <span className="text-gray-400">إلى</span>
                        <div className="flex-1">
                            <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-gray-50 text-sm"
                            />
                        </div>
                    </div>
                    {/* Quick Date Buttons */}
                    <div className="flex gap-2 text-xs">
                        <button onClick={setFilterToday} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">اليوم</button>
                        <button onClick={setFilterMonth} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">هذا الشهر</button>
                        <button onClick={setFilterAll} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200">الكل</button>
                    </div>
                </div>

                {/* Transaction Type */}
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><ListFilter size={14}/> نوع العملية</label>
                    <select 
                        value={selectedType} 
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-gray-50 text-sm h-[38px]"
                    >
                        <option value="all">كل العمليات</option>
                        <option value="exchange">صرف عملة</option>
                        <option value="expense">منصرفات</option>
                        <option value="e_wallet">محفظة إلكترونية</option>
                        <option value="treasury">حركة خزينة (إيداع/سحب)</option>
                        <option value="wallet_feed">تغذية محفظة</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 overflow-x-auto">
            <button onClick={() => setActiveTab('breakdown')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition ${activeTab === 'breakdown' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>تقرير تفصيلي</button>
            <button onClick={() => setActiveTab('exchange')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition ${activeTab === 'exchange' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>سجل الصرف</button>
            <button onClick={() => setActiveTab('treasury')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition ${activeTab === 'treasury' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>سجل الخزينة / المنصرفات</button>
        </div>

        {/* Detailed Breakdown Tab */}
        {activeTab === 'breakdown' && (
             <div className="space-y-4 animate-in fade-in duration-300">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <FileText size={24} className="text-blue-600" />
                        ملخص الفترة المحددة
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* SDG Intake */}
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                <TrendingDown size={18}/> مقبوضات سوداني (شراء EGP)
                            </h4>
                            <div className="text-2xl font-bold text-orange-700" dir="ltr">{stats.receivedSdg.toLocaleString(undefined, { maximumFractionDigits: 0 })} SDG</div>
                        </div>

                        {/* EGP Intake */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                <TrendingDown size={18}/> مقبوضات مصري (شراء SDG)
                            </h4>
                            <div className="text-2xl font-bold text-blue-700" dir="ltr">{stats.receivedEgp.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</div>
                        </div>

                        {/* Expenses */}
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 md:col-span-2">
                            <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                                <TrendingUp size={18}/> إجمالي المنصرفات (Expenses)
                            </h4>
                            <div className="flex gap-8">
                                <div>
                                    <span className="text-xs text-red-500 block">منصرفات مصري</span>
                                    <span className="text-xl font-bold text-red-700" dir="ltr">{stats.expensesEgp.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</span>
                                </div>
                                <div>
                                    <span className="text-xs text-red-500 block">منصرفات سوداني</span>
                                    <span className="text-xl font-bold text-red-700" dir="ltr">{stats.expensesSdg.toLocaleString(undefined, { maximumFractionDigits: 0 })} SDG</span>
                                </div>
                            </div>
                        </div>

                        {/* Commission Section */}
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 md:col-span-2">
                            <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                                <Calculator size={18} />
                                صافي عمولات المحفظة الإلكترونية
                            </h4>
                            <div className="text-2xl font-bold text-green-700" dir="ltr">{stats.walletCommission.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</div>
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t text-sm text-gray-500 text-center flex justify-around">
                             <span>عدد عمليات الصرف: <b>{stats.exchangeCount}</b></span>
                             <span>|</span>
                             <span>عدد عمليات المحفظة: <b>{walletTx.length}</b></span>
                    </div>
                 </div>
             </div>
        )}

        {/* Exchange Log */}
        {activeTab === 'exchange' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-in fade-in duration-300">
                <div className="p-4 bg-gray-50 font-bold border-b text-sm text-gray-700 flex justify-between">
                    <span>سجل عمليات الصرف</span>
                    <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 rounded border">العدد: {exchangeTx.length}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="p-3">الوقت</th>
                                <th className="p-3">الموظف</th>
                                <th className="p-3">من (استلام)</th>
                                <th className="p-3">إلى (تسليم)</th>
                                <th className="p-3">الإشعار</th>
                                <th className="p-3">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {exchangeTx.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-600">
                                        <div className="font-bold">{new Date(t.created_at).toLocaleDateString('ar-EG')}</div>
                                        <div className="text-xs">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</div>
                                    </td>
                                    <td className="p-3 font-medium">{getEmployeeName(t.employee_id)}</td>
                                    <td className="p-3 font-bold text-green-700" dir="ltr">{t.from_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} {t.from_currency}</td>
                                    <td className="p-3 text-red-600" dir="ltr">{t.to_amount?.toLocaleString(undefined, { maximumFractionDigits: 0 })} {t.to_currency}</td>
                                    <td className="p-3 text-xs text-gray-500 font-mono">{t.receipt_number || '-'}</td>
                                    <td className="p-3 flex items-center gap-2">
                                        <button onClick={() => setViewTransaction(t)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full">
                                            <Eye size={18} />
                                        </button>
                                        {currentUser?.role === 'admin' && (
                                            <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-full" title="حذف واسترداد">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {exchangeTx.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد عمليات مطابقة للفلتر</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Treasury Log (Including Expenses) */}
        {activeTab === 'treasury' && (
             <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-in fade-in duration-300">
             <div className="p-4 bg-gray-50 font-bold border-b text-sm text-gray-700 flex justify-between">
                <span>سجل حركة الخزينة والمنصرفات</span>
                <span className="text-xs font-normal text-gray-500 bg-white px-2 py-1 rounded border">العدد: {treasuryTx.length}</span>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                     <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                         <tr>
                             <th className="p-3">الوقت</th>
                             <th className="p-3">الموظف</th>
                             <th className="p-3">النوع</th>
                             <th className="p-3">المبلغ</th>
                             <th className="p-3">الوصف</th>
                             <th className="p-3">إجراءات</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y">
                         {treasuryTx.map(t => (
                             <tr key={t.id} className="hover:bg-gray-50">
                                 <td className="p-3 text-gray-600">
                                     <div className="font-bold">{new Date(t.created_at).toLocaleDateString('ar-EG')}</div>
                                     <div className="text-xs">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</div>
                                 </td>
                                 <td className="p-3 font-medium">{getEmployeeName(t.employee_id)}</td>
                                 <td className="p-3">
                                     <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        t.type === 'treasury_feed' ? 'bg-green-100 text-green-700' : 
                                        t.type === 'expense' ? 'bg-orange-100 text-orange-700' :
                                        'bg-red-100 text-red-700'
                                     }`}>
                                         {getTxTypeLabel(t.type)}
                                     </span>
                                 </td>
                                 <td className={`p-3 font-bold ${t.type === 'expense' || t.type === 'treasury_withdraw' ? 'text-red-600' : 'text-green-600'}`} dir="ltr">
                                    {t.type === 'expense' || t.type === 'treasury_withdraw' ? '-' : '+'}
                                    {t.from_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} {t.from_currency}
                                 </td>
                                 <td className="p-3 text-xs text-gray-500">{t.description || '-'}</td>
                                 <td className="p-3 flex items-center gap-2">
                                     {t.type === 'expense' && (
                                         <button onClick={() => setViewTransaction(t)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full">
                                            <Eye size={18} />
                                         </button>
                                     )}
                                     {currentUser?.role === 'admin' && (
                                         <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-full" title="حذف">
                                             <Trash2 size={18} />
                                         </button>
                                     )}
                                 </td>
                             </tr>
                         ))}
                         {treasuryTx.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد حركات مطابقة للفلتر</td></tr>}
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
    </div>
  );
};

export default Reports;
