
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { FileText, Download, Filter, PieChart, ArrowUpRight, ArrowDownLeft, Calculator, Search, Eye } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

type TabType = 'stats' | 'exchange' | 'treasury' | 'breakdown';

const Reports: React.FC = () => {
  const { transactions, currentUser, users, companies } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('breakdown');
  const [filterType, setFilterType] = useState<'day' | 'month' | 'all'>('day');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
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

  // Base Filter Logic
  const getFilteredTransactions = () => {
      return transactions.filter(t => {
        // Role Check
        let roleMatch = false;
        if (currentUser?.role === 'super_admin') roleMatch = true;
        else if (currentUser?.role === 'admin') roleMatch = t.company_id === currentUser.company_id;
        else roleMatch = t.employee_id === currentUser?.id;

        if (!roleMatch) return false;

        // Search Query Check (Receipt Number)
        if (searchQuery) {
            return t.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase());
        }

        // Date Check
        const txDate = new Date(t.created_at);
        const selDate = new Date(selectedDate);
        
        if (filterType === 'day') {
            return txDate.toISOString().split('T')[0] === selectedDate;
        } else if (filterType === 'month') {
            return txDate.getMonth() === selDate.getMonth() && txDate.getFullYear() === selDate.getFullYear();
        }
        return true;
      });
  };

  const filtered = getFilteredTransactions();
  const exchangeTx = filtered.filter(t => t.type === 'exchange');
  const treasuryTx = filtered.filter(t => ['treasury_feed', 'treasury_withdraw'].includes(t.type));
  const walletTx = filtered.filter(t => t.type === 'e_wallet');

  // --- STATS CALCULATION ---
  const stats = {
      exchangeCount: exchangeTx.length,
      sdgVolume: exchangeTx.filter(t => t.from_currency === 'SDG').reduce((sum, t) => sum + t.from_amount, 0),
      egpVolume: exchangeTx.filter(t => t.from_currency === 'EGP').reduce((sum, t) => sum + t.from_amount, 0),
      totalCommission: filtered.reduce((sum, t) => sum + (t.commission || 0), 0),
      receivedSdg: exchangeTx.filter(t => t.from_currency === 'SDG').reduce((sum, t) => sum + t.from_amount, 0),
      receivedEgp: exchangeTx.filter(t => t.from_currency === 'EGP').reduce((sum, t) => sum + t.from_amount, 0),
      walletCommission: walletTx.reduce((sum, t) => sum + (t.commission || 0), 0),
  };

  const handleExport = () => {
    const headers = ["ID", "التاريخ", "الموظف", "النوع", "من", "المبلغ", "إلى", "المبلغ", "السعر", "العمولة", "رقم الإشعار"];
    
    // Export based on active tab or all
    const dataToExport = activeTab === 'exchange' ? exchangeTx : activeTab === 'treasury' ? treasuryTx : filtered;

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
    link.setAttribute("download", `report_${activeTab}_${filterType}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
        {/* Controls Section */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <Filter size={20} /> تصفية البيانات
                </h2>
                <button 
                    onClick={handleExport}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-green-700 transition"
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
                    placeholder="بحث برقم الإشعار..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilterType('day')} className={`px-4 py-2 rounded-lg text-sm font-bold border ${filterType === 'day' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50'}`}>يومي</button>
                <button onClick={() => setFilterType('month')} className={`px-4 py-2 rounded-lg text-sm font-bold border ${filterType === 'month' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50'}`}>شهري</button>
                <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-lg text-sm font-bold border ${filterType === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50'}`}>الكل</button>
            </div>

            {filterType !== 'all' && (
                <input 
                    type={filterType === 'day' ? 'date' : 'month'}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-gray-50 font-bold text-center"
                />
            )}
        </div>

        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 overflow-x-auto">
            <button onClick={() => setActiveTab('breakdown')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap ${activeTab === 'breakdown' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500'}`}>تقرير تفصيلي</button>
            <button onClick={() => setActiveTab('stats')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap ${activeTab === 'stats' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500'}`}>رسوم بيانية</button>
            <button onClick={() => setActiveTab('exchange')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap ${activeTab === 'exchange' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500'}`}>سجل الصرف</button>
            <button onClick={() => setActiveTab('treasury')} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg whitespace-nowrap ${activeTab === 'treasury' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500'}`}>سجل الخزينة</button>
        </div>

        {/* Detailed Breakdown Tab */}
        {activeTab === 'breakdown' && (
             <div className="space-y-4">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <FileText size={24} className="text-blue-600" />
                        تقرير العمليات المفصل
                    </h3>
                    
                    <div className="space-y-6">
                        {/* SDG Section */}
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                            <h4 className="font-bold text-orange-800 mb-2">مقبوضات العملة السودانية (SDG)</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">إجمالي ما تم استلامه:</span>
                                <span className="text-2xl font-bold text-orange-700">{stats.receivedSdg.toLocaleString()} SDG</span>
                            </div>
                        </div>

                        {/* EGP Section */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="font-bold text-blue-800 mb-2">مقبوضات العملة المصرية (EGP)</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">إجمالي ما تم استلامه:</span>
                                <span className="text-2xl font-bold text-blue-700">{stats.receivedEgp.toLocaleString()} EGP</span>
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
                                <span className="text-2xl font-bold text-green-700">{stats.walletCommission.toLocaleString()} EGP</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t text-sm text-gray-500 text-center">
                             عدد عمليات الصرف: {stats.exchangeCount} | عدد عمليات المحفظة: {walletTx.length}
                        </div>
                    </div>
                 </div>
             </div>
        )}

        {/* Charts & Graphs */}
        {activeTab === 'stats' && (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs mb-1">إجمالي العمليات</div>
                        <div className="text-2xl font-bold">{filtered.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-gray-500 text-xs mb-1">إجمالي العمولات</div>
                        <div className="text-2xl font-bold text-green-600">{stats.totalCommission.toLocaleString()} <span className="text-xs">EGP</span></div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><PieChart size={18}/> نسب التداول</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="flex items-center gap-1"><ArrowDownLeft size={14} className="text-blue-500"/> شراء سوداني (SDG)</span>
                                <span className="font-bold">{stats.egpVolume.toLocaleString()} EGP</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="flex items-center gap-1"><ArrowUpRight size={14} className="text-orange-500"/> بيع سوداني (SDG)</span>
                                <span className="font-bold">{stats.sdgVolume.toLocaleString()} SDG</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Exchange Log */}
        {activeTab === 'exchange' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-4 bg-gray-50 font-bold border-b text-sm text-gray-700">سجل عمليات الصرف</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <tr>
                                <th className="p-3">الوقت</th>
                                <th className="p-3">الموظف</th>
                                <th className="p-3">من</th>
                                <th className="p-3">إلى</th>
                                <th className="p-3">الإشعار</th>
                                <th className="p-3">عرض</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {exchangeTx.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-600">
                                        <div className="font-bold">{new Date(t.created_at).toLocaleDateString('ar-EG')}</div>
                                        <div className="text-xs">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</div>
                                    </td>
                                    <td className="p-3">{getEmployeeName(t.employee_id)}</td>
                                    <td className="p-3 font-bold">{t.from_amount.toLocaleString()} {t.from_currency}</td>
                                    <td className="p-3 text-gray-500">{t.to_amount?.toLocaleString()} {t.to_currency}</td>
                                    <td className="p-3 text-xs text-gray-400">{t.receipt_number || '-'}</td>
                                    <td className="p-3">
                                        <button onClick={() => setViewTransaction(t)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full">
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {exchangeTx.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد عمليات</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Treasury Log */}
        {activeTab === 'treasury' && (
             <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
             <div className="p-4 bg-gray-50 font-bold border-b text-sm text-gray-700">سجل حركة الخزينة</div>
             <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                     <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                         <tr>
                             <th className="p-3">الوقت</th>
                             <th className="p-3">النوع</th>
                             <th className="p-3">المبلغ</th>
                             <th className="p-3">الوصف</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y">
                         {treasuryTx.map(t => (
                             <tr key={t.id} className="hover:bg-gray-50">
                                 <td className="p-3 text-gray-600">
                                     <div className="font-bold">{new Date(t.created_at).toLocaleDateString('ar-EG')}</div>
                                     <div className="text-xs">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</div>
                                 </td>
                                 <td className="p-3">
                                     <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.type === 'treasury_feed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                         {t.type === 'treasury_feed' ? 'إيداع/تغذية' : 'سحب/استرداد'}
                                     </span>
                                 </td>
                                 <td className="p-3 font-bold">{t.from_amount.toLocaleString()} {t.from_currency}</td>
                                 <td className="p-3 text-xs text-gray-500">{t.description}</td>
                             </tr>
                         ))}
                         {treasuryTx.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا توجد حركات</td></tr>}
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
