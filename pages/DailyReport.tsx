import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ShoppingCart, Share2, User, Smartphone, TrendingDown, ChevronLeft, X, Clock, Calendar, Filter, Banknote } from 'lucide-react';
import { Transaction } from '../types';

const DailyReport: React.FC = () => {
  const { currentUser, treasuries, eWallets, users, companies, transactions } = useStore();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('all');
  
  // Date Filters
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Modal States
  const [detailsModalType, setDetailsModalType] = useState<'sales' | 'expenses' | null>(null);

  const company = companies.find(c => c.id === currentUser?.company_id);
  const companyEmployees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee');

  // Determine which employee to show
  const targetEmployeeId = currentUser?.role === 'employee' 
      ? currentUser.id 
      : (selectedEmpId === 'all' ? null : parseInt(selectedEmpId));

  const setFilterToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  };

  const reportData = useMemo(() => {
    if (!targetEmployeeId) return null;

    const treasury = treasuries.find(t => t.employee_id === targetEmployeeId);
    const wallets = eWallets.filter(w => w.employee_id === targetEmployeeId && w.is_active);
    const employee = users.find(u => u.id === targetEmployeeId);

    // Date Logic
    const start = new Date(startDate).setHours(0,0,0,0);
    const end = new Date(endDate).setHours(23,59,59,999);
    
    const filteredTx = transactions.filter(t => {
        const txDate = new Date(t.created_at).getTime();
        return t.employee_id === targetEmployeeId && 
               !t.is_cancelled && 
               txDate >= start && 
               txDate <= end;
    });

    const salesTx = filteredTx.filter(t => t.type === 'sale');
    const expensesTx = filteredTx.filter(t => t.type === 'expense');

    const totalSalesPeriod = salesTx.reduce((sum, t) => sum + t.from_amount, 0);
    const totalExpensesPeriod = expensesTx.reduce((sum, t) => sum + t.from_amount, 0);

    return {
        employeeName: employee?.full_name || '',
        // Current Balances (Snapshot)
        egpBalance: Math.round(treasury?.egp_balance || 0),
        sdgBalance: Math.round(treasury?.sdg_balance || 0),
        salesBalance: Math.round(treasury?.sales_balance || 0),
        // Period Stats
        totalSalesPeriod,
        totalExpensesPeriod,
        salesTx,
        expensesTx,
        wallets: wallets.map(w => ({
            provider: w.provider,
            phone: w.phone_number,
            balance: Math.round(w.balance)
        }))
    };
  }, [targetEmployeeId, treasuries, eWallets, users, transactions, startDate, endDate]);

  // Helper for formatting
  const fmt = (num: number) => Math.round(num).toLocaleString('en-US');

  const handleShare = async () => {
      if (!reportData) return;
      
      const dateStr = startDate === endDate ? startDate : `${startDate} إلى ${endDate}`;
      let text = `*تقرير فترة - ${dateStr}*\n`;
      text += `الموظف: ${reportData.employeeName}\n`;
      text += `------------------\n`;
      text += `💰 *الخزينة النقدية (الحالية):*\n`;
      text += `مصري: ${fmt(reportData.egpBalance)} EGP\n`;
      text += `سوداني: ${fmt(reportData.sdgBalance)} SDG\n\n`;
      
      text += `🛒 *خزينة المبيعات:*\n`;
      text += `الرصيد الكلي: ${fmt(reportData.salesBalance)} EGP\n`;
      text += `مبيعات الفترة: ${fmt(reportData.totalSalesPeriod)} EGP\n\n`;

      text += `📉 *المنصرفات:*\n`;
      text += `منصرفات الفترة: ${fmt(reportData.totalExpensesPeriod)} EGP\n\n`;
      
      text += `📱 *المحافظ الإلكترونية (الحالية):*\n`;
      if (reportData.wallets.length > 0) {
          reportData.wallets.forEach((w) => {
              text += `- ${w.provider} (${w.phone}): ${fmt(w.balance)}\n`;
          });
      } else {
          text += `لا توجد محافظ.\n`;
      }
      text += `------------------\n`;
      text += `نظام الصرفة`;

      if (navigator.share) {
          try {
              await navigator.share({ title: 'تقرير اليومية', text: text });
          } catch (err) {
              console.log('Share cancelled');
          }
      } else {
          try {
              await navigator.clipboard.writeText(text);
              alert('تم نسخ التقرير للحافظة');
          } catch (err) {
              alert('لا يمكن النسخ');
          }
      }
  };

  const DetailsModal = () => {
      if (!detailsModalType || !reportData) return null;

      const isSales = detailsModalType === 'sales';
      const title = isSales ? 'تفاصيل المبيعات' : 'تفاصيل المنصرفات';
      const list = isSales ? reportData.salesTx : reportData.expensesTx;
      const colorClass = isSales ? 'text-purple-600' : 'text-red-600';
      const bgClass = isSales ? 'bg-purple-50' : 'bg-red-50';

      return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
                      <h3 className={`font-bold text-lg flex items-center gap-2 ${colorClass}`}>
                          {isSales ? <ShoppingCart size={20}/> : <TrendingDown size={20}/>}
                          {title}
                      </h3>
                      <button onClick={() => setDetailsModalType(null)} className="p-1 hover:bg-gray-200 rounded-full">
                          <X size={20} className="text-gray-500"/>
                      </button>
                  </div>
                  
                  <div className="overflow-y-auto p-4 space-y-3 flex-1">
                      {list.length > 0 ? list.map((t, idx) => (
                          <div key={t.id} className="border border-gray-100 p-3 rounded-xl shadow-sm flex justify-between items-center">
                              <div>
                                  <p className="font-bold text-gray-800 text-sm mb-1">
                                      {isSales ? t.product_name : t.description || 'منصرف عام'}
                                  </p>
                                  <p className="text-xs text-gray-400 flex items-center gap-1">
                                      <Clock size={10}/>
                                      {new Date(t.created_at).toLocaleDateString('ar-EG')} - {new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                                  </p>
                              </div>
                              <span className={`font-bold text-lg ${colorClass}`}>
                                  {fmt(t.from_amount)} <span className="text-xs">{t.from_currency}</span>
                              </span>
                          </div>
                      )) : (
                          <div className="text-center py-10 text-gray-400">لا توجد بيانات في هذه الفترة</div>
                      )}
                  </div>

                  <div className={`p-4 border-t font-bold flex justify-between items-center rounded-b-2xl ${bgClass}`}>
                      <span>الإجمالي</span>
                      <span className="text-xl">
                          {fmt(isSales ? reportData.totalSalesPeriod : reportData.totalExpensesPeriod)}
                      </span>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 pb-20">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">التقرير التفصيلي</h2>
                </div>
                
                {/* Admin Employee Selector */}
                {currentUser?.role !== 'employee' && (
                    <div className="relative">
                        <select 
                            value={selectedEmpId} 
                            onChange={(e) => setSelectedEmpId(e.target.value)}
                            className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8 font-bold"
                        >
                            <option value="all">اختر موظف...</option>
                            {companyEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                            ))}
                        </select>
                        <User className="absolute left-2 top-3 text-gray-400" size={16} />
                    </div>
                )}
            </div>

            {/* Date Filters */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4">
                 <div className="flex items-center justify-between mb-2">
                     <label className="text-xs font-bold text-gray-500 flex items-center gap-1"><Filter size={14}/> تحديد الفترة</label>
                     <button onClick={setFilterToday} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-200 transition">اليوم</button>
                 </div>
                 <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 pl-2 text-sm border rounded-lg font-bold" />
                    </div>
                    <span className="text-gray-400 font-bold">:</span>
                    <div className="flex-1 relative">
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 pl-2 text-sm border rounded-lg font-bold" />
                    </div>
                 </div>
            </div>
            
            {!targetEmployeeId && (
                <div className="text-center p-8 bg-gray-50 rounded-xl text-gray-500 font-bold">
                    <User size={48} className="mx-auto mb-2 opacity-50"/>
                    الرجاء اختيار موظف لعرض التقرير
                </div>
            )}

            {reportData && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Share Button */}
                    <button 
                        onClick={handleShare}
                        className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 active:scale-95 transition"
                    >
                        <Share2 size={20} /> مشاركة التقرير
                    </button>

                    {/* Cash Treasury */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-gray-500 font-bold text-sm mb-3 flex items-center gap-2">
                            <Banknote size={18} className="text-green-600"/> الخزينة النقدية (الرصيد الحالي)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-50 p-3 rounded-lg text-center border border-green-100">
                                <span className="text-xs text-green-600 block mb-1 font-bold">مصري (EGP)</span>
                                <span className="text-xl font-extrabold text-green-800">{fmt(reportData.egpBalance)}</span>
                            </div>
                            <div className="bg-indigo-50 p-3 rounded-lg text-center border border-indigo-100">
                                <span className="text-xs text-indigo-600 block mb-1 font-bold">سوداني (SDG)</span>
                                <span className="text-xl font-extrabold text-indigo-800">{fmt(reportData.sdgBalance)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sales Treasury (Clickable) */}
                    <div 
                        onClick={() => setDetailsModalType('sales')}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:border-purple-300 transition active:scale-95 group"
                    >
                        <div className="flex justify-between items-center mb-3">
                             <h3 className="text-gray-500 font-bold text-sm flex items-center gap-2">
                                <ShoppingCart size={18} className="text-purple-600"/> خزينة المبيعات
                            </h3>
                            <ChevronLeft size={16} className="text-gray-300 group-hover:text-purple-500 transition"/>
                        </div>
                        
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-purple-700 font-bold">الرصيد الكلي</span>
                                <span className="text-2xl font-extrabold text-purple-900">{fmt(reportData.salesBalance)} <span className="text-sm">EGP</span></span>
                            </div>
                            <div className="text-xs text-purple-400 font-bold text-right mt-1">
                                مبيعات الفترة: {fmt(reportData.totalSalesPeriod)} EGP
                            </div>
                        </div>
                    </div>

                    {/* Expenses (Clickable) */}
                    <div 
                        onClick={() => setDetailsModalType('expenses')}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:border-red-300 transition active:scale-95 group"
                    >
                        <div className="flex justify-between items-center mb-3">
                             <h3 className="text-gray-500 font-bold text-sm flex items-center gap-2">
                                <TrendingDown size={18} className="text-red-600"/> المنصرفات
                            </h3>
                            <ChevronLeft size={16} className="text-gray-300 group-hover:text-red-500 transition"/>
                        </div>
                        
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex justify-between items-center">
                            <span className="text-red-700 font-bold">منصرفات الفترة</span>
                            <span className="text-2xl font-extrabold text-red-900">{fmt(reportData.totalExpensesPeriod)} <span className="text-sm">EGP</span></span>
                        </div>
                    </div>

                    {/* E-Wallets */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-gray-500 font-bold text-sm mb-3 flex items-center gap-2">
                            <Smartphone size={18} className="text-pink-600"/> المحافظ الإلكترونية (الرصيد الحالي)
                        </h3>
                        {reportData.wallets.length > 0 ? (
                            <div className="space-y-2">
                                {reportData.wallets.map((wallet, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-800">{wallet.provider}</span>
                                            <span className="text-xs text-gray-500" dir="ltr">{wallet.phone}</span>
                                        </div>
                                        <span className="font-bold text-lg text-gray-800">{fmt(wallet.balance)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-gray-400 text-sm font-medium">
                                لا توجد محافظ مضافة لهذا الموظف
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Render Modal */}
            <DetailsModal />
        </div>
    </div>
  );
};

export default DailyReport;
