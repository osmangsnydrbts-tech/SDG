
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Send, Smartphone, CheckCircle, Loader2, ArrowUpCircle, ArrowDownCircle, Coins } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

const WalletTransfer: React.FC = () => {
  const { currentUser, eWallets, performEWalletTransfer, exchangeRates, companies } = useStore();
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [transferType, setTransferType] = useState<'withdraw' | 'deposit' | 'exchange'>('withdraw');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Receipt State
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  const myWallets = eWallets.filter(w => 
    w.company_id === currentUser?.company_id && 
    w.is_active && 
    w.employee_id === currentUser?.id
  );

  const rates = exchangeRates.find(r => r.company_id === currentUser?.company_id);
  const commissionRate = rates?.ewallet_commission || 1;
  const company = companies.find(c => c.id === currentUser?.company_id);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setMsg('');
    setError('');
    setIsLoading(true);

    if (!selectedWalletId) {
        setError('يرجى اختيار المحفظة');
        setIsLoading(false);
        return;
    }

    try {
        const res = await performEWalletTransfer(
            parseInt(selectedWalletId),
            transferType,
            parseFloat(amount),
            phone,
            receipt
        );

        if (res.success) {
            setMsg(res.message);
            setAmount('');
            setPhone('');
            setReceipt('');
            if (res.transaction) {
                setLastTransaction(res.transaction);
            }
        } else {
            setError(res.message);
        }
    } catch (err) {
        setError('حدث خطأ غير متوقع');
    } finally {
        setIsLoading(false);
    }
  };

  // Helper Calculations
  const getCalculatedValues = () => {
      const val = parseFloat(amount);
      if (isNaN(val)) return { commission: 0, total: 0, egpEquivalent: 0 };

      if (transferType === 'exchange') {
          // SDG -> Wallet (EGP)
          const rate = rates?.sd_to_eg_rate || 1;
          const egpEquivalent = val / rate;
          const commission = egpEquivalent * (commissionRate / 100);
          return { commission, total: 0, egpEquivalent }; 
      }

      // EGP -> Wallet (Deposit/Withdraw)
      const commission = val * (commissionRate / 100);
      const total = val + commission; // For Withdraw (User gets cash + comm)
      return { commission, total, egpEquivalent: val };
  };

  const calc = getCalculatedValues();

  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Smartphone size={24} className="text-blue-600" />
                عمليات المحفظة الإلكترونية
            </h2>

            {myWallets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    لا توجد محافظ إلكترونية مخصصة لك. يرجى التواصل مع المدير.
                </div>
            ) : (
                <form onSubmit={handleTransfer} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">اختر المحفظة</label>
                        <select 
                            value={selectedWalletId} 
                            onChange={e => setSelectedWalletId(e.target.value)} 
                            className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">-- اختر المحفظة --</option>
                            {myWallets.map(w => (
                                <option key={w.id} value={w.id}>
                                    {w.phone_number} ({w.provider}) - الرصيد: {w.balance.toLocaleString()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setTransferType('withdraw')}
                            className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition ${transferType === 'withdraw' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}
                        >
                            <ArrowUpCircle size={20} />
                            <span className="font-bold text-xs">سحب (من المحفظة)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setTransferType('deposit')}
                            className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition ${transferType === 'deposit' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                        >
                            <ArrowDownCircle size={20} />
                            <span className="font-bold text-xs">إيداع (في المحفظة)</span>
                        </button>
                         <button
                            type="button"
                            onClick={() => setTransferType('exchange')}
                            className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition ${transferType === 'exchange' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}
                        >
                            <Coins size={20} />
                            <span className="font-bold text-xs">صرف (سوداني)</span>
                        </button>
                    </div>

                    {transferType === 'exchange' && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800">
                            <div className="flex justify-between items-center mb-1">
                                <span>سعر الصرف (SDG {'->'} EGP):</span>
                                <span className="font-bold">{rates?.sd_to_eg_rate}</span>
                            </div>
                            <p className="text-xs opacity-75">سيتم خصم القيمة المعادلة بالمصري من رصيد المحفظة.</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">رقم العميل / المرسل إليه</label>
                        <input 
                            type="tel" 
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="w-full p-3 border rounded-xl"
                            placeholder="01xxxxxxxxx"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            {transferType === 'exchange' ? 'المبلغ المستلم (SDG)' : 'المبلغ (EGP)'}
                        </label>
                        <input 
                            type="number" 
                            inputMode="decimal"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full p-3 border rounded-xl text-lg font-bold"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                        {transferType === 'exchange' ? (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">القيمة المعادلة:</span>
                                    <span className="font-bold">{calc.egpEquivalent.toLocaleString(undefined, {maximumFractionDigits: 0})} EGP</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">العمولة ({commissionRate}%):</span>
                                    <span className="font-bold text-green-600">{calc.commission.toLocaleString(undefined, {maximumFractionDigits: 1})} EGP</span>
                                </div>
                                <div className="border-t pt-2 mt-2">
                                    <div className="flex justify-between items-center text-sm text-red-600">
                                        <span>يخصم من المحفظة:</span>
                                        <span className="font-bold">{calc.egpEquivalent.toLocaleString(undefined, {maximumFractionDigits: 0})} EGP</span>
                                    </div>
                                    <div className="flex justify-between items-center text-lg text-green-700 mt-1">
                                        <span className="font-bold">يضاف للخزينة (EGP):</span>
                                        <span className="font-extrabold">{(calc.egpEquivalent + calc.commission).toLocaleString(undefined, {maximumFractionDigits: 0})} EGP</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">المبلغ:</span>
                                    <span className="font-bold">{amount || 0} EGP</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">العمولة ({commissionRate}%):</span>
                                    <span className="font-bold text-green-600">
                                        {calc.commission.toFixed(2)} EGP
                                    </span>
                                </div>
                                
                                <div className="border-t pt-2 mt-2">
                                    {transferType === 'withdraw' ? (
                                        <>
                                            <div className="flex justify-between items-center text-sm text-red-600 mb-1">
                                                <span>يخصم من المحفظة:</span>
                                                <span className="font-bold">{amount || 0} EGP</span>
                                            </div>
                                            <div className="flex justify-between items-center text-lg text-green-700">
                                                <span className="font-bold">يضاف إلى خزينتك:</span>
                                                <span className="font-extrabold">{(parseFloat(amount || '0') + calc.commission).toFixed(2)} EGP</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-center text-sm text-red-600 mb-1">
                                                <span>يخصم من خزينتك:</span>
                                                <span className="font-bold">{(parseFloat(amount || '0') - calc.commission).toFixed(2)} EGP</span>
                                            </div>
                                             <div className="flex justify-between items-center text-lg text-green-700">
                                                <span className="font-bold">يضاف إلى المحفظة:</span>
                                                <span className="font-extrabold">{parseFloat(amount || '0').toFixed(2)} EGP</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">رقم الإشعار (اختياري)</label>
                        <input 
                            type="text" 
                            inputMode="numeric"
                            value={receipt}
                            onChange={e => setReceipt(e.target.value)}
                            className="w-full p-3 border rounded-xl"
                            placeholder="رقم مرجعي"
                        />
                    </div>

                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium">{error}</div>}
                    {msg && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2"><CheckCircle size={16}/> {msg}</div>}

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className={`w-full py-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 text-white font-bold ${isLoading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                جاري المعالجة...
                            </>
                        ) : (
                            <>
                                <Send size={20} /> تنفيذ العملية
                            </>
                        )}
                    </button>
                </form>
            )}
        </div>

        {/* Receipt Modal */}
        {lastTransaction && (
            <ReceiptModal 
                transaction={lastTransaction} 
                company={company} 
                employee={currentUser!} 
                onClose={() => setLastTransaction(null)} 
            />
        )}
    </div>
  );
};

export default WalletTransfer;
