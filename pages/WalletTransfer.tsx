import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { CheckCircle, Loader2, Wallet, ArrowDown, ArrowUp } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

const WalletTransfer: React.FC = () => {
  const { 
    currentUser, 
    eWallets, 
    performEWalletWithdraw, 
    performEWalletDeposit,
    exchangeRates, 
    companies, 
    treasuries 
  } = useStore();
  
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [transferType, setTransferType] = useState<'withdrawal' | 'deposit'>('withdrawal');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'EGP' | 'SDG'>('EGP');
  const [receipt, setReceipt] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Receipt State
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  // محافظ المستخدم الحالية
  const myWallets = eWallets.filter(w => 
    w.company_id === currentUser?.company_id && 
    w.is_active && 
    w.employee_id === currentUser?.id
  );

  // خزينة الموظف الحالية
  const myTreasury = treasuries.find(t => 
    t.employee_id === currentUser?.id && 
    t.company_id === currentUser?.company_id
  );

  const rates = exchangeRates.find(r => r.company_id === currentUser?.company_id);
  const commissionRate = rates?.ewallet_commission || 1;
  const company = companies.find(c => c.id === currentUser?.company_id);
  const selectedWallet = myWallets.find(w => w.id.toString() === selectedWalletId);

  // حساب الرصيد المتاح بناءً على نوع العملية
  const getAvailableBalance = () => {
    if (!myTreasury) return 0;
    
    if (transferType === 'withdrawal') {
      // للسحب: رصيد المحفظة الإلكترونية
      return selectedWallet ? selectedWallet.balance : 0;
    } else {
      // للإيداع: رصيد خزينة الموظف للعملة المحددة
      return currency === 'EGP' ? myTreasury.egp_balance : myTreasury.sdg_balance;
    }
  };

  // حساب الإجمالي مع العمولة
  const calculateTotalWithCommission = () => {
    const val = parseFloat(amount);
    if (isNaN(val)) return 0;
    
    if (transferType === 'withdrawal') {
      // للسحب: المبلغ + العمولة
      return val + (val * (commissionRate / 100));
    } else {
      // للإيداع: المبلغ - العمولة (المبلغ الذي سيصل للمحفظة)
      return val - (val * (commissionRate / 100));
    }
  };

  const handleOperation = async (e: React.FormEvent) => {
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

    if (!myTreasury) {
      setError('خزينة الموظف غير موجودة');
      setIsLoading(false);
      return;
    }

    try {
      const amountNum = parseFloat(amount);

      if (isNaN(amountNum) || amountNum <= 0) {
        setError('يرجى إدخال مبلغ صحيح');
        setIsLoading(false);
        return;
      }

      let res;

      if (transferType === 'withdrawal') {
        // التحقق من رصيد المحفظة الإلكترونية للسحب
        const totalWithCommission = amountNum + (amountNum * (commissionRate / 100));
        if (selectedWallet && selectedWallet.balance < totalWithCommission) {
          setError(`الرصيد غير كافي للقيام بهذه العملية. الرصيد الحالي: ${selectedWallet.balance.toLocaleString()}`);
          setIsLoading(false);
          return;
        }

        // تنفيذ السحب من المحفظة
        res = await performEWalletWithdraw(
          parseInt(selectedWalletId),
          amountNum,
          currency,
          receipt,
          currentUser!.id
        );
      } else {
        // التحقق من رصيد خزينة الموظف للإيداع
        const currentBalance = currency === 'EGP' ? myTreasury.egp_balance : myTreasury.sdg_balance;
        if (currentBalance < amountNum) {
          setError(`رصيد خزينة الموظف غير كافي. الرصيد الحالي: ${currentBalance.toLocaleString()} ${currency}`);
          setIsLoading(false);
          return;
        }

        // تنفيذ الإيداع للمحفظة
        res = await performEWalletDeposit(
          parseInt(selectedWalletId),
          amountNum,
          currency,
          receipt,
          currentUser!.id
        );
      }

      if (res.success) {
        setMsg(res.message);
        setAmount('');
        setReceipt('');
        if (res.transaction) {
          setLastTransaction(res.transaction);
        }
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع');
      console.error('Error in wallet operation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number, curr: string = currency) => {
    return `${value.toLocaleString()} ${curr}`;
  };

  const getBalanceAfterOperation = () => {
    const val = parseFloat(amount || '0');
    if (isNaN(val)) return 0;
    
    if (transferType === 'withdrawal') {
      // رصيد المحفظة بعد السحب
      const walletBalance = selectedWallet ? selectedWallet.balance : 0;
      const totalDeduction = val + (val * (commissionRate / 100));
      return walletBalance - totalDeduction;
    } else {
      // رصيد خزينة الموظف بعد الإيداع
      const treasuryBalance = getAvailableBalance();
      return treasuryBalance - val;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Wallet size={24} className="text-blue-600" />
          إدارة المحفظة الإلكترونية
        </h2>

        {myWallets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            لا توجد محافظ إلكترونية مخصصة لك. يرجى التواصل مع المدير.
          </div>
        ) : !myTreasury ? (
          <div className="text-center py-8 text-gray-500">
            خزينة الموظف غير موجودة. يرجى التواصل مع المدير.
          </div>
        ) : (
          <form onSubmit={handleOperation} className="space-y-6">
            {/* Operation Type Selection */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                type="button"
                onClick={() => setTransferType('withdrawal')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  transferType === 'withdrawal'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowUp size={24} className={transferType === 'withdrawal' ? 'text-red-600' : 'text-gray-400'} />
                <span className="font-bold">سحب</span>
                <span className="text-sm text-gray-500">من المحفظة إلى الخزينة</span>
              </button>
              
              <button
                type="button"
                onClick={() => setTransferType('deposit')}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  transferType === 'deposit'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowDown size={24} className={transferType === 'deposit' ? 'text-green-600' : 'text-gray-400'} />
                <span className="font-bold">إيداع</span>
                <span className="text-sm text-gray-500">من الخزينة إلى المحفظة</span>
              </button>
            </div>

            {/* Current Balances Display */}
            <div className="bg-gray-50 p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">رصيد خزينة الموظف (EGP):</span>
                <span className="font-bold">{myTreasury.egp_balance.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">رصيد خزينة الموظف (SDG):</span>
                <span className="font-bold">{myTreasury.sdg_balance.toLocaleString()} SDG</span>
              </div>
            </div>

            {/* Wallet Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                اختر المحفظة {selectedWallet && `(الرصيد: ${selectedWallet.balance.toLocaleString()})`}
              </label>
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

            {/* Amount and Currency */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">
                المبلغ المراد {transferType === 'withdrawal' ? 'سحبه من المحفظة' : 'إيداعه للمحفظة'}
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input 
                    type="number" 
                    inputMode="decimal"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full p-3 border rounded-xl text-lg font-bold"
                    placeholder="0.00"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div className="w-32">
                  <select 
                    value={currency}
                    onChange={e => setCurrency(e.target.value as 'EGP' | 'SDG')}
                    className="w-full p-3 border rounded-xl bg-white"
                  >
                    <option value="EGP">EGP</option>
                    <option value="SDG">SDG</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Calculation Summary */}
            <div className={`p-4 rounded-xl space-y-2 ${transferType === 'withdrawal' ? 'bg-red-50' : 'bg-green-50'}`}>
              {transferType === 'withdrawal' ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">مبلغ السحب من المحفظة:</span>
                    <span className="font-bold">{formatCurrency(parseFloat(amount || '0'))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">العمولة ({commissionRate}%):</span>
                    <span className="font-bold text-red-500">
                      {formatCurrency(parseFloat(amount || '0') * (commissionRate / 100))}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-gray-800">إجمالي الخصم من المحفظة:</span>
                    <span className="font-bold text-red-600 text-lg">
                      {formatCurrency(calculateTotalWithCommission())}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">المبلغ المضاف إلى خزينة الموظف:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(parseFloat(amount || '0'))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">رصيد المحفظة بعد العملية:</span>
                    <span className="font-bold">
                      {formatCurrency(getBalanceAfterOperation())}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">مبلغ الإيداع للمحفظة:</span>
                    <span className="font-bold">{formatCurrency(parseFloat(amount || '0'))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">العمولة ({commissionRate}%):</span>
                    <span className="font-bold text-red-500">
                      {formatCurrency(parseFloat(amount || '0') * (commissionRate / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">صافي المبلغ للمحفظة:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(calculateTotalWithCommission())}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-gray-800">إجمالي الخصم من خزينة الموظف:</span>
                    <span className="font-bold text-red-600 text-lg">
                      {formatCurrency(parseFloat(amount || '0'))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">رصيد خزينة الموظف بعد العملية:</span>
                    <span className="font-bold">
                      {formatCurrency(getBalanceAfterOperation())}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Receipt Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                رقم الإشعار / العملية
              </label>
              <input 
                type="text" 
                inputMode="numeric"
                value={receipt}
                onChange={e => setReceipt(e.target.value)}
                className="w-full p-3 border rounded-xl"
                placeholder="رقم مرجعي (اختياري)"
              />
            </div>

            {/* Messages */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium">
                {error}
              </div>
            )}
            {msg && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2">
                <CheckCircle size={16} /> {msg}
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading || !selectedWalletId || !amount}
              className={`w-full py-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 text-white font-bold ${
                isLoading 
                  ? 'bg-blue-400 cursor-wait' 
                  : transferType === 'withdrawal'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
              } ${(!selectedWalletId || !amount) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  جاري المعالجة...
                </>
              ) : transferType === 'withdrawal' ? (
                <>
                  <ArrowUp size={20} /> تنفيذ السحب من المحفظة
                </>
              ) : (
                <>
                  <ArrowDown size={20} /> تنفيذ الإيداع للمحفظة
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
