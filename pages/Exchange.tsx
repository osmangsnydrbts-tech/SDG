
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowLeftRight, CheckCircle, Calculator, Loader2 } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';
import FormattedInput from '../components/FormattedInput';

const Exchange: React.FC = () => {
  const { currentUser, performExchange, exchangeRates, companies } = useStore();
  const [direction, setDirection] = useState<'SDG_TO_EGP' | 'EGP_TO_SDG'>('SDG_TO_EGP');
  const [amount, setAmount] = useState<string>('');
  const [result, setResult] = useState<number>(0);
  const [receipt, setReceipt] = useState('');
  const [isWholesale, setIsWholesale] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Receipt Modal State
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  const rates = exchangeRates.find(r => r.company_id === currentUser?.company_id);
  const company = companies.find(c => c.id === currentUser?.company_id);

  useEffect(() => {
    if (!rates || !amount) {
      setResult(0);
      setIsWholesale(false);
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return;

    if (direction === 'SDG_TO_EGP') {
      let finalRate = rates.sd_to_eg_rate;
      let calculatedEgp = numAmount / finalRate;

      if (calculatedEgp >= rates.wholesale_threshold) {
        setIsWholesale(true);
        finalRate = rates.wholesale_rate;
        calculatedEgp = numAmount / finalRate;
      } else {
        setIsWholesale(false);
      }
      setResult(calculatedEgp);
    } else {
      setIsWholesale(false);
      setResult(numAmount * rates.eg_to_sd_rate);
    }
  }, [amount, direction, rates]);

  const handleExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.company_id || isLoading) return;
    
    setSuccessMsg('');
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await performExchange(
        currentUser.id,
        currentUser.company_id,
        direction === 'SDG_TO_EGP' ? 'SDG' : 'EGP',
        parseFloat(amount),
        receipt
      );

      if (res.success) {
        setSuccessMsg(res.message);
        setAmount('');
        setReceipt('');
        if (res.transaction) {
            setLastTransaction(res.transaction);
        }
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
        setErrorMsg('حدث خطأ غير متوقع');
    } finally {
        setIsLoading(false);
    }
  };

  if (!rates) return <div className="p-4 text-center">لم يتم تحديد أسعار الصرف بعد</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">حاسبة الصرف</h2>
          <button 
            onClick={() => setDirection(prev => prev === 'SDG_TO_EGP' ? 'EGP_TO_SDG' : 'SDG_TO_EGP')}
            className="bg-blue-50 p-2 rounded-full text-blue-600 hover:bg-blue-100 transition"
          >
            <ArrowLeftRight size={24} />
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className={`flex-1 p-3 rounded-xl text-center border-2 transition-colors ${direction === 'SDG_TO_EGP' ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-50'}`}>
            <span className="block text-sm text-gray-500">من</span>
            <span className="font-bold block">{direction === 'SDG_TO_EGP' ? 'سوداني (SDG)' : 'مصري (EGP)'}</span>
          </div>
          <div className="flex items-center text-gray-400">
            <ArrowLeftRight size={20} />
          </div>
          <div className={`flex-1 p-3 rounded-xl text-center border-2 transition-colors ${direction === 'EGP_TO_SDG' ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-gray-50'}`}>
            <span className="block text-sm text-gray-500">إلى</span>
            <span className="font-bold block">{direction === 'EGP_TO_SDG' ? 'سوداني (SDG)' : 'مصري (EGP)'}</span>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>سعر الصرف الحالي:</span>
            <span className="font-bold">
              {direction === 'SDG_TO_EGP' 
                ? `${isWholesale ? rates.wholesale_rate + ' (جملة)' : rates.sd_to_eg_rate}` 
                : rates.eg_to_sd_rate}
            </span>
          </div>
          {direction === 'SDG_TO_EGP' && (
             <p className="text-xs text-gray-400">حد الجملة: {rates.wholesale_threshold.toLocaleString()} EGP</p>
          )}
        </div>

        <form onSubmit={handleExchange} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">المبلغ المراد صرفه</label>
            <FormattedInput
              value={amount}
              onChange={setAmount}
              className="w-full p-4 text-lg font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="0.00"
              required
            />
          </div>

          <div className="bg-blue-600 text-white p-4 rounded-xl flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <Calculator size={20} />
              <span className="font-medium">الصافي للعميل</span>
            </div>
            <span className="text-2xl font-bold">{result.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">رقم الإشعار</label>
            <input 
              type="text"
              inputMode="numeric"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl"
              placeholder="رقم العملية / الإشعار"
              required
            />
          </div>

          {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium">{errorMsg}</div>}
          {successMsg && <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2"><CheckCircle size={16}/> {successMsg}</div>}

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
              'تأكيد العملية'
            )}
          </button>
        </form>
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

export default Exchange;
