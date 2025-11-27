
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, User, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const Merchants: React.FC = () => {
  const { currentUser, merchants, addMerchant, addMerchantEntry } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState<number | null>(null);

  // Add Merchant Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Entry Form
  const [entryType, setEntryType] = useState<'credit' | 'debit'>('debit');
  const [currency, setCurrency] = useState<'EGP' | 'SDG'>('EGP');
  const [amount, setAmount] = useState('');

  const companyMerchants = merchants.filter(m => m.company_id === currentUser?.company_id && m.is_active);

  const handleAddMerchant = (e: React.FormEvent) => {
      e.preventDefault();
      if(currentUser?.company_id) {
          addMerchant(currentUser.company_id, name, phone);
          setShowAddModal(false);
          setName(''); setPhone('');
      }
  };

  const handleEntry = (e: React.FormEvent) => {
      e.preventDefault();
      if(showEntryModal) {
          addMerchantEntry(showEntryModal, entryType, currency, parseFloat(amount));
          setShowEntryModal(null);
          setAmount('');
      }
  };

  return (
    <div className="space-y-4">
        <button onClick={() => setShowAddModal(true)} className="w-full bg-indigo-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md">
            <Plus size={20} /> إضافة تاجر جديد
        </button>

        <div className="space-y-3">
            {companyMerchants.map(m => (
                <div key={m.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-50 p-2 rounded-full text-indigo-600"><User size={20}/></div>
                            <div>
                                <h3 className="font-bold">{m.name}</h3>
                                <p className="text-xs text-gray-500">{m.phone}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowEntryModal(m.id)} className="text-xs bg-gray-100 px-3 py-1 rounded-lg font-bold hover:bg-gray-200">
                            تسجيل قيد
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between">
                            <span className="text-gray-500">مصري</span>
                            <span className={`font-bold ${m.egp_balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {m.egp_balance.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between border-r pr-2 border-gray-200">
                            <span className="text-gray-500">سوداني</span>
                            <span className={`font-bold ${m.sdg_balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {m.sdg_balance.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Add Modal */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                    <h3 className="font-bold mb-4">إضافة تاجر</h3>
                    <form onSubmit={handleAddMerchant} className="space-y-3">
                        <input type="text" placeholder="اسم التاجر" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border rounded-lg" required />
                        <input type="tel" placeholder="رقم الهاتف (اختياري)" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 border rounded-lg" />
                        <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold mt-2">حفظ</button>
                        <button type="button" onClick={() => setShowAddModal(false)} className="w-full bg-gray-100 py-2 rounded-lg text-sm">إلغاء</button>
                    </form>
                </div>
            </div>
        )}

        {/* Entry Modal */}
        {showEntryModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                    <h3 className="font-bold mb-4">تسجيل قيد جديد</h3>
                    <form onSubmit={handleEntry} className="space-y-3">
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setEntryType('debit')} className={`flex-1 p-2 border rounded-lg flex flex-col items-center gap-1 ${entryType === 'debit' ? 'bg-red-50 border-red-500 text-red-600' : ''}`}>
                                <ArrowDownLeft size={16}/> عليه (مدين)
                            </button>
                            <button type="button" onClick={() => setEntryType('credit')} className={`flex-1 p-2 border rounded-lg flex flex-col items-center gap-1 ${entryType === 'credit' ? 'bg-green-50 border-green-500 text-green-600' : ''}`}>
                                <ArrowUpRight size={16}/> له (دائن)
                            </button>
                        </div>
                        <select value={currency} onChange={e => setCurrency(e.target.value as any)} className="w-full p-3 border rounded-lg">
                            <option value="EGP">EGP</option>
                            <option value="SDG">SDG</option>
                        </select>
                        <input type="number" inputMode="decimal" placeholder="المبلغ" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 border rounded-lg text-lg font-bold" required />
                        <button className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold mt-2">تسجيل</button>
                        <button type="button" onClick={() => setShowEntryModal(null)} className="w-full bg-gray-100 py-2 rounded-lg text-sm">إلغاء</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default Merchants;
