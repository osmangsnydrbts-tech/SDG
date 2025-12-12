
import React, { useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { WalletCards, Banknote, TrendingDown, DollarSign, Filter, User } from 'lucide-react';

const DailyReport: React.FC = () => {
  const { transactions, currentUser, eWallets, users } = useStore();
  const [selectedEmpId, setSelectedEmpId] = useState<string>('all');
  
  const today = new Date().toISOString().split('T')[0];
  const companyEmployees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee');

  const reportData = useMemo(() => {
    // 1. Filter by Company and Date and Status
    let relevantTxs = transactions.filter(t => 
        t.company_id === currentUser?.company_id &&
        !t.is_cancelled &&
        t.created_at.startsWith(today)
    );

    // 2. Filter by Role/Selection
    if (currentUser?.role === 'employee') {
        relevantTxs = relevantTxs.filter(t => t.employee_id === currentUser.id);
    } else if (selectedEmpId !== 'all') {
        relevantTxs = relevantTxs.filter(t => t.employee_id === parseInt(selectedEmpId));
    }

    // Initial Stats
    let stats = {
        treasuryEGP: 0,
        treasurySDG: 0,
        incomingSDG: 0, // Added: Incoming SDG
        totalExpenses: 0,
        totalSales: 0,
        totalCommissions: 0,
        vodafone: { transfer: 0, deposit: 0, exchange: 0 },
        instaPay: { transfer: 0, deposit: 0, exchange: 0 }
    };

    relevantTxs.forEach(t => {
        // Exchange
        if (t.type === 'exchange') {
            if (t.from_currency === 'EGP') stats.treasuryEGP += t.from_amount;
            if (t.to_currency === 'EGP') stats.treasuryEGP -= (t.to_amount || 0);
            
            if (t.from_currency === 'SDG') {
                stats.treasurySDG += t.from_amount;
                stats.incomingSDG += t.from_amount; // Track Incoming SDG separately
            }
            if (t.to_currency === 'SDG') stats.treasurySDG -= (t.to_amount || 0);
        }

        // Expenses
        if (t.type === 'expense') {
             if (t.from_currency === 'EGP') stats.totalExpenses += t.from_amount;
        }

        // Sales
        if (t.type === 'sale') {
            stats.totalSales += t.from_amount;
        }

        // Commissions
        if (t.commission) {
            stats.totalCommissions += t.commission;
        }

        // Wallet Logic
        if (t.type === 'wallet_transfer' && t.wallet_id) {
            const wallet = eWallets.find(w => w.id === t.wallet_id);
            const provider = wallet?.provider.toLowerCase() || '';

            // Sums for Breakdown
            if (provider.includes('vodafone')) {
                if (t.wallet_type === 'withdraw') stats.vodafone.transfer += t.from_amount;
                if (t.wallet_type === 'deposit') stats.vodafone.deposit += t.from_amount;
                if (t.wallet_type === 'exchange') stats.vodafone.exchange += t.from_amount;
            }
            else if (provider.includes('instapay') || provider.includes('insta')) {
                if (t.wallet_type === 'withdraw') stats.instaPay.transfer += t.from_amount;
                if (t.wallet_type === 'deposit') stats.instaPay.deposit += t.from_amount;
                if (t.wallet_type === 'exchange') stats.instaPay.exchange += t.from_amount;
            }
        }
    });

    return stats;

  }, [transactions, currentUser, today, eWallets, selectedEmpId]);

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
                            <option value="all">كل الموظفين</option>
                            {companyEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                            ))}
                        </select>
                        <User className="absolute left-2 top-3 text-gray-400" size={16} />
                    </div>
                )}
            </div>

            {/* Grand Totals */}
            <div className="flex gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex-1 text-center border-l border-gray-300">
                    <p className="text-xs text-gray-500 mb-1">إجمالي مصري (EGP)</p>
                    <p className="text-xl font-extrabold text-blue-700">{(reportData.treasuryEGP + reportData.totalSales + reportData.totalCommissions - reportData.totalExpenses).toLocaleString()}</p>
                </div>
                <div className="flex-1 text-center">
                    <p className="text-xs text-gray-500 mb-1">إجمالي سوداني (SDG)</p>
                    <p className="text-xl font-extrabold text-emerald-700">{reportData.treasurySDG.toLocaleString()}</p>
                </div>
            </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-r-orange-500">
                <p className="text-xs text-gray-500 font-bold mb-1">وارد سوداني</p>
                <p className="text-lg font-bold text-gray-800">{reportData.incomingSDG.toLocaleString()}</p>
            </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-r-purple-500">
                <p className="text-xs text-gray-500 font-bold mb-1">إجمالي المبيعات</p>
                <p className="text-lg font-bold text-gray-800">{reportData.totalSales.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-r-yellow-500">
                <p className="text-xs text-gray-500 font-bold mb-1">العمولات المكتسبة</p>
                <p className="text-lg font-bold text-gray-800">{reportData.totalCommissions.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-r-4 border-r-red-500">
                <p className="text-xs text-gray-500 font-bold mb-1">إجمالي المنصرفات</p>
                <p className="text-lg font-bold text-red-600">{reportData.totalExpenses.toLocaleString()}</p>
            </div>
        </div>

        {/* Vodafone Breakdown */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="bg-red-600 text-white p-3 font-bold flex items-center gap-2">
                <span className="bg-white text-red-600 p-1 rounded text-xs font-bold">V</span>
                فودافون كاش (حركة الأموال)
            </div>
            <div className="divide-y divide-gray-100">
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">سحب (من المحفظة)</span>
                    <span className="font-bold">{reportData.vodafone.transfer.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">ايداع (في المحفظة)</span>
                    <span className="font-bold">{reportData.vodafone.deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">صرف (من المحفظة)</span>
                    <span className="font-bold">{reportData.vodafone.exchange.toLocaleString()}</span>
                </div>
            </div>
        </div>

        {/* InstaPay Breakdown */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="bg-purple-600 text-white p-3 font-bold flex items-center gap-2">
                <span className="bg-white text-purple-600 p-1 rounded text-xs font-bold">I</span>
                انستا باي (حركة الأموال)
            </div>
            <div className="divide-y divide-gray-100">
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">سحب (من المحفظة)</span>
                    <span className="font-bold">{reportData.instaPay.transfer.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">ايداع (في المحفظة)</span>
                    <span className="font-bold">{reportData.instaPay.deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">صرف (من المحفظة)</span>
                    <span className="font-bold">{reportData.instaPay.exchange.toLocaleString()}</span>
                </div>
            </div>
        </div>

    </div>
  );
};

export default DailyReport;
