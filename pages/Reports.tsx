import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { FileText, Download, Filter, Calculator, Search, Eye, Trash2, Calendar, ListFilter } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

type TabType = 'exchange' | 'treasury' | 'breakdown';

const Reports: React.FC = () => {
  const { transactions, currentUser, users, companies, deleteTransaction } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('breakdown');
  
  // Filtering States
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(1); // First day of current month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  // Helper to get employee name
  const getEmployeeName = (empId?: number) => {
      if (!empId) return '-';
      const user = users.find(u => u.id === empId);
      return user?.full_name || user?.username || 'Unknown';
  };

  const getCompany = (companyId: number) => {
      return companies.find(c => c.id === companyId);
  };

  const getEmployee = (empId?: number) => {
      return users.find(u => u.id === empId);
  };

  const handleDelete = async (id: number) => {
      if (window.confirm('هل أنت متأكد من حذف هذه العملية؟ سيتم استرداد المبلغ إلى خزينة الموظف.')) {
          try {
              await deleteTransaction(id);
          } catch (error) {
              console.error('Error deleting transaction:', error);
              alert('حدث خطأ أثناء حذف العملية');
          }
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
      // Set to a very early date to include all transactions
      setStartDate('2000-01-01');
      setEndDate(new Date().toISOString().split('T')[0]);
  };

  // Base Filter Logic
  const getFilteredTransactions = () => {
      return transactions.filter(t => {
        // 1. Role Check
        let roleMatch = false;
        if (currentUser?.role === 'super_admin') {
            roleMatch = true;
        } else if (currentUser?.role === 'admin') {
            roleMatch = t.company_id === currentUser.company_id;
        } else {
            roleMatch = t.employee_id === currentUser?.id;
        }

        if (!roleMatch) return false;

        // 2. Date Range Check
        const txDate = new Date(t.created_at);
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Set time for proper date comparison
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        if (txDate < start || txDate > end) return false;

        // 3. Search Query Check (Receipt Number or Description)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const receiptMatch = t.receipt_number?.toLowerCase().includes(query);
            const descriptionMatch = t.description?.toLowerCase().includes(query);
            const employeeMatch = getEmployeeName(t.employee_id).toLowerCase().includes(query);
            
            if (!receiptMatch && !descriptionMatch && !employeeMatch) return false;
        }

        // 4. Type Check
        if (selectedType !== 'all') {
            switch (selectedType) {
                case 'exchange':
                    if (t.type !== 'exchange') return false;
                    break;
                case 'e_wallet':
                    if (t.type !== 'e_wallet') return false;
                    break;
                case 'treasury':
                    if (!['treasury_feed', 'treasury_withdraw'].includes(t.type)) return false;
                    break;
                case 'wallet_feed':
                    if (t.type !== 'wallet_feed') return false;
                    break;
                default:
                    break;
            }
        }

        return true;
      });
  };

  const filtered = getFilteredTransactions();
  
  // Derived lists based on filtered data
  const exchangeTx = filtered.filter(t => t.type === 'exchange');
  const treasuryTx = filtered.filter(t => ['treasury_feed', 'treasury_withdraw'].includes(t.type));
  const walletTx = filtered.filter(t => t.type === 'e_wallet');
  const walletFeedTx = filtered.filter(t => t.type === 'wallet_feed');

  // --- STATS CALCULATION ---
  const stats = {
      exchangeCount: exchangeTx.length,
      receivedSdg: exchangeTx.filter(t => t.from_currency === 'SDG').reduce((sum, t) => sum + (t.from_amount || 0), 0),
      receivedEgp: exchangeTx.filter(t => t.from_currency === 'EGP').reduce((sum, t) => sum + (t.from_amount || 0), 0),
      walletCommission: walletTx.reduce((sum, t) => sum + (t.commission || 0), 0),
      treasuryFeed: treasuryTx.filter(t => t.type === 'treasury_feed').reduce((sum, t) => sum + (t.from_amount || 0), 0),
      treasuryWithdraw: treasuryTx.filter(t => t.type === 'treasury_withdraw').reduce((sum, t) => sum + (t.from_amount || 0), 0),
      walletFeedAmount: walletFeedTx.reduce((sum, t) => sum + (t.from_amount || 0), 0),
  };

  // Format currency function
  const formatCurrency = (amount: number, currency: string) => {
    return `${amount?.toLocaleString() || '0'} ${currency}`;
  };

  const handleExport = () => {
    try {
        const headers = ["ID", "التاريخ", "الوقت", "الموظف", "النوع", "من", "المبلغ", "إلى", "المبلغ", "السعر", "العمولة", "رقم الإشعار", "الوصف"];
        
        // Export based on active tab or all filtered
        let dataToExport = filtered;
        if (activeTab === 'exchange') dataToExport = exchangeTx;
        else if (activeTab === 'treasury') dataToExport = treasuryTx;

        const rows = dataToExport.map(t => [
            t.id,
            new Date(t.created_at).toLocaleDateString('ar-EG'),
            new Date(t.created_at).toLocaleTimeString('ar-EG'),
            getEmployeeName(t.employee_id),
            getTransactionTypeLabel(t.type),
            t.from_currency || '-',
            t.from_amount || 0,
            t.to_currency || '-',
            t.to_amount || '-',
            t.rate || '-',
            t.commission || 0,
            t.receipt_number || '-',
            t.description || '-'
        ]);

        const csvContent = [
            headers.join(","), 
            ...rows.map(row => row.map(cell => `"${cell}"`).join(",")) // Wrap cells in quotes to handle commas
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `report_${startDate}_to_${endDate}_${activeTab}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting data:', error);
        alert('حدث خطأ أثناء تصدير البيانات');
    }
  };

  // Helper function to get transaction type label
  const getTransactionTypeLabel = (type: string) => {
    const typeLabels: { [key: string]: string } = {
        'exchange': 'صرف عملة',
        'e_wallet': 'محفظة إلكترونية',
        'treasury_feed': 'إيداع خزينة',
        'treasury_withdraw': 'سحب من خزينة',
        'wallet_feed': 'تغذية محفظة'
    };
    return typeLabels[type] || type;
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setFilterMonth(); // Reset to current month
  };

  return (
    <div className="space-y-6">
        {/* Controls Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <Filter size={20} className="text-blue-600" /> تصفية البيانات
                </h2>
                <div className="flex gap-2">
                    <button 
                        onClick={resetFilters}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-600 transition shadow-sm"
                    >
                        إعادة التعيين
                    </button>
                    <button 
                        onClick={handleExport}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-green-700 transition shadow-sm"
                    >
                        <Download size={16} /> Excel
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
                    placeholder="بحث برقم الإشعار أو الوصف أو الموظف..." 
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
                                max={endDate}
                            />
                        </div>
                        <span className="text-gray-400">إلى</span>
                        <div className="flex-1">
                            <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-gray-50 text-sm"
                                min={startDate}
                                max={new Date().toISOString().split('T')[0]}
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
            <button onClick={() => setActiveTab('treasury')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition ${activeTab === 'treasury' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>سجل الخزينة</button>
        </div>

        {/* Detailed Breakdown Tab */}
        {activeTab === 'breakdown' && (
             <div className="space-y-4 animate-in fade-in duration-300">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <FileText size={24} className="text-blue-600" />
                        ملخص الفترة المحددة
                    </h3>
                    
                    <div className="space-y-6">
                        {/* SDG Section */}
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <h4 className="font-bold text-orange-800 mb-2">مقبوضات العملة السودانية (SDG)</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">إجمالي ما تم استلامه:</span>
                                <span className="text-2xl font-bold text-orange-700" dir="ltr">
                                    {formatCurrency(stats.receivedSdg, 'SDG')}
                                </span>
                            </div>
                        </div>

                        {/* EGP Section */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="font-bold text-blue-800 mb-2">مقبوضات العملة المصرية (EGP)</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">إجمالي ما تم استلامه:</span>
                                <span className="text-2xl font-bold text-blue-700" dir="ltr">
                                    {formatCurrency(stats.receivedEgp, 'EGP')}
                                </span>
                            </div>
                        </div>

                        {/* Commission Section */}
                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                            <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                                <Calculator size={18} />
                                عمولات المحفظة الإلكترونية
                            </h4>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">صافي العمولات:</span>
                                <span className="text-2xl font-bold text-green-700" dir="ltr">
                                    {formatCurrency(stats.walletCommission, 'EGP')}
                                </span>
                            </div>
                        </div>

                        {/* Treasury Section */}
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                            <h4 className="font-bold text-purple-800 mb-2">حركة الخزينة</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <div className="text-sm text-gray-600">إجمالي الإيداعات</div>
                                    <div className="text-lg font-bold text-green-700" dir="ltr">
                                        {formatCurrency(stats.treasuryFeed, 'EGP')}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-sm text-gray-600">إجمالي السحوبات</div>
                                    <div className="text-lg font-bold text-red-700" dir="ltr">
                                        {formatCurrency(stats.treasuryWithdraw, 'EGP')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Wallet Feed Section */}
                        <div className="bg-cyan-50 p-4 rounded-xl border border-cyan-100">
                            <h4 className="font-bold text-cyan-800 mb-2">تغذية المحافظ</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">إجمالي التغذية:</span>
                                <span className="text-2xl font-bold text-cyan-700" dir="ltr">
                                    {formatCurrency(stats.walletFeedAmount, 'EGP')}
                                </span>
                            </div>
                        </div>

                        <div className="pt-4 border-t text-sm text-gray-500 text-center flex flex-wrap justify-around gap-2">
                             <span>عدد عمليات الصرف: <b>{stats.exchangeCount}</b></span>
                             <span>|</span>
                             <span>عدد عمليات المحفظة: <b>{walletTx.length}</b></span>
                             <span>|</span>
                             <span>عدد حركات الخزينة: <b>{treasuryTx.length}</b></span>
                             <span>|</span>
                             <span>عدد عمليات التغذية: <b>{walletFeedTx.length}</b></span>
                        </div>
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
                                <th className="p-3">السعر</th>
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
                                    <td className="p-3 font-bold text-green-700" dir="ltr">
                                        {formatCurrency(t.from_amount || 0, t.from_currency || '')}
                                    </td>
                                    <td className="p-3 text-red-600" dir="ltr">
                                        {t.to_amount ? formatCurrency(t.to_amount, t.to_currency || '') : '-'}
                                    </td>
                                    <td className="p-3 text-gray-500" dir="ltr">
                                        {t.rate ? t.rate.toLocaleString() : '-'}
                                    </td>
                                    <td className="p-3 text-xs text-gray-500 font-mono">{t.receipt_number || '-'}</td>
                                    <td className="p-3 flex items-center gap-2">
                                        <button 
                                            onClick={() => setViewTransaction(t)} 
                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition"
                                            title="عرض التفاصيل"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                                            <button 
                                                onClick={() => handleDelete(t.id)} 
                                                className="text-red-600 hover:bg-red-50 p-2 rounded-full transition" 
                                                title="حذف واسترداد"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {exchangeTx.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-400">
                                        لا توجد عمليات صرف مطابقة للفلتر
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Treasury Log */}
        {activeTab === 'treasury' && (
             <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 animate-in fade-in duration-300">
                 <div className="p-4 bg-gray-50 font-bold border-b text-sm text-gray-700 flex justify-between">
                    <span>سجل حركة الخزينة</span>
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
                                             t.type === 'treasury_feed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                         }`}>
                                             {t.type === 'treasury_feed' ? 'إيداع/تغذية' : 'سحب/استرداد'}
                                         </span>
                                     </td>
                                     <td className="p-3 font-bold" dir="ltr">
                                         {formatCurrency(t.from_amount || 0, t.from_currency || 'EGP')}
                                     </td>
                                     <td className="p-3 text-xs text-gray-500 max-w-xs truncate" title={t.description}>
                                         {t.description || '-'}
                                     </td>
                                     <td className="p-3 flex items-center gap-2">
                                         <button 
                                             onClick={() => setViewTransaction(t)} 
                                             className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition"
                                             title="عرض التفاصيل"
                                         >
                                             <Eye size={18} />
                                         </button>
                                         {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin') && (
                                             <button 
                                                 onClick={() => handleDelete(t.id)} 
                                                 className="text-red-600 hover:bg-red-50 p-2 rounded-full transition" 
                                                 title="حذف واسترداد"
                                             >
                                                 <Trash2 size={18} />
                                             </button>
                                         )}
                                     </td>
                                 </tr>
                             ))}
                             {treasuryTx.length === 0 && (
                                 <tr>
                                     <td colSpan={6} className="p-8 text-center text-gray-400">
                                         لا توجد حركات خزينة مطابقة للفلتر
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
    </div>
  );
};

export default Reports;
