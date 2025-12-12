
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { WalletCards, Banknote, ShoppingCart, Share2, User, Smartphone, AlertCircle } from 'lucide-react';

const DailyReport: React.FC = () => {
  const { currentUser, treasuries, eWallets, users, companies } = useStore();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('all');
  
  const company = companies.find(c => c.id === currentUser?.company_id);
  const companyEmployees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee');

  // Determine which employee to show
  const targetEmployeeId = currentUser?.role === 'employee' 
      ? currentUser.id 
      : (selectedEmpId === 'all' ? null : parseInt(selectedEmpId));

  const reportData = useMemo(() => {
    if (!targetEmployeeId) return null;

    const treasury = treasuries.find(t => t.employee_id === targetEmployeeId);
    const wallets = eWallets.filter(w => w.employee_id === targetEmployeeId && w.is_active);
    const employee = users.find(u => u.id === targetEmployeeId);

    return {
        employeeName: employee?.full_name || '',
        egpBalance: Math.round(treasury?.egp_balance || 0),
        sdgBalance: Math.round(treasury?.sdg_balance || 0),
        salesBalance: Math.round(treasury?.sales_balance || 0),
        wallets: wallets.map(w => ({
            provider: w.provider,
            phone: w.phone_number,
            balance: Math.round(w.balance)
        }))
    };
  }, [targetEmployeeId, treasuries, eWallets, users]);

  // Helper for formatting
  const fmt = (num: number) => Math.round(num).toLocaleString('en-US');

  const handleShare = async () => {
      if (!reportData) return;
      
      const date = new Date().toLocaleDateString('ar-EG');
      let text = `*تقرير اليومية - ${date}*\n`;
      text += `الموظف: ${reportData.employeeName}\n`;
      text += `------------------\n`;
      text += `💰 *الخزينة النقدية:*\n`;
      text += `مصري: ${fmt(reportData.egpBalance)} EGP\n`;
      text += `سوداني: ${fmt(reportData.sdgBalance)} SDG\n\n`;
      
      text += `🛒 *خزينة المبيعات:*\n`;
      text += `الرصيد: ${fmt(reportData.salesBalance)} EGP\n\n`;
      
      text += `📱 *المحافظ الإلكترونية:*\n`;
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

  return (
    <div className="space-y-6 pb-20">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">تقرير اليوم</h2>
                    <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
                        <Share2 size={20} /> مشاركة التقرير اليومي
                    </button>

                    {/* Cash Treasury */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-gray-500 font-bold text-sm mb-3 flex items-center gap-2">
                            <Banknote size={18} className="text-green-600"/> الخزينة النقدية (العهدة)
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

                    {/* Sales Treasury */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-gray-500 font-bold text-sm mb-3 flex items-center gap-2">
                            <ShoppingCart size={18} className="text-purple-600"/> خزينة المبيعات
                        </h3>
                        <div className="bg-purple-50 p-4 rounded-lg flex justify-between items-center border border-purple-100">
                            <span className="text-purple-700 font-bold">رصيد المبيعات الحالي</span>
                            <span className="text-2xl font-extrabold text-purple-900">{fmt(reportData.salesBalance)} <span className="text-sm">EGP</span></span>
                        </div>
                    </div>

                    {/* E-Wallets */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-gray-500 font-bold text-sm mb-3 flex items-center gap-2">
                            <Smartphone size={18} className="text-pink-600"/> المحافظ الإلكترونية
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
        </div>
    </div>
  );
};

export default DailyReport;
