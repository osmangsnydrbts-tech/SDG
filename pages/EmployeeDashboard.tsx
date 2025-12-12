
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, ShoppingCart, Share2, TrendingDown, CheckCircle, Loader2, X, Smartphone, DollarSign } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

const EmployeeDashboard: React.FC = () => {
  const { currentUser, treasuries, transactions, companies, users, exchangeRates, recordExpense, performSale, eWallets } = useStore();
  const navigate = useNavigate();
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  
  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);

  // Forms
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState<'EGP' | 'SDG'>('EGP');
  const [expDesc, setExpDesc] = useState('');
  
  const [saleProduct, setSaleProduct] = useState('');
  const [saleAmount, setSaleAmount] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState('');

  const myTreasury = treasuries.find(t => t.employee_id === currentUser?.id);
  const rateData = exchangeRates.find(r => r.company_id === currentUser?.company_id);
  const company = companies.find(c => c.id === currentUser?.company_id);
  
  const myWallets = eWallets.filter(w => w.employee_id === currentUser?.id && w.is_active);

  const myTransactions = transactions
    .filter(t => t.employee_id === currentUser?.id && !t.is_cancelled)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const dailySales = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transactions
        .filter(t => t.employee_id === currentUser?.id && t.type === 'sale' && !t.is_cancelled && t.created_at.startsWith(today))
        .reduce((sum, t) => sum + t.from_amount, 0);
  }, [transactions, currentUser]);

  const getCompany = (companyId: number) => companies.find(c => c.id === companyId);
  const getEmployee = (empId?: number) => users.find(u => u.id === empId);

  const handleRecordExpense = async (e: React.FormEvent) => {
      e.preventDefault();
      if (currentUser?.company_id) {
          setIsProcessing(true);
          const res = await recordExpense(
              currentUser.id, 
              currentUser.company_id, 
              expCurrency, 
              parseFloat(expAmount), 
              expDesc
          );
          setIsProcessing(false);
          if (res.success) {
              setMsg(res.message);
              setTimeout(() => { setShowExpenseModal(false); setMsg(''); setExpAmount(''); setExpDesc(''); }, 1500);
          } else {
              alert(res.message);
          }
      }
  };

  const handleRecordSale = async (e: React.FormEvent) => {
      e.preventDefault();
      if (currentUser?.company_id) {
          setIsProcessing(true);
          const res = await performSale(
              currentUser.id,
              currentUser.company_id,
              saleProduct,
              parseFloat(saleAmount)
          );
          setIsProcessing(false);
          if (res.success) {
              setMsg(res.message);
              setTimeout(() => { setShowSalesModal(false); setMsg(''); setSaleProduct(''); setSaleAmount(''); }, 1500);
          } else {
              alert(res.message);
          }
      }
  };

  const handleShareRates = async () => {
    if (!rateData || !company) return;
    const footer = company.footer_message ? `\n\n${company.footer_message}` : (company.phone_numbers ? `\n📞 ${company.phone_numbers}` : '');
    const text = `
*${company.name}*
نشرة أسعار الصرف اليومية
📅 ${new Date().toLocaleDateString('ar-EG')}

💱 *الأسعار الحالية:*
🇸🇩 سوداني -> 🇪🇬 مصري: *${rateData.sd_to_eg_rate}*
🇪🇬 مصري -> 🇸🇩 سوداني: *${rateData.eg_to_sd_rate}*

📦 *الجملة:*
السعر: ${rateData.wholesale_rate}
أقل كمية: ${rateData.wholesale_threshold.toLocaleString()} EGP
${footer}
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({ title: 'نشرة أسعار الصرف', text: text });
      } catch (error) { console.log('Share cancelled'); }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('تم نسخ النشرة إلى الحافظة');
      } catch (err) { console.error('Failed to copy', err); }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Rate Card & Share */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-center">
             <div>
                 <p className="text-blue-100 text-xs mb-1">سعر الصرف اليوم</p>
                 <div className="flex gap-4">
                     <div>
                         <span className="text-2xl font-bold block">{rateData?.sd_to_eg_rate}</span>
                         <span className="text-[10px] opacity-75">سوداني {'->'} مصري</span>
                     </div>
                     <div className="h-10 w-px bg-blue-400"></div>
                     <div>
                         <span className="text-2xl font-bold block">{rateData?.eg_to_sd_rate}</span>
                         <span className="text-[10px] opacity-75">مصري {'->'} سوداني</span>
                     </div>
                 </div>
             </div>
             <button onClick={handleShareRates} className="bg-white/20 p-3 rounded-full hover:bg-white/30 transition backdrop-blur-sm flex flex-col items-center justify-center gap-1 min-w-[70px]">
                 <Share2 size={24} />
                 <span className="text-[10px] font-bold">مشاركة</span>
             </button>
          </div>
      </div>

      {/* Main Treasury Balances */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm text-gray-500 mb-3 font-bold">رصيد عهدتي</h3>
        <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-400 mb-1">مصري (EGP)</p>
                <p className="text-xl font-bold text-blue-700">{myTreasury?.egp_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-400 mb-1">سوداني (SDG)</p>
                <p className="text-xl font-bold text-emerald-700">{myTreasury?.sdg_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
        </div>

        {/* Sales Stats */}
        <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <div className="flex items-center gap-2 text-purple-600 font-bold">
                 <ShoppingCart size={18} />
                 <span className="text-sm">مبيعات اليوم</span>
            </div>
            <span className="text-lg font-bold text-purple-800">{dailySales.toLocaleString()} EGP</span>
        </div>
      </div>

      {/* Electronic Wallets Balances */}
      {myWallets.length > 0 && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-sm text-gray-500 mb-3 font-bold flex items-center gap-2">
                 <Smartphone size={16} /> محافظي الإلكترونية
             </h3>
             <div className="space-y-2">
                 {myWallets.map(w => (
                     <div key={w.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                         <div className="flex items-center gap-2">
                             <div className="text-xs font-bold text-gray-600">{w.provider}</div>
                             <div className="text-[10px] text-gray-400">{w.phone_number}</div>
                         </div>
                         <div className="font-bold text-gray-800">{w.balance.toLocaleString()} EGP</div>
                     </div>
                 ))}
             </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button 
            onClick={() => navigate('/exchange')}
            className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition hover:bg-blue-700"
        >
            <ArrowRightLeft size={24}/>
            <span className="font-bold text-xs">صرف عملة</span>
        </button>

        <button 
            onClick={() => navigate('/wallet-transfer')}
            className="bg-pink-600 text-white p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition hover:bg-pink-700"
        >
            <Smartphone size={24}/>
            <span className="font-bold text-xs">تحويل إلكتروني</span>
        </button>

        <button 
            onClick={() => setShowSalesModal(true)}
            className="bg-purple-600 text-white p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition hover:bg-purple-700"
        >
            <ShoppingCart size={24}/>
            <span className="font-bold text-xs">بيع منتج</span>
        </button>

        <button 
            onClick={() => setShowExpenseModal(true)}
            className="bg-red-50 text-red-600 border border-red-100 p-3 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition hover:bg-red-100"
        >
            <TrendingDown size={24}/>
            <span className="font-bold text-xs">منصرف</span>
        </button>
      </div>

      <div>
          <h3 className="font-bold text-gray-800 mb-3">آخر العمليات</h3>
          <div className="space-y-3">
              {myTransactions.map(t => (
                  <div 
                        key={t.id} 
                        onClick={() => setViewTransaction(t)}
                        className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 transition active:scale-95 border border-gray-100"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-gray-100 text-gray-600">
                                {t.type === 'exchange' ? <ArrowRightLeft size={16}/> : 
                                 t.type === 'sale' ? <ShoppingCart size={16} /> :
                                 t.type === 'expense' ? <TrendingDown size={16} /> : <Smartphone size={16} />}
                            </div>
                            <div>
                                <p className="text-sm font-bold">
                                    {t.type === 'exchange' ? 'صرف' : t.type === 'sale' ? 'بيع منتج' : t.type === 'expense' ? 'منصرف' : 'تحويل'}
                                </p>
                                <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{t.from_amount.toLocaleString()} <span className="text-xs">{t.from_currency}</span></p>
                        </div>
                    </div>
              ))}
              {myTransactions.length === 0 && <p className="text-center text-gray-400 text-sm">لا توجد عمليات اليوم</p>}
          </div>
      </div>

      {viewTransaction && (
        <ReceiptModal 
            transaction={viewTransaction} 
            company={getCompany(viewTransaction.company_id)} 
            employee={getEmployee(viewTransaction.employee_id)} 
            onClose={() => setViewTransaction(null)} 
        />
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-gray-800">تسجيل منصرفات</h3>
                      <button onClick={() => setShowExpenseModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-400"/></button>
                  </div>
                  <form onSubmit={handleRecordExpense} className="space-y-4">
                      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                          <button type="button" onClick={() => setExpCurrency('EGP')} className={`flex-1 py-2 rounded text-sm font-bold transition ${expCurrency === 'EGP' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>مصري</button>
                          <button type="button" onClick={() => setExpCurrency('SDG')} className={`flex-1 py-2 rounded text-sm font-bold transition ${expCurrency === 'SDG' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>سوداني</button>
                      </div>
                      <input type="number" inputMode="decimal" value={expAmount} onChange={e => setExpAmount(e.target.value)} className="w-full p-3 border rounded-xl text-lg font-bold" placeholder="0.00" required />
                      <input type="text" value={expDesc} onChange={e => setExpDesc(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="السبب" required />
                      {msg && <div className="text-green-600 text-center font-bold">{msg}</div>}
                      <button disabled={isProcessing} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center">
                          {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'تأكيد الخصم'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Sales Modal */}
      {showSalesModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-gray-800">تسجيل مبيعات</h3>
                      <button onClick={() => setShowSalesModal(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-400"/></button>
                  </div>
                  <form onSubmit={handleRecordSale} className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">اسم المنتج / الخدمة</label>
                          <input type="text" value={saleProduct} onChange={e => setSaleProduct(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="مثال: كرت شحن" required />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">سعر البيع (EGP)</label>
                          <input type="number" inputMode="decimal" value={saleAmount} onChange={e => setSaleAmount(e.target.value)} className="w-full p-3 border rounded-xl text-lg font-bold" placeholder="0.00" required />
                      </div>
                      <p className="text-xs text-purple-600 text-center">سيتم إضافة المبلغ إلى رصيد المبيعات المنفصل</p>
                      {msg && <div className="text-green-600 text-center font-bold">{msg}</div>}
                      <button disabled={isProcessing} className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold flex items-center justify-center">
                          {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'تأكيد البيع'}
                      </button>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};

export default EmployeeDashboard;
