
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Download, Filter, Search, Eye, Trash2, Calendar, 
  ArrowRightLeft, ArrowUpRight, ArrowDownLeft,
  Banknote, ArrowUpCircle, ArrowDownCircle,
  Users, Wallet, FileMinus, XCircle
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

const Reports: React.FC = () => {
  const { transactions, currentUser, users, companies, deleteTransaction } = useStore();
  
  // Filtering States
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // Card Filter State
  const [activeCardFilter, setActiveCardFilter] = useState<'ALL' | 'EGP' | 'SDG' | 'EXPENSE' | 'COMMISSION'>('ALL');
  
  // Modals
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  // --- Helpers ---
  const getEmployeeName = (empId?: number) => {
      if (!empId) return '-';
      return users.find(u => u.id === empId)?.full_name || 'مستخدم محذوف';
  };

  const getCompany = (companyId: number) => companies.find(c => c.id === companyId);
  const getEmployee = (empId?: number) => users.find(u => u.id === empId);

  const handleDelete = async (id: number) => {
      if (window.confirm('هل أنت متأكد من حذف هذه العملية؟ سيتم عكس التأثير المالي على الخزينة.')) {
          await deleteTransaction(id);
      }
  };

  const setFilterToday = () => {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
  };

  // --- Base Filtering Logic (Date, Search, Employee) ---
  const baseFilteredTransactions = useMemo(() => {
    return transactions.filter(t => {
        // 1. Permission / Scope Check
        let roleMatch = false;
        if (currentUser?.role === 'super_admin') roleMatch = true;
        else if (currentUser?.role === 'admin') roleMatch = t.company_id === currentUser.company_id;
        else roleMatch = t.employee_id === currentUser?.id;

        if (!roleMatch) return false;

        // 2. Date Range
        const txDate = new Date(t.created_at).setHours(0,0,0,0);
        const start = new Date(startDate).setHours(0,0,0,0);
        const end = new Date(endDate).setHours(23,59,59,999);
        if (txDate < start || txDate > end) return false;

        // 3. Employee Filter
        if (selectedEmployeeId !== 'all') {
            if (t.employee_id !== parseInt(selectedEmployeeId)) return false;
        }

        // 4. Transaction Type Filter (Dropdown)
        if (selectedType !== 'all') {
            if (selectedType === 'exchange' && t.type !== 'exchange') return false;
            if (selectedType === 'wallet' && !['wallet_deposit', 'wallet_withdrawal', 'wallet_feed'].includes(t.type)) return false;
            if (selectedType === 'expense' && t.type !== 'expense') return false;
            if (selectedType === 'treasury' && !['treasury_feed', 'treasury_withdraw'].includes(t.type)) return false;
        }

        // 5. Text Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const receiptMatch = t.receipt_number?.toLowerCase().includes(query);
            const descMatch = t.description?.toLowerCase().includes(query);
            const empName = getEmployeeName(t.employee_id).toLowerCase();
            
            return receiptMatch || descMatch || empName.includes(query);
        }

        return true;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [transactions, currentUser, startDate, endDate, selectedEmployeeId, selectedType, searchQuery, users]);

  // --- Stats Calculation (Based on Base Filter) ---
  const stats = useMemo(() => {
      let egpIn = 0;
      let egpOut = 0;
      let sdgIn = 0;
      let sdgOut = 0;
      let commissions = 0;
      let expenseEgp = 0;
      let expenseSdg = 0;

      baseFilteredTransactions.forEach(t => {
          const amount = Math.round(t.from_amount);
          
          if (t.type === 'exchange') {
              if (t.from_currency === 'SDG') { // Buying EGP
                  sdgIn += amount;
                  egpOut += Math.round(t.to_amount || 0);
              } else { // Buying SDG
                  egpIn += amount;
                  sdgOut += Math.round(t.to_amount || 0);
              }
          }
          else if (t.type === 'expense') {
              if (t.from_currency === 'EGP') {
                  egpOut += amount;
                  expenseEgp += amount;
              } else {
                  sdgOut += amount;
                  expenseSdg += amount;
              }
          }
          else if (t.type === 'wallet_deposit') { 
              egpOut += amount; 
              if (t.commission) commissions += t.commission;
          }
          else if (t.type === 'wallet_withdrawal') { 
              egpIn += Math.round(t.to_amount || amount); 
              if (t.commission) commissions += t.commission;
          }
          else if (t.type === 'wallet_feed') {
               egpOut += amount; 
          }
          else if (t.type === 'treasury_feed') {
              if (t.from_currency === 'EGP') egpIn += amount;
              else sdgIn += amount;
          }
          else if (t.type === 'treasury_withdraw') {
              if (t.from_currency === 'EGP') egpOut += amount;
              else sdgOut += amount;
          }
      });

      return {
          egpIn, egpOut, egpNet: egpIn - egpOut,
          sdgIn, sdgOut, sdgNet: sdgIn - sdgOut,
          commissions,
          expenseEgp, expenseSdg
      };
  }, [baseFilteredTransactions]);

  // --- Final List Filter (Based on Clicked Card) ---
  const displayTransactions = useMemo(() => {
      if (activeCardFilter === 'ALL') return baseFilteredTransactions;

      return baseFilteredTransactions.filter(t => {
          if (activeCardFilter === 'EXPENSE') return t.type === 'expense';
          if (activeCardFilter === 'COMMISSION') return (t.commission || 0) > 0;
          
          // Currency Filters
          if (activeCardFilter === 'EGP') {
              // Show transaction if it affects EGP
              return t.from_currency === 'EGP' || t.to_currency === 'EGP' || 
                     ['wallet_deposit', 'wallet_withdrawal', 'wallet_feed'].includes(t.type);
          }
          if (activeCardFilter === 'SDG') {
              // Show transaction if it affects SDG
              return t.from_currency === 'SDG' || t.to_currency === 'SDG';
          }
          return true;
      });
  }, [baseFilteredTransactions, activeCardFilter]);


  // --- Export Function ---
  const handleExport = () => {
    const headers = ["التاريخ", "الموظف", "نوع العملية", "المبلغ", "العملة", "التفاصيل", "الإشعار"];
    
    const rows = displayTransactions.map(t => [
        new Date(t.created_at).toLocaleDateString('ar-EG'),
        getEmployeeName(t.employee_id),
        getTxTypeLabel(t.type),
        Math.round(t.from_amount),
        t.from_currency,
        t.description || '-',
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
    link.setAttribute("download", `Report_${startDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTxTypeLabel = (type: string) => {
      switch(type) {
          case 'exchange': return 'صرف';
          case 'expense': return 'مصروفات';
          case 'treasury_feed': return 'إيداع خزينة';
          case 'treasury_withdraw': return 'سحب خزينة';
          case 'wallet_deposit': return 'إيداع محفظة';
          case 'wallet_withdrawal': return 'سحب محفظة';
          case 'wallet_feed': return 'تغذية محفظة';
          default: return type;
      }
  };

  const getTxColor = (type: string) => {
       if (type === 'exchange') return 'text-blue-600 bg-blue-50';
       if (type === 'expense') return 'text-orange-600 bg-orange-50';
       if (type.includes('wallet')) return 'text-purple-600 bg-purple-50';
       if (type.includes('treasury')) return 'text-gray-600 bg-gray-50';
       return 'text-gray-600 bg-gray-50';
  };

  const companyEmployees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee');

  // Helper for Card Selection Style
  const getCardStyle = (filterType: typeof activeCardFilter, baseColorClass: string, activeColorClass: string) => {
      const isActive = activeCardFilter === filterType;
      return `relative cursor-pointer transition-all duration-300 rounded-xl shadow-sm p-5 border-2 ${isActive ? `${activeColorClass} scale-[1.02] shadow-md` : `${baseColorClass} hover:bg-gray-50`}`;
  };

  return (
    <div className="space-y-6">
        {/* === Filters Bar === */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                 <div className="flex items-center bg-gray-50 rounded-lg border px-2 py-1">
                    <Calendar size={16} className="text-gray-400 ml-2" />
                    <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent border-none text-sm focus:ring-0 w-28 font-medium"
                    />
                    <span className="text-gray-300 mx-1">-</span>
                    <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent border-none text-sm focus:ring-0 w-28 font-medium"
                    />
                 </div>
                 <button onClick={setFilterToday} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">اليوم</button>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                 <select 
                    value={selectedType} 
                    onChange={e => setSelectedType(e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 font-medium"
                 >
                     <option value="all">كل العمليات</option>
                     <option value="exchange">الصرف</option>
                     <option value="wallet">المحافظ</option>
                     <option value="expense">المصروفات</option>
                 </select>
                 
                 {currentUser?.role !== 'employee' && (
                    <select 
                        value={selectedEmployeeId} 
                        onChange={e => setSelectedEmployeeId(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                        <option value="all">كل الموظفين</option>
                        {companyEmployees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                        ))}
                    </select>
                 )}
            </div>
        </div>

        {/* === Interactive Summary Cards === */}
        {activeCardFilter !== 'ALL' && (
            <div className="flex justify-center -mb-2">
                 <button 
                    onClick={() => setActiveCardFilter('ALL')}
                    className="flex items-center gap-1 text-xs bg-gray-800 text-white px-3 py-1 rounded-full hover:bg-black transition animate-in fade-in"
                 >
                    <XCircle size={14}/> إلغاء التصفية (عرض الكل)
                 </button>
            </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* EGP Card */}
            <div 
                onClick={() => setActiveCardFilter('EGP')}
                className={`bg-white ${getCardStyle('EGP', 'border-transparent border-r-4 border-r-blue-500', 'border-blue-500 bg-blue-50')}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-500 text-xs font-bold">صافي المصري</span>
                    <Banknote size={18} className="text-blue-500"/>
                </div>
                <div className="text-xl lg:text-2xl font-black text-gray-800 mb-2" dir="ltr">
                    {stats.egpNet.toLocaleString()}
                </div>
                <div className="flex gap-4 text-[10px] lg:text-xs">
                    <span className="text-green-600 flex items-center gap-1"><ArrowDownCircle size={12}/> {stats.egpIn.toLocaleString()}</span>
                    <span className="text-red-500 flex items-center gap-1"><ArrowUpCircle size={12}/> {stats.egpOut.toLocaleString()}</span>
                </div>
            </div>

            {/* SDG Card */}
            <div 
                onClick={() => setActiveCardFilter('SDG')}
                className={`bg-white ${getCardStyle('SDG', 'border-transparent border-r-4 border-r-emerald-500', 'border-emerald-500 bg-emerald-50')}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <span className="text-gray-500 text-xs font-bold">صافي السوداني</span>
                    <Banknote size={18} className="text-emerald-500"/>
                </div>
                <div className="text-xl lg:text-2xl font-black text-gray-800 mb-2" dir="ltr">
                    {stats.sdgNet.toLocaleString()}
                </div>
                <div className="flex gap-4 text-[10px] lg:text-xs">
                    <span className="text-green-600 flex items-center gap-1"><ArrowDownCircle size={12}/> {stats.sdgIn.toLocaleString()}</span>
                    <span className="text-red-500 flex items-center gap-1"><ArrowUpCircle size={12}/> {stats.sdgOut.toLocaleString()}</span>
                </div>
            </div>

            {/* Expenses Card */}
            <div 
                onClick={() => setActiveCardFilter('EXPENSE')}
                className={`bg-white ${getCardStyle('EXPENSE', 'border-transparent border-r-4 border-r-orange-500', 'border-orange-500 bg-orange-50')}`}
            >
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-500 text-xs font-bold">المنصرفات</span>
                    <FileMinus size={18} className="text-orange-500"/>
                 </div>
                 <div className="space-y-1 mt-2">
                     <div className="flex justify-between items-end">
                         <span className="text-sm font-bold text-gray-700">{stats.expenseEgp.toLocaleString()}</span>
                         <span className="text-[10px] text-gray-400">EGP</span>
                     </div>
                     <div className="flex justify-between items-end border-t border-dashed border-gray-200 pt-1">
                         <span className="text-sm font-bold text-gray-700">{stats.expenseSdg.toLocaleString()}</span>
                         <span className="text-[10px] text-gray-400">SDG</span>
                     </div>
                 </div>
            </div>

            {/* Commissions Card */}
            <div 
                onClick={() => setActiveCardFilter('COMMISSION')}
                className={`bg-white ${getCardStyle('COMMISSION', 'border-transparent border-r-4 border-r-purple-500', 'border-purple-500 bg-purple-50')}`}
            >
                 <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-500 text-xs font-bold">أرباح العمولات</span>
                    <Wallet size={18} className="text-purple-500"/>
                 </div>
                 <div className="text-xl lg:text-2xl font-black text-purple-700 mt-2" dir="ltr">
                    {stats.commissions.toLocaleString()} <span className="text-xs font-medium text-gray-400">EGP</span>
                 </div>
            </div>
        </div>

        {/* === Transactions List === */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-2">
                     <Search size={18} className="text-gray-400" />
                     <input 
                        type="text" 
                        placeholder="بحث..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none text-sm focus:ring-0 w-32 md:w-48 placeholder-gray-400"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-400 hidden md:block">
                        عدد العمليات: <span className="font-bold text-gray-700">{displayTransactions.length}</span>
                    </div>
                    <button 
                        onClick={handleExport}
                        className="text-gray-600 hover:text-blue-600 transition"
                        title="تصدير Excel"
                    >
                        <Download size={20} />
                    </button>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 text-gray-500 font-bold text-xs">
                        <tr>
                            <th className="p-3">التاريخ</th>
                            <th className="p-3">النوع</th>
                            <th className="p-3">المبلغ</th>
                            <th className="p-3">الموظف / الوصف</th>
                            <th className="p-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {displayTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50/80 transition">
                                <td className="p-3 text-gray-600 whitespace-nowrap">
                                    {new Date(t.created_at).toLocaleDateString('ar-EG')}
                                    <span className="block text-[10px] text-gray-400">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getTxColor(t.type)}`}>
                                        {getTxTypeLabel(t.type)}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <span className="font-bold text-gray-800" dir="ltr">
                                        {Math.round(t.from_amount).toLocaleString()} {t.from_currency}
                                    </span>
                                    {t.to_amount && (
                                        <span className="block text-[10px] text-gray-400" dir="ltr">
                                            {Math.round(t.to_amount).toLocaleString()} {t.to_currency}
                                        </span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <div className="text-xs font-medium text-gray-700">{getEmployeeName(t.employee_id)}</div>
                                    <div className="text-[10px] text-gray-400 truncate max-w-[150px]">{t.description || '-'} {t.receipt_number ? `(#${t.receipt_number})` : ''}</div>
                                </td>
                                <td className="p-3 flex gap-1 justify-end">
                                    <button onClick={() => setViewTransaction(t)} className="p-1.5 text-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100">
                                        <Eye size={14} />
                                    </button>
                                    {currentUser?.role === 'admin' && (
                                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100">
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {displayTransactions.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-400 text-xs">
                                    لا توجد عمليات {activeCardFilter !== 'ALL' ? 'لهذا التصنيف' : ''}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Receipt Modal */}
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
