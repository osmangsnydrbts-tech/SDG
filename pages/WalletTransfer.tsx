
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Send, Smartphone, CheckCircle } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

const WalletTransfer: React.FC = () => {
  const { currentUser, eWallets, performEWalletTransfer, exchangeRates, companies } = useStore();
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [receipt, setReceipt] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  
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
    setMsg('');
    setError('');

    if (!selectedWalletId) {
        setError('يرجى اختيار المحفظة');
        return;
    }

    const res = await performEWalletTransfer(
        parseInt(selectedWalletId),
        parseFloat(amount),
        phone,
        receipt
    );

    if (res.success) {
        setMsg(res.message);
        setAmount('');
        setPhone('');
        setReceipt('');
        setSelectedWalletId('');
        if (res.transaction) {
            setLastTransaction(res.transaction);
        }
    } else {
        setError(res.message);
    }
  };

  const calculateTotal = () => {
      const val = parseFloat(amount);
      if (isNaN(val)) return 0;
      return val + (val * (commissionRate / 100));
  };

  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Smartphone size={24} className="text-blue-600" />
                تحويل محفظة إلكترونية
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

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">رقم المرسل إليه</label>
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
                        <label className="block text-sm font-bold text-gray-700 mb-1">المبلغ المراد تحويله</label>
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
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">مبلغ التحويل:</span>
                            <span className="font-bold">{amount || 0} EGP</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">العمولة ({commissionRate}%):</span>
                            <span className="font-bold text-red-500">
                                {(parseFloat(amount || '0') * (commissionRate / 100)).toFixed(2)} EGP
                            </span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between">
                            <span className="font-bold text-gray-800">إجمالي الخصم من العميل:</span>
                            <span className="font-bold text-blue-600 text-lg">{calculateTotal().toFixed(2)} EGP</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">رقم الإشعار / العملية</label>
                        <input 
                            type="text" 
                            inputMode="numeric"
                            value={receipt}
                            onChange={e => setReceipt(e.target.value)}
                            className="w-full p-3 border rounded-xl"
                            placeholder="رقم مرجعي (اختياري)"
                        />
                    </div>

                    {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium">{error}</div>}
                    {msg && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2"><CheckCircle size={16}/> {msg}</div>}

                    <button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Send size={20} /> تنفيذ التحويل
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
