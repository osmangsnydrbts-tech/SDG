
import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Search, Eye, Trash2, Calendar, 
  Banknote, ArrowUpCircle, ArrowDownCircle,
  Wallet, FileMinus, X, Loader2, Filter
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

const Reports: React.FC = () => {
  const { currentUser, users, fetchReportsData, companies, deleteTransaction } = useStore();
  
  // State
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Interactive Filter State
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'EGP_IN' | 'SDG_IN' | 'EXPENSE' | 'COMMISSION'>('ALL');
  
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  const getCompany = (companyId: number) => companies.find(c => c.id === companyId);
  const getEmployee = (empId?: number) => users.find(u => u.id === empId);
  const getEmployeeName = (empId?: number) => users.find(u => u.id === empId)?.full_name || '-';

  // Fetch Data
  useEffect(() => {
      const loadData = async () => {
          setIsLoading(true);
          try {
              // Fetch all transactions for the date range, then filter locally for speed and interaction
              const data = await fetchReportsData(startDate, endDate, selectedEmployeeId, 'all');
              setTransactions(data);
          } catch (e) {
              console.error("Error loading reports", e);
          } finally {
              setIsLoading(false);
          }
      };
      
      const timeout = setTimeout(loadData, 300);
      return () => clearTimeout(timeout);
  }, [startDate, endDate, selectedEmployeeId, fetchReportsData]);

  // Calculate Statistics
  const stats = useMemo(() => {
      let egpIn = 0; let egpOut = 0;
      let sdgIn = 0; let sdgOut = 0;
      let commissions = 0;
      let expenseEgp = 0; let expenseSdg = 0;

      transactions.forEach(t => {
          const amount = Math.round(t.from_amount);
          const toAmount = Math.round(t.to_amount || 0);

          if (t.type === 'exchange') {
              if (t.from_currency === 'SDG') {
                  // User GIVES SDG (In), TAKES EGP (Out)
                  sdgIn += amount;
                  egpOut += toAmount;
              } else {
                  // User GIVES EGP (In), TAKES SDG (Out)
                  egpIn += amount;
                  sdgOut += toAmount;
              }
          } else if (t.type === 'expense') {
              if (t.from_currency === 'EGP') {
                  egpOut += amount;
                  expenseEgp += amount;
              } else {
                  sdgOut += amount;
                  expenseSdg += amount;
              }
          } else if (t.type === 'wallet_deposit') {
              // Deposit into wallet: Money leaves Treasury (Out) to go to Wallet Provider
              egpOut += amount;
              if (t.commission) commissions += t.commission;
          } else if (t.type === 'wallet_withdrawal') {
              // Withdraw from wallet: Money comes to Treasury (In) from Wallet Provider
              // Note: Usually withdrawal means Cash IN to Treasury.
              egpIn += toAmount; 
              if (t.commission) commissions += t.commission;
          } else if (t.type === 'wallet_feed') {
              egpOut += amount;
          } else if (t.type === 'treasury_feed') {
              // Exclude EGP Treasury Feed from Receipts report as per request
              if (t.from_currency === 'SDG') {
                  sdgIn += amount;
              }
          } else if (t.type === 'treasury_withdraw') {
               if (t.from_currency === 'EGP') egpOut += amount; else sdgOut += amount;
          }
      });

      return {
          egpNet: egpIn - egpOut,
          sdgNet: sdgIn - sdgOut,
          expenseEgp,
          expenseSdg,
          commissions,
          egpIn, egpOut, sdgIn, sdgOut
      };
  }, [transactions]);

  // Filter Transactions for Display based on Active Card
  const displayTransactions = useMemo(() => {
      let filtered = transactions;

      // Card Filter Logic
      if (activeFilter === 'EGP_IN') {
          // Show transactions where EGP came IN (Excluding Treasury Feed)
          filtered = filtered.filter(t => 
              (t.type === 'exchange' && t.from_currency === 'EGP') ||
              t.type === 'wallet_withdrawal'
          );
      } else if (activeFilter === 'SDG_IN') {
          // Show transactions where SDG came IN
           filtered = filtered.filter(t => 
              (t.type === 'exchange' && t.from_currency === 'SDG') ||
              (t.type === 'treasury_feed' && t.from_currency === 'SDG')
          );
      } else if (activeFilter === 'EXPENSE') {
          filtered = filtered.filter(t => t.type === 'expense');
      } else if (activeFilter === 'COMMISSION') {
          filtered = filtered.filter(t => (t.commission || 0) > 0);
      }

      // Search Filter
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(t => 
              t.receipt_number?.toLowerCase().includes(q) || 
              t.description?.toLowerCase().includes(q) ||
              getEmployeeName(t.employee_id).toLowerCase().includes(q)
          );
      }

      return filtered;
  }, [transactions, activeFilter, searchQuery, users]);

  const handleDelete = async (id: number) => {
      if (window.confirm('هل أنت متأكد من حذف هذه العملية؟')) {
          await deleteTransaction(id);
          const data = await fetchReportsData(startDate, endDate, selectedEmployeeId, 'all');
          setTransactions(data);
      }
  };

  const setToday = () => {
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
  };

  const companyEmployees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee');

  const getTxTypeLabel = (type: string) => {
      const map: Record<string, string> = {
          'exchange': 'صرف عملة',
          'expense': 'منصرفات',
          'wallet_deposit': 'إيداع محفظة',
          'wallet_withdrawal': 'سحب محفظة',
          'treasury_feed': 'تغذية نقدية',
          'treasury_withdraw': 'سحب نقدي',
          'wallet_feed': 'تغذية محفظة'
      };
      return map[type] || type;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
        {/* Controls Header */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* Date Filter */}
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 w-full md:w-auto flex-1">
                    <button onClick={setToday} className="px-4 py-2 bg-white rounded-lg shadow-sm text-xs font-bold hover:bg-gray-100 transition text-blue-700 whitespace-nowrap">اليوم</button>
                    <div className="h-4 w-px bg-gray-300 mx-1"></div>
                    <div className="flex items-center gap-1 px-2 flex-1">
                        <Calendar size={16} className="text-gray-400" />
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-sm font-bold w-full focus:ring-0 outline-none text-gray-700" />
                    </div>
                    <span className="text-gray-400">←</span>
                    <div className="flex items-center gap-1 px-2 flex-1">
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-sm font-bold w-full focus:ring-0 outline-none text-gray-700" />
                    </div>
                </div>

                {/* Employee Select */}
                {currentUser?.role !== 'employee' && (
                    <div className="w-full md:w-48">
                        <select 
                            value={selectedEmployeeId} 
                            onChange={e => setSelectedEmployeeId(e.target.value)}
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">كل الموظفين</option>
                            {companyEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="بحث برقم الإشعار، اسم الموظف، أو التفاصيل..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
            </div>
        </div>

        {/* 4 Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Receipts in SDG (المقبوضات بالسوداني) */}
            <div 
                onClick={() => setActiveFilter(activeFilter === 'SDG_IN' ? 'ALL' : 'SDG_IN')} 
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 relative overflow-hidden ${
                    activeFilter === 'SDG_IN' 
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' 
                    : 'border-white bg-white hover:border-emerald-200 shadow-sm'
                }`}
            >
                <div className="flex justify-between items-center mb-4">
                    <span className={`text-sm font-bold ${activeFilter === 'SDG_IN' ? 'text-emerald-700' : 'text-gray-600'}`}>المقبوضات بالسوداني</span>
                    <div className={`p-2 rounded-full ${activeFilter === 'SDG_IN' ? 'bg-white text-emerald-600' : 'bg-green-50 text-green-600'}`}>
                        <Banknote size={20} />
                    </div>
                </div>
                <div className="text-2xl font-black text-gray-800" dir="ltr">{stats.sdgIn.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-2">إجمالي الداخل (SDG)</div>
            </div>

            {/* Card 2: Receipts in EGP (المقبوضات بالمصري) */}
            <div 
                onClick={() => setActiveFilter(activeFilter === 'EGP_IN' ? 'ALL' : 'EGP_IN')} 
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 relative overflow-hidden ${
                    activeFilter === 'EGP_IN' 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                    : 'border-white bg-white hover:border-blue-200 shadow-sm'
                }`}
            >
                <div className="flex justify-between items-center mb-4">
                    <span className={`text-sm font-bold ${activeFilter === 'EGP_IN' ? 'text-blue-700' : 'text-gray-600'}`}>المقبوضات بالمصري</span>
                    <div className={`p-2 rounded-full ${activeFilter === 'EGP_IN' ? 'bg-white text-blue-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Banknote size={20} />
                    </div>
                </div>
                <div className="text-2xl font-black text-gray-800" dir="ltr">{stats.egpIn.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-2">إجمالي الداخل (EGP)</div>
            </div>

            {/* Card 3: Expenses (اجمالي المنصرفات) */}
            <div 
                onClick={() => setActiveFilter(activeFilter === 'EXPENSE' ? 'ALL' : 'EXPENSE')} 
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 relative overflow-hidden ${
                    activeFilter === 'EXPENSE' 
                    ? 'border-red-500 bg-red-50 ring-2 ring-red-200' 
                    : 'border-white bg-white hover:border-red-200 shadow-sm'
                }`}
            >
                <div className="flex justify-between items-center mb-4">
                    <span className={`text-sm font-bold ${activeFilter === 'EXPENSE' ? 'text-red-700' : 'text-gray-600'}`}>اجمالي المنصرفات</span>
                    <div className={`p-2 rounded-full ${activeFilter === 'EXPENSE' ? 'bg-white text-red-600' : 'bg-red-50 text-red-600'}`}>
                        <FileMinus size={20} />
                    </div>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-800" dir="ltr">{stats.expenseEgp.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">EGP</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-800" dir="ltr">{stats.expenseSdg.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">SDG</span>
                    </div>
                </div>
            </div>

            {/* Card 4: Commissions (اجمالي العمولات) */}
            <div 
                onClick={() => setActiveFilter(activeFilter === 'COMMISSION' ? 'ALL' : 'COMMISSION')} 
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 relative overflow-hidden ${
                    activeFilter === 'COMMISSION' 
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                    : 'border-white bg-white hover:border-purple-200 shadow-sm'
                }`}
            >
                <div className="flex justify-between items-center mb-4">
                    <span className={`text-sm font-bold ${activeFilter === 'COMMISSION' ? 'text-purple-700' : 'text-gray-600'}`}>اجمالي العمولات</span>
                    <div className={`p-2 rounded-full ${activeFilter === 'COMMISSION' ? 'bg-white text-purple-600' : 'bg-purple-50 text-purple-600'}`}>
                        <Wallet size={20} />
                    </div>
                </div>
                <div className="text-2xl font-black text-purple-700" dir="ltr">{stats.commissions.toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-2">أرباح التحويلات</div>
            </div>
        </div>

        {/* Active Filter Indicator */}
        {activeFilter !== 'ALL' && (
            <div className="flex justify-center animate-in fade-in slide-in-from-top-2">
                <button 
                    onClick={() => setActiveFilter('ALL')} 
                    className="bg-gray-800 text-white px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-black transition shadow-lg"
                >
                    <X size={14} /> 
                    <span>
                        إلغاء تصفية: 
                        {activeFilter === 'EGP_IN' && ' مقبوضات المصري'}
                        {activeFilter === 'SDG_IN' && ' مقبوضات السوداني'}
                        {activeFilter === 'EXPENSE' && ' المنصرفات'}
                        {activeFilter === 'COMMISSION' && ' العمولات'}
                    </span>
                </button>
            </div>
        )}

        {/* Transactions Table & Mobile List */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 md:p-0 rounded-2xl">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-gray-100">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase sticky top-0">
                        <tr>
                            <th className="p-4 whitespace-nowrap">التفاصيل</th>
                            <th className="p-4 whitespace-nowrap">النوع</th>
                            <th className="p-4 whitespace-nowrap">المبلغ</th>
                            <th className="p-4 whitespace-nowrap text-left">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {displayTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50 transition group">
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 mb-0.5 flex gap-2">
                                            <span>{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                                            <span>•</span>
                                            <span>{new Date(t.created_at).toLocaleDateString('ar-EG')}</span>
                                        </span>
                                        <span className="font-bold text-gray-800 text-sm">{getEmployeeName(t.employee_id)}</span>
                                        <span className="text-xs text-gray-500 mt-1 truncate max-w-[150px] md:max-w-none">
                                            {t.description || '-'} {t.receipt_number ? `(#${t.receipt_number})` : ''}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4 align-top">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap
                                        ${t.type === 'expense' ? 'bg-red-100 text-red-700' : 
                                          t.type === 'exchange' ? 'bg-blue-100 text-blue-700' : 
                                          t.type.includes('wallet') ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {getTxTypeLabel(t.type)}
                                    </span>
                                </td>
                                <td className="p-4 align-top">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900" dir="ltr">
                                            {Math.round(t.from_amount).toLocaleString()} {t.from_currency}
                                        </span>
                                        {t.to_amount && (
                                            <span className="text-xs text-gray-400 mt-1" dir="ltr">
                                                → {Math.round(t.to_amount).toLocaleString()} {t.to_currency}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 align-top text-left">
                                    <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setViewTransaction(t)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition" title="عرض الإشعار">
                                            <Eye size={16} />
                                        </button>
                                        {currentUser?.role === 'admin' && (
                                            <button onClick={() => handleDelete(t.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition" title="حذف">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {displayTransactions.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-12 text-center">
                                    <div className="flex flex-col items-center text-gray-300">
                                        <FileMinus size={48} className="mb-3 opacity-20" />
                                        <p className="text-sm">لا توجد عمليات مطابقة</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards List */}
            <div className="md:hidden space-y-3">
                {displayTransactions.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                                <span className={`text-xs font-bold px-2 py-1 rounded-md w-fit
                                    ${t.type === 'expense' ? 'bg-red-100 text-red-700' : 
                                      t.type === 'exchange' ? 'bg-blue-100 text-blue-700' : 
                                      t.type.includes('wallet') ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {getTxTypeLabel(t.type)}
                                </span>
                                <span className="text-xs text-gray-400 mt-1">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="text-left">
                                 <span className="text-xs text-gray-400 block">الموظف</span>
                                 <span className="text-sm font-bold text-gray-700">{getEmployeeName(t.employee_id)}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <div>
                                 <span className="block text-xs text-gray-400">من</span>
                                 <span className="font-bold text-gray-900" dir="ltr">{Math.round(t.from_amount).toLocaleString()} {t.from_currency}</span>
                            </div>
                            {t.to_amount && (
                                <div className="text-left">
                                     <span className="block text-xs text-gray-400">إلى</span>
                                     <span className="font-bold text-blue-600" dir="ltr">{Math.round(t.to_amount).toLocaleString()} {t.to_currency}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                             <span className="text-xs text-gray-500 truncate max-w-[150px]">{t.description || 'بدون وصف'} {t.receipt_number ? `(${t.receipt_number})` : ''}</span>
                             <div className="flex gap-2">
                                 <button onClick={() => setViewTransaction(t)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Eye size={16}/></button>
                                 {currentUser?.role === 'admin' && (
                                     <button onClick={() => handleDelete(t.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button>
                                 )}
                             </div>
                        </div>
                    </div>
                ))}
                {displayTransactions.length === 0 && (
                    <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-200">
                        <div className="flex flex-col items-center text-gray-300">
                            <FileMinus size={48} className="mb-3 opacity-20" />
                            <p className="text-sm">لا توجد عمليات مطابقة</p>
                        </div>
                    </div>
                )}
            </div>
            
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-sm z-10 rounded-2xl">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
            )}
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

export default Reports;
