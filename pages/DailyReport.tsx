
import React, { useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { WalletCards, Banknote, TrendingDown, DollarSign } from 'lucide-react';

const DailyReport: React.FC = () => {
  const { transactions, currentUser, eWallets, treasuries } = useStore();
  
  const today = new Date().toISOString().split('T')[0];

  const reportData = useMemo(() => {
    // Filter today's transactions for the current company
    const todayTxs = transactions.filter(t => 
        t.company_id === currentUser?.company_id &&
        !t.is_cancelled &&
        t.created_at.startsWith(today)
    );

    // Filter Logic for Roles (Employees see their own, Admin sees all)
    const filteredTxs = currentUser?.role === 'admin' 
        ? todayTxs 
        : todayTxs.filter(t => t.employee_id === currentUser?.id);

    // Initial Stats
    let stats = {
        treasuryEGP: 0,
        treasurySDG: 0,
        totalExpenses: 0,
        totalSales: 0,
        totalCommissions: 0,
        vodafone: { transfer: 0, deposit: 0, exchange: 0 },
        instaPay: { transfer: 0, deposit: 0, exchange: 0 }
    };

    filteredTxs.forEach(t => {
        // Treasury (Exchange Only)
        if (t.type === 'exchange') {
            if (t.from_currency === 'EGP') stats.treasuryEGP += t.from_amount;
            if (t.to_currency === 'EGP') stats.treasuryEGP -= (t.to_amount || 0); // Outflow? Usually we count inflow/outflow separately, but request said "Total Treasury"
            
            // Simplified: Just Sum of holdings for today's exchange activity?
            // "اجمالي الخذينة المصرية العملات فقط" -> Usually means cash In hand from exchanges. 
            // Let's assume Net flow or just Intake. 
            // Based on typical cashier logic: Cash In - Cash Out.
            
            // Re-evaluating: "Total EGP Treasury (Exchange Only)" -> Net EGP change from exchange ops.
            if (t.from_currency === 'EGP') stats.treasuryEGP += t.from_amount; // Received EGP
            if (t.to_currency === 'EGP') stats.treasuryEGP -= (t.to_amount || 0); // Paid EGP
            
            if (t.from_currency === 'SDG') stats.treasurySDG += t.from_amount;
            if (t.to_currency === 'SDG') stats.treasurySDG -= (t.to_amount || 0);
        }

        // Expenses
        if (t.type === 'expense') {
             // Expenses are usually in EGP or SDG. 
             // We can sum them as a value.
             // Assume EGP for total summary unless specified.
             if (t.from_currency === 'EGP') stats.totalExpenses += t.from_amount;
             // If SDG expenses exist, maybe add them? But usually reports unify currency.
        }

        // Sales
        if (t.type === 'sale') {
            stats.totalSales += t.from_amount;
        }

        // Commissions (from Wallets)
        if (t.commission) {
            stats.totalCommissions += t.commission;
        }

        // Wallet Logic
        if (t.type === 'wallet_transfer' && t.wallet_id) {
            const wallet = eWallets.find(w => w.id === t.wallet_id);
            const provider = wallet?.provider.toLowerCase() || '';

            // Vodafone
            if (provider.includes('vodafone')) {
                if (t.wallet_type === 'withdraw') stats.vodafone.transfer += t.from_amount;
                if (t.wallet_type === 'deposit') stats.vodafone.deposit += t.from_amount;
                if (t.wallet_type === 'exchange') stats.vodafone.exchange += t.from_amount;
            }
            // InstaPay
            else if (provider.includes('instapay') || provider.includes('insta')) {
                if (t.wallet_type === 'withdraw') stats.instaPay.transfer += t.from_amount;
                if (t.wallet_type === 'deposit') stats.instaPay.deposit += t.from_amount;
                if (t.wallet_type === 'exchange') stats.instaPay.exchange += t.from_amount;
            }
        }
    });

    return stats;

  }, [transactions, currentUser, today, eWallets]);

  return (
    <div className="space-y-6 pb-20">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">تقرير اليوم</h2>
            <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Main Totals */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                <p className="text-xs text-blue-600 font-bold mb-1">صافي الخزينة (EGP)</p>
                <p className="text-lg font-bold text-blue-800">{reportData.treasuryEGP.toLocaleString()} EGP</p>
                <p className="text-[10px] text-blue-400">صرافة فقط</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                <p className="text-xs text-emerald-600 font-bold mb-1">صافي الخزينة (SDG)</p>
                <p className="text-lg font-bold text-emerald-800">{reportData.treasurySDG.toLocaleString()} SDG</p>
                <p className="text-[10px] text-emerald-400">صرافة فقط</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                <p className="text-xs text-purple-600 font-bold mb-1">إجمالي المبيعات</p>
                <p className="text-lg font-bold text-purple-800">{reportData.totalSales.toLocaleString()} EGP</p>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                <p className="text-xs text-red-600 font-bold mb-1">إجمالي المنصرفات</p>
                <p className="text-lg font-bold text-red-800">{reportData.totalExpenses.toLocaleString()} EGP</p>
            </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-center mx-4">
             <p className="text-xs text-yellow-700 font-bold mb-1">إجمالي العمولات المكتسبة</p>
             <p className="text-2xl font-bold text-yellow-800">{reportData.totalCommissions.toLocaleString()} EGP</p>
        </div>

        {/* Vodafone Breakdown */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="bg-red-600 text-white p-3 font-bold flex items-center gap-2">
                <span className="bg-white text-red-600 p-1 rounded text-xs font-bold">V</span>
                فودافون كاش (بدون عمولة)
            </div>
            <div className="divide-y divide-gray-100">
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">تحويل (سحب)</span>
                    <span className="font-bold">{reportData.vodafone.transfer.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">ايداع</span>
                    <span className="font-bold">{reportData.vodafone.deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">صرف</span>
                    <span className="font-bold">{reportData.vodafone.exchange.toLocaleString()}</span>
                </div>
            </div>
        </div>

        {/* InstaPay Breakdown */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="bg-purple-600 text-white p-3 font-bold flex items-center gap-2">
                <span className="bg-white text-purple-600 p-1 rounded text-xs font-bold">I</span>
                انستا باي (بدون عمولة)
            </div>
            <div className="divide-y divide-gray-100">
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">تحويل (سحب)</span>
                    <span className="font-bold">{reportData.instaPay.transfer.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">ايداع</span>
                    <span className="font-bold">{reportData.instaPay.deposit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-3 text-sm">
                    <span className="text-gray-600">صرف</span>
                    <span className="font-bold">{reportData.instaPay.exchange.toLocaleString()}</span>
                </div>
            </div>
        </div>

    </div>
  );
};

export default DailyReport;
