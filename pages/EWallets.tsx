
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, Trash2, Smartphone, ArrowDownCircle, Loader2 } from 'lucide-react';

const EWallets: React.FC = () => {
  const { currentUser, eWallets, users, addEWallet, deleteEWallet, feedEWallet } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [phone, setPhone] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [provider, setProvider] = useState('Vodafone');

  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');

  const companyWallets = eWallets.filter(w => w.company_id === currentUser?.company_id && w.is_active);
  const companyEmployees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee' && u.is_active);

  const getEmpName = (id: number) => {
      return companyEmployees.find(e => e.id === id)?.full_name || 'Unknown';
  };

  const handleAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if (currentUser?.company_id && employeeId) {
          addEWallet(currentUser.company_id, parseInt(employeeId), phone, provider);
          setShowAddModal(false);
          setPhone(''); setEmployeeId('');
      }
  };

  const handleFeed = async (e: React.FormEvent) => {
      e.preventDefault();
      if (showFeedModal && !isLoading) {
          setIsLoading(true);
          try {
            const res = await feedEWallet(showFeedModal, parseFloat(amount));
            if (res.success) {
                setMsg('تمت التغذية بنجاح');
                setTimeout(() => { setShowFeedModal(null); setMsg(''); setAmount(''); }, 1000);
            } else {
                setMsg(res.message);
            }
          } catch (err) {
              setMsg('حدث خطأ');
          } finally {
              setIsLoading(false);
          }
      }
  };

  return (
    <div className="space-y-4">
        <button onClick={() => setShowAddModal(true)} className="w-full bg-pink-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md">
            <Plus size={20} /> إضافة محفظة جديدة
        </button>

        <div className="space-y-3">
            {companyWallets.map(w => (
                <div key={w.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-pink-50 p-2 rounded-full text-pink-600"><Smartphone size={20}/></div>
                            <div>
                                <h3 className="font-bold">{w.phone_number}</h3>
                                <p className="text-xs text-gray-500">{w.provider} - {getEmpName(w.employee_id)}</p>
                            </div>
                        </div>
                        <button onClick={() => deleteEWallet(w.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-full">
                            <Trash2 size={18} />
                        </button>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                         <div>
                             <span className="text-xs text-gray-500 block">الرصيد الحالي</span>
                             <span className="font-bold text-lg">{w.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</span>
                         </div>
                         <button 
                            onClick={() => setShowFeedModal(w.id)}
                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-green-700"
                         >
                             <ArrowDownCircle size={14}/> تغذية
                         </button>
                    </div>
                </div>
            ))}
            {companyWallets.length === 0 && <p className="text-center text-gray-500 py-8">لا توجد محافظ مسجلة</p>}
        </div>

        {/* Add Modal */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                    <h3 className="font-bold mb-4">إضافة محفظة إلكترونية</h3>
                    <form onSubmit={handleAdd} className="space-y-3">
                        <select 
                            value={employeeId} 
                            onChange={e => setEmployeeId(e.target.value)} 
                            className="w-full p-3 border rounded-lg bg-white"
                            required
                        >
                            <option value="">اختر الموظف المسؤول</option>
                            {companyEmployees.map(e => (
                                <option key={e.id} value={e.id}>{e.full_name}</option>
                            ))}
                        </select>
                        <input 
                            type="tel" 
                            placeholder="رقم المحفظة" 
                            value={phone} 
                            onChange={e => setPhone(e.target.value)} 
                            className="w-full p-3 border rounded-lg" 
                            required 
                        />
                        <select 
                            value={provider} 
                            onChange={e => setProvider(e.target.value)} 
                            className="w-full p-3 border rounded-lg bg-white"
                        >
                            <option value="Vodafone">Vodafone Cash</option>
                            <option value="Instapay">Instapay</option>
                            <option value="Etisalat">Etisalat Cash</option>
                            <option value="Orange">Orange Cash</option>
                            <option value="We">We Pay</option>
                        </select>
                        <button className="w-full bg-pink-600 text-white py-3 rounded-lg font-bold mt-2">حفظ</button>
                        <button type="button" onClick={() => setShowAddModal(false)} className="w-full bg-gray-100 py-2 rounded-lg text-sm">إلغاء</button>
                    </form>
                </div>
            </div>
        )}

        {/* Feed Modal */}
        {showFeedModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                    <h3 className="font-bold mb-4">تغذية رصيد المحفظة</h3>
                    <p className="text-xs text-gray-500 mb-4">سيتم خصم المبلغ من الخزينة الرئيسية (EGP)</p>
                    <form onSubmit={handleFeed} className="space-y-3">
                        <input 
                            type="number" 
                            inputMode="decimal"
                            placeholder="المبلغ (EGP)" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="w-full p-3 border rounded-lg font-bold text-lg" 
                            required 
                        />
                        {msg && <p className={`text-center text-sm font-bold ${msg.includes('بنجاح') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
                        
                        <button 
                            disabled={isLoading}
                            className={`w-full py-3 rounded-lg font-bold mt-2 flex items-center justify-center gap-2 text-white ${isLoading ? 'bg-green-400 cursor-wait' : 'bg-green-600'}`}
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'تأكيد التغذية'}
                        </button>
                        
                        <button type="button" onClick={() => {setShowFeedModal(null); setMsg('');}} className="w-full bg-gray-100 py-2 rounded-lg text-sm">إلغاء</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default EWallets;
