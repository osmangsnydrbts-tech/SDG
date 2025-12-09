import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  Search, Eye, Trash2, Calendar, 
  Banknote, ArrowUpCircle, ArrowDownCircle,
  Wallet, FileMinus, X, Loader2, Filter,
  Download, Printer, ChevronLeft, ChevronRight,
  BarChart3, TrendingUp, TrendingDown, RefreshCw
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

const Reports: React.FC = () => {
  const { currentUser, users, fetchReportsData, companies, deleteTransaction } = useStore();
  
  // State
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // افتراضي آخر 7 أيام
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Interactive Filter State
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'EGP' | 'SDG' | 'EXPENSE' | 'COMMISSION'>('ALL');
  
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const getCompany = (companyId: number) => companies.find(c => c.id === companyId);
  const getEmployee = (empId?: number) => users.find(u => u.id === empId);
  const getEmployeeName = (empId?: number) => users.find(u => u.id === empId)?.full_name || '-';

  // Fetch Data
  const loadData = useCallback(async () => {
      setIsLoading(true);
      setRefreshing(true);
      try {
          const data = await fetchReportsData(startDate, endDate, selectedEmployeeId, 'all');
          setTransactions(data);
          setCurrentPage(1); // Reset to first page on new data
      } catch (e) {
          console.error("Error loading reports", e);
      } finally {
          setIsLoading(false);
          setRefreshing(false);
      }
  }, [startDate, endDate, selectedEmployeeId, fetchReportsData]);

  useEffect(() => {
      const timeout = setTimeout(loadData, 300);
      return () => clearTimeout(timeout);
  }, [loadData]);

  // Handle refresh
  const handleRefresh = () => {
      loadData();
  };

  // Date range presets
  const datePresets = [
    { label: 'اليوم', days: 0 },
    { label: 'أمس', days: -1 },
    { label: 'آخر 7 أيام', days: -7 },
    { label: 'آخر 30 يوم', days: -30 },
    { label: 'هذا الشهر', days: -30 }, // سيتم ضبط في الدالة
  ];

  const applyDatePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    
    if (days === -30) { // هذا الشهر
      start.setDate(1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (days === -1) { // أمس
      start.setDate(end.getDate() - 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(start.toISOString().split('T')[0]);
    } else {
      start.setDate(end.getDate() + days);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  // Calculate Statistics with more details
  const stats = useMemo(() => {
      let egpIn = 0; let egpOut = 0;
      let sdgIn = 0; let sdgOut = 0;
      let commissions = 0;
      let expenseEgp = 0; let expenseSdg = 0;
      let exchangeCount = 0;
      let expenseCount = 0;
      let walletCount = 0;

      transactions.forEach(t => {
          const amount = Math.round(t.from_amount);
          const toAmount = Math.round(t.to_amount || 0);

          if (t.type === 'exchange') {
              exchangeCount++;
              if (t.from_currency === 'SDG') {
                  sdgIn += amount;
                  egpOut += toAmount;
              } else {
                  egpIn += amount;
                  sdgOut += toAmount;
              }
          } else if (t.type === 'expense') {
              expenseCount++;
              if (t.from_currency === 'EGP') {
                  egpOut += amount;
                  expenseEgp += amount;
              } else {
                  sdgOut += amount;
                  expenseSdg += amount;
              }
          } else if (t.type === 'wallet_deposit') {
              walletCount++;
              egpOut += amount;
              if (t.commission) commissions += t.commission;
          } else if (t.type === 'wallet_withdrawal') {
              walletCount++;
              egpIn += toAmount; 
              if (t.commission) commissions += t.commission;
          } else if (t.type === 'wallet_feed') {
              walletCount++;
              egpOut += amount;
          } else if (t.type === 'treasury_feed') {
              if (t.from_currency === 'EGP') egpIn += amount; else sdgIn += amount;
          } else if (t.type === 'treasury_withdraw') {
               if (t.from_currency === 'EGP') egpOut += amount; else sdgOut += amount;
          }
      });

      const totalTransactions = transactions.length;
      const egpNet = egpIn - egpOut;
      const sdgNet = sdgIn - sdgOut;

      return {
          egpNet,
          sdgNet,
          expenseEgp,
          expenseSdg,
          commissions,
          egpIn, 
          egpOut, 
          sdgIn, 
          sdgOut,
          totalTransactions,
          exchangeCount,
          expenseCount,
          walletCount,
          egpPercentage: egpIn + egpOut > 0 ? Math.round((egpIn / (egpIn + egpOut)) * 100) : 0,
          sdgPercentage: sdgIn + sdgOut > 0 ? Math.round((sdgIn / (sdgIn + sdgOut)) * 100) : 0,
      };
  }, [transactions]);

  // Filter Transactions for Display based on Active Card
  const displayTransactions = useMemo(() => {
      let filtered = transactions;

      // Card Filter Logic
      if (activeFilter === 'EGP') {
          filtered = filtered.filter(t => 
              t.from_currency === 'EGP' || t.to_currency === 'EGP' || 
              ['wallet_deposit', 'wallet_withdrawal', 'wallet_feed'].includes(t.type)
          );
      } else if (activeFilter === 'SDG') {
          filtered = filtered.filter(t => 
             t.from_currency === 'SDG' || t.to_currency === 'SDG'
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

  // Pagination logic
  const totalPages = Math.ceil(displayTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return displayTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [displayTransactions, currentPage, itemsPerPage]);

  const handleDelete = async (id: number) => {
      if (window.confirm('هل أنت متأكد من حذف هذه العملية؟')) {
          await deleteTransaction(id);
          await loadData();
      }
  };

  const handleExport = async () => {
      setExportLoading(true);
      try {
          // Export logic here
          await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate export
          alert('تم تصدير التقرير بنجاح');
      } catch (error) {
          alert('حدث خطأ أثناء التصدير');
      } finally {
          setExportLoading(false);
      }
  };

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

  const getCurrencyColor = (currency: string) => {
      return currency === 'EGP' ? 'text-blue-600' : 'text-emerald-600';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 px-4">
        {/* Header with title and actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-black text-gray-900">التقارير المالية</h1>
                <p className="text-gray-500 text-sm mt-1">مراجعة وتحليل جميع المعاملات المالية</p>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition disabled:opacity-50"
                >
                    {exportLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    تصدير
                </button>
                <button 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center gap-2 transition disabled:opacity-50"
                >
                    {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    تحديث
                </button>
            </div>
        </div>

        {/* Controls Header */}
        <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Date Controls */}
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <Calendar size={16} />
                        الفترة الزمنية
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Date Presets */}
                        <div className="flex flex-wrap gap-2">
                            {datePresets.map((preset, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => applyDatePreset(preset.days)}
                                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 transition text-gray-700 hover:border-blue-400"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        
                        {/* Custom Date Range */}
                        <div className="flex-1 flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-2">من تاريخ</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="date" 
                                        value={startDate} 
                                        onChange={e => setStartDate(e.target.value)} 
                                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-gray-500 mb-2">إلى تاريخ</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="date" 
                                        value={endDate} 
                                        onChange={e => setEndDate(e.target.value)} 
                                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters Column */}
                <div className="lg:w-80">
                    <div className="space-y-4">
                        {currentUser?.role !== 'employee' && (
                            <div>
                                <label className="block text-xs text-gray-500 mb-2">الموظف</label>
                                <select 
                                    value={selectedEmployeeId} 
                                    onChange={e => setSelectedEmployeeId(e.target.value)}
                                    className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                >
                                    <option value="all">كل الموظفين</option>
                                    {users
                                        .filter(u => u.company_id === currentUser?.company_id && u.role === 'employee')
                                        .map(e => (
                                            <option key={e.id} value={e.id}>{e.full_name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}
                        
                        {/* Quick Stats */}
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-blue-700">إجمالي العمليات</span>
                                <span className="text-lg font-black text-blue-900">{stats.totalTransactions}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
                                <span className="flex items-center gap-1">
                                    <BarChart3 size={12} />
                                    {stats.exchangeCount} صرف
                                </span>
                                <span className="flex items-center gap-1">
                                    <FileMinus size={12} />
                                    {stats.expenseCount} مصروفات
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Summary Cards (Interactive Filters) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* EGP Card */}
            <div 
                onClick={() => setActiveFilter(activeFilter === 'EGP' ? 'ALL' : 'EGP')} 
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 relative overflow-hidden hover:shadow-lg group ${
                    activeFilter === 'EGP' 
                    ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 ring-4 ring-blue-100' 
                    : 'border-white bg-white hover:border-blue-300 shadow-sm'
                }`}
            >
                <div className="absolute top-3 left-3">
                    <div className={`w-3 h-3 rounded-full ${activeFilter === 'EGP' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <span className={`text-xs font-bold ${activeFilter === 'EGP' ? 'text-blue-700' : 'text-gray-500'}`}>المصري (EGP)</span>
                        <div className="text-lg font-black text-gray-900 mt-1" dir="ltr">
                            {stats.egpNet >= 0 ? '+' : ''}{stats.egpNet.toLocaleString()}
                            <span className={`text-xs font-bold ml-2 ${stats.egpNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {stats.egpPercentage}%
                            </span>
                        </div>
                    </div>
                    <div className={`p-2.5 rounded-xl ${activeFilter === 'EGP' ? 'bg-white text-blue-600 shadow-sm' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
                        <Banknote size={22} />
                    </div>
                </div>
                <div className="flex justify-between text-xs pt-3 border-t border-dashed border-gray-200">
                    <span className="text-green-600 font-bold flex items-center gap-1">
                        <TrendingUp size={12}/>
                        {stats.egpIn.toLocaleString()}
                    </span>
                    <span className="text-red-500 font-bold flex items-center gap-1">
                        <TrendingDown size={12}/>
                        {stats.egpOut.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* SDG Card */}
            <div 
                onClick={() => setActiveFilter(activeFilter === 'SDG' ? 'ALL' : 'SDG')} 
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 relative overflow-hidden hover:shadow-lg group ${
                    activeFilter === 'SDG' 
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 ring-4 ring-emerald-100' 
                    : 'border-white bg-white hover:border-emerald-300 shadow-sm'
                }`}
            >
                <div className="absolute top-3 left-3">
                    <div className={`w-3 h-3 rounded-full ${activeFilter === 'SDG' ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <span className={`text-xs font-bold ${activeFilter === 'SDG' ? 'text-emerald-700' : 'text-gray-500'}`}>السوداني (SDG)</span>
                        <div className="text-lg font-black text-gray-900 mt-1" dir="ltr">
                            {stats.sdgNet >= 0 ? '+' : ''}{stats.sdgNet.toLocaleString()}
                            <span className={`text-xs font-bold ml-2 ${stats.sdgNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {stats.sdgPercentage}%
                            </span>
                        </div>
                    </div>
                    <div className={`p-2.5 rounded-xl ${activeFilter === 'SDG' ? 'bg-white text-emerald-600 shadow-sm' : 'bg-gray-50 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500'}`}>
                        <Banknote size={22} />
                    </div>
                </div>
                <div className="flex justify-between text-xs pt-3 border-t border-dashed border-gray-200">
                    <span className="text-green-600 font-bold flex items-center gap-1">
                        <TrendingUp size={12}/>
                        {stats.sdgIn.toLocaleString()}
                    </span>
                    <span className="text-red-500 font-bold flex items-center gap-1">
                        <TrendingDown size={12}/>
                        {stats.sdgOut.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Expenses Card */}
            <div 
                onClick={() => setActiveFilter(activeFilter === 'EXPENSE' ? 'ALL' : 'EXPENSE')} 
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 relative overflow-hidden hover:shadow-lg group ${
                    activeFilter === 'EXPENSE' 
                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 ring-4 ring-orange-100' 
                    : 'border-white bg-white hover:border-orange-300 shadow-sm'
                }`}
            >
                <div className="absolute top-3 left-3">
                    <div className={`w-3 h-3 rounded-full ${activeFilter === 'EXPENSE' ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <span className={`text-xs font-bold ${activeFilter === 'EXPENSE' ? 'text-orange-700' : 'text-gray-500'}`}>المنصرفات</span>
                        <div className="text-lg font-black text-gray-900 mt-1">
                            <div className="flex items-center gap-2">
                                <span dir="ltr">{stats.expenseEgp.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">EGP</span>
                            </div>
                        </div>
                    </div>
                    <div className={`p-2.5 rounded-xl ${activeFilter === 'EXPENSE' ? 'bg-white text-orange-600 shadow-sm' : 'bg-gray-50 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500'}`}>
                        <FileMinus size={22} />
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-dashed border-gray-200">
                    <span className="text-gray-600 font-medium">SDG</span>
                    <span className="font-bold text-gray-800" dir="ltr">{stats.expenseSdg.toLocaleString()}</span>
                </div>
            </div>

            {/* Commissions Card */}
            <div 
                onClick={() => setActiveFilter(activeFilter === 'COMMISSION' ? 'ALL' : 'COMMISSION')} 
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-300 relative overflow-hidden hover:shadow-lg group ${
                    activeFilter === 'COMMISSION' 
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 ring-4 ring-purple-100' 
                    : 'border-white bg-white hover:border-purple-300 shadow-sm'
                }`}
            >
                <div className="absolute top-3 left-3">
                    <div className={`w-3 h-3 rounded-full ${activeFilter === 'COMMISSION' ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <span className={`text-xs font-bold ${activeFilter === 'COMMISSION' ? 'text-purple-700' : 'text-gray-500'}`}>العمولات</span>
                        <div className="text-lg font-black text-purple-700 mt-1" dir="ltr">
                            {stats.commissions.toLocaleString()} EGP
                        </div>
                    </div>
                    <div className={`p-2.5 rounded-xl ${activeFilter === 'COMMISSION' ? 'bg-white text-purple-600 shadow-sm' : 'bg-gray-50 text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-500'}`}>
                        <Wallet size={22} />
                    </div>
                </div>
                <div className="text-xs text-gray-500 mt-4 pt-3 border-t border-dashed border-gray-200">
                    إجمالي أرباح التحويلات
                </div>
            </div>
        </div>

        {/* Active Filter & Search Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Active Filter Indicator */}
            {activeFilter !== 'ALL' && (
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-full text-xs font-bold">
                        <Filter size={14} />
                        <span>
                            تم التصفية حسب:
                            {activeFilter === 'EGP' && ' المصري (EGP)'}
                            {activeFilter === 'SDG' && ' السوداني (SDG)'}
                            {activeFilter === 'EXPENSE' && ' المنصرفات'}
                            {activeFilter === 'COMMISSION' && ' العمولات'}
                        </span>
                        <button 
                            onClick={() => setActiveFilter('ALL')} 
                            className="p-1 hover:bg-gray-700 rounded-full transition"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <span className="text-xs text-gray-500">
                        {displayTransactions.length} عملية من أصل {transactions.length}
                    </span>
                </div>
            )}
            
            {/* Search Bar */}
            <div className="relative w-full md:w-96">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="ابحث برقم الإيصال أو الوصف أو الموظف..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
            </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px] flex flex-col">
            {/* Table Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="font-bold text-gray-800">سجل المعاملات</h3>
                    <p className="text-xs text-gray-500 mt-1">جميع العمليات المالية حسب الفترة المحددة</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                        {displayTransactions.length} عملية
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>الصفحة</span>
                        <span className="font-bold text-gray-800">{currentPage} من {totalPages}</span>
                    </div>
                </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full">
                    <thead className="bg-gray-50 text-gray-600 text-xs font-bold uppercase border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-right whitespace-nowrap">التاريخ والوقت</th>
                            <th className="p-4 text-right whitespace-nowrap">الموظف</th>
                            <th className="p-4 text-right whitespace-nowrap">النوع</th>
                            <th className="p-4 text-right whitespace-nowrap">المبلغ</th>
                            <th className="p-4 text-right whitespace-nowrap">الوصف</th>
                            <th className="p-4 text-left whitespace-nowrap">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50/50 transition-all duration-200 group">
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 font-medium">
                                            {new Date(t.created_at).toLocaleDateString('ar-EG', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className="text-xs text-gray-400 mt-0.5">
                                            {new Date(t.created_at).toLocaleTimeString('ar-EG', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-bold text-gray-800 text-sm">
                                        {getEmployeeName(t.employee_id)}
                                    </div>
                                    {t.receipt_number && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            # {t.receipt_number}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap
                                            ${t.type === 'expense' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 
                                              t.type === 'exchange' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                                              t.type.includes('wallet') ? 'bg-purple-100 text-purple-700 border border-purple-200' : 
                                              'bg-gray-100 text-gray-700 border border-gray-200'
                                            }`}>
                                            {getTxTypeLabel(t.type)}
                                        </span>
                                        {t.commission && t.commission > 0 && (
                                            <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded">
                                                +{t.commission} عمولة
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${getCurrencyColor(t.from_currency)}`} dir="ltr">
                                                {Math.round(t.from_amount).toLocaleString()}
                                            </span>
                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                {t.from_currency}
                                            </span>
                                        </div>
                                        {t.to_amount && (
                                            <div className="flex items-center gap-2 mt-2 text-xs">
                                                <span className="text-gray-400">→</span>
                                                <span className="font-medium text-gray-700" dir="ltr">
                                                    {Math.round(t.to_amount).toLocaleString()}
                                                </span>
                                                <span className="text-gray-500">{t.to_currency}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <p className="text-sm text-gray-600 max-w-xs truncate" title={t.description || '-'}>
                                        {t.description || 'لا يوجد وصف'}
                                    </p>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => setViewTransaction(t)} 
                                            className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition hover:scale-105 active:scale-95"
                                            title="عرض التفاصيل"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        {currentUser?.role === 'admin' && (
                                            <button 
                                                onClick={() => handleDelete(t.id)} 
                                                className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition hover:scale-105 active:scale-95"
                                                title="حذف العملية"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {displayTransactions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-12 text-center">
                                    <div className="flex flex-col items-center text-gray-400">
                                        <FileMinus size={48} className="mb-4 opacity-30" />
                                        <p className="text-sm font-medium text-gray-500">لا توجد عمليات مطابقة</p>
                                        <p className="text-xs text-gray-400 mt-1">تغيير عوامل التصفية أو البحث</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            عرض {Math.min(itemsPerPage, paginatedTransactions.length)} من {displayTransactions.length} عملية
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                            >
                                <ChevronRight size={18} />
                            </button>
                            
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-9 h-9 rounded-lg text-sm font-bold transition ${
                                            currentPage === pageNum
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition"
                            >
                                <ChevronLeft size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                    <div className="text-center">
                        <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
                        <p className="text-gray-600 font-medium">جاري تحميل البيانات...</p>
                    </div>
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
