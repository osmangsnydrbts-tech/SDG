
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, Wallet, ArrowUpRight, ArrowDownLeft, Smartphone, Share2, TrendingDown, CheckCircle, Loader2, X } from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { Transaction } from '../types';

const EmployeeDashboard: React.FC = () => {
  const { currentUser, treasuries, transactions, companies, users, eWallets, exchangeRates, recordExpense } = useStore();
  const navigate = useNavigate();
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Expense Form State
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState<'EGP' | 'SDG'>('EGP');
  const [expDesc, setExpDesc] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState('');

  const myTreasury = treasuries.find(t => t.employee_id === currentUser?.id);
  const rateData = exchangeRates.find(r => r.company_id === currentUser?.company_id);
  const company = companies.find(c => c.id === currentUser?.company_id);

  const myTransactions = transactions
    .filter(t => t.employee_id === currentUser?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const myWalletsBalance = eWallets
    .filter(w => w.employee_id === currentUser?.id && w.is_active)
    .reduce((sum, w) => sum + w.balance, 0);

  const getCompany = (companyId: number) => companies.find(c => c.id === companyId);
  const getEmployee = (empId?: number) => users.find(u => u.id === empId);

  const getTransactionIcon = (type: string) => {
      if (type === 'exchange' || type === 'e_wallet' || type === 'treasury_withdraw' || type === 'wallet_withdrawal' || type === 'expense') {
          return { icon: <ArrowUpRight size={16} />, bg: 'bg-red-100', text: 'text-red-600' };
      } else {
          return { icon: <ArrowDownLeft size={16} />, bg: 'bg-green-100', text: 'text-green-600' };
      }
  };

  const getTransactionLabel = (type: string) => {
      switch(type) {
          case 'exchange': return 'صرف عملة';
          case 'e_wallet': return 'تحويل قديم'; // Legacy
          case 'wallet_deposit': return 'إيداع محفظة';
          case 'wallet_withdrawal': return 'سحب محفظة';
          case 'treasury_feed': return 'تغذية خزينة';
          case 'wallet_feed': return 'تغذية محفظة';
          case 'expense': return 'منصرفات';
          default: return 'سحب رصيد';
      }
  };

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

  const handleShareRates = async () => {
    if (!rateData || !company) return;

    // Use footer_message if available, otherwise fall back to phone_numbers
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
        await navigator.share({
          title: 'نشرة أسعار الصرف',
          text: text,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('تم نسخ النشرة إلى الحافظة');
      } catch (err) {
        console.error('Failed to copy', err);
      }
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
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
      </div>

      {/* Treasury Cards */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm text-gray-500 mb-3 flex items-center gap-2">
            <Wallet size={16} /> رصيد عهدتي
        </h3>
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
        
        {/* Wallet Balance Section */}
        <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="p-3 bg-pink-50 rounded-xl flex justify-between items-center">
                <div>
                    <p className="text-xs text-pink-400 mb-1 flex items-center gap-1"><Smartphone size={12}/> رصيد المحافظ</p>
                    <p className="text-xl font-bold text-pink-700">{myWalletsBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP</p>
                </div>
                <button 
                    onClick={() => navigate('/wallet-transfer')}
                    className="text-xs bg-white text-pink-600 px-3 py-1 rounded-lg shadow-sm font-bold border border-pink-100 hover:bg-pink-50"
                >
                    تحويل
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
            onClick={() => navigate('/exchange')}
            className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition hover:bg-blue-700"
        >
            <ArrowRightLeft size={24}/>
            <span className="font-bold text-sm">صرف عملة</span>
        </button>
        <button 
            onClick={() => setShowExpenseModal(true)}
            className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition hover:bg-red-100"
        >
            <TrendingDown size={24}/>
            <span className="font-bold text-sm">تسجيل منصرف</span>
        </button>
      </div>

      <div>
          <h3 className="font-bold text-gray-800 mb-3">آخر العمليات</h3>
          <div className="space-y-3">
              {myTransactions.map(t => {
                  const style = getTransactionIcon(t.type);
                  return (
                    <div 
                        key={t.id} 
                        onClick={() => setViewTransaction(t)}
                        className="bg-white p-3 rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:bg-gray-50 transition active:scale-95 border border-gray-100"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${style.bg} ${style.text}`}>
                                {style.icon}
                            </div>
                            <div>
                                <p className="text-sm font-bold">
                                    {getTransactionLabel(t.type)}
                                </p>
                                <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{t.from_amount.toLocaleString()} <span className="text-xs">{t.from_currency}</span></p>
                            {t.to_amount && <p className="text-xs text-gray-500">➜ {t.to_amount.toLocaleString()} {t.to_currency}</p>}
                            {t.type === 'expense' && <p className="text-xs text-gray-500 max-w-[100px] truncate">{t.description}</p>}
                        </div>
                    </div>
                  );
              })}
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

                      <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800 border border-yellow-100">
                          سيتم خصم المبلغ مباشرة من رصيد عهدتك الحالي.
                      </div>

                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">المبلغ</label>
                          <input 
                              type="number" 
                              inputMode="decimal"
                              value={expAmount}
                              onChange={e => setExpAmount(e.target.value)}
                              className="w-full p-3 border rounded-xl text-lg font-bold outline-none focus:border-blue-500"
                              placeholder="0.00"
                              required 
                          />
                      </div>

                      <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">البيان / السبب</label>
                          <input 
                              type="text" 
                              value={expDesc}
                              onChange={e => setExpDesc(e.target.value)}
                              className="w-full p-3 border rounded-xl outline-none focus:border-blue-500"
                              placeholder="مثال: وقود، نثريات، كهرباء..."
                              required 
                          />
                      </div>

                      {msg && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center font-bold flex items-center justify-center gap-2">
                            <CheckCircle size={16}/> {msg}
                        </div>
                      )}

                      <button 
                        disabled={isProcessing}
                        className="w-full bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 flex items-center justify-center"
                      >
                          {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'تأكيد الخصم'}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;
