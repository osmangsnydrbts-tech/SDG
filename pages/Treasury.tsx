
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowDownCircle, ArrowUpCircle, AlertCircle, CheckCircle2, UserCheck, Banknote, Loader2 } from 'lucide-react';

const Treasury: React.FC = () => {
  const { currentUser, treasuries, users, manageTreasury } = useStore();
  const [activeTab, setActiveTab] = useState<'main' | 'employee'>('main');
  
  // Modals
  const [showModal, setShowModal] = useState<false | 'deposit' | 'withdraw'>(false);
  const [modalActionType, setModalActionType] = useState<'feed' | 'withdraw'>('feed');
  const [modalTargetType, setModalTargetType] = useState<'main' | 'employee'>('main');

  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'EGP' | 'SDG'>('EGP');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get Main Treasury
  const mainTreasury = treasuries.find(t => t.company_id === currentUser?.company_id && !t.employee_id);
  
  // Get Employees
  const employees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee');

  const openActionModal = (action: 'feed' | 'withdraw', target: 'main' | 'employee', empId?: number) => {
      setModalActionType(action);
      setModalTargetType(target);
      if (empId) setSelectedEmployee(empId);
      setShowModal(action === 'feed' ? 'deposit' : 'withdraw');
      setMessage(null);
      setAmount('');
      setIsLoading(false);
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.company_id || isLoading) return;
    setMessage(null);
    setIsLoading(true);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
        setMessage({ type: 'error', text: 'يرجى إدخال مبلغ صحيح' });
        setIsLoading(false);
        return;
    }

    try {
        const res = await manageTreasury(
            modalActionType,
            modalTargetType,
            currentUser.company_id,
            currency,
            numericAmount,
            selectedEmployee || undefined
        );
        
        if (res.success) {
            setMessage({ type: 'success', text: res.message });
            setAmount('');
            setTimeout(() => setShowModal(false), 1500);
        } else {
            setMessage({ type: 'error', text: res.message });
        }
    } catch (err) {
        setMessage({ type: 'error', text: 'حدث خطأ غير متوقع' });
    } finally {
        setIsLoading(false);
    }
  };

  const getFormattedAmount = () => {
      const val = parseFloat(amount);
      if (isNaN(val)) return '0.00';
      return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-5 rounded-2xl shadow-lg">
          <p className="text-blue-200 text-sm mb-1">الخزينة الرئيسية (EGP)</p>
          <h3 className="text-2xl font-bold">{mainTreasury?.egp_balance.toLocaleString()}</h3>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-5 rounded-2xl shadow-lg">
          <p className="text-emerald-200 text-sm mb-1">الخزينة الرئيسية (SDG)</p>
          <h3 className="text-2xl font-bold">{mainTreasury?.sdg_balance.toLocaleString()}</h3>
        </div>
      </div>

      {/* Simplified Tabs */}
      <div className="flex bg-white p-1 rounded-xl border border-gray-200">
        <button 
            onClick={() => setActiveTab('main')}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition ${activeTab === 'main' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
            الخزينة الرئيسية
        </button>
        <button 
            onClick={() => setActiveTab('employee')}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition ${activeTab === 'employee' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
            تغذية حساب موظف
        </button>
      </div>

      {/* Main Treasury Actions */}
      {activeTab === 'main' && (
          <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => openActionModal('feed', 'main')}
                className="bg-green-50 border-2 border-green-200 p-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-green-100 transition active:scale-95"
              >
                  <div className="bg-green-500 text-white p-3 rounded-full shadow-md">
                      <ArrowDownCircle size={32} />
                  </div>
                  <span className="font-bold text-green-800 text-lg">إيداع / تغذية</span>
              </button>

              <button 
                onClick={() => openActionModal('withdraw', 'main')}
                className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl flex flex-col items-center gap-3 hover:bg-red-100 transition active:scale-95"
              >
                  <div className="bg-red-500 text-white p-3 rounded-full shadow-md">
                      <ArrowUpCircle size={32} />
                  </div>
                  <span className="font-bold text-red-800 text-lg">سحب خارجي</span>
              </button>
          </div>
      )}

      {/* Employee List & Actions */}
      {activeTab === 'employee' && (
          <div className="space-y-4">
              {employees.map(emp => {
                  const t = treasuries.find(tr => tr.employee_id === emp.id);
                  return (
                      <div key={emp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                  <div className="bg-blue-50 p-2 rounded-full text-blue-600"><UserCheck size={20}/></div>
                                  <div>
                                      <h3 className="font-bold">{emp.full_name}</h3>
                                      <p className="text-xs text-gray-400">{emp.username}</p>
                                  </div>
                              </div>
                              <div className="text-right text-xs">
                                  <div className="font-bold text-gray-800">{t?.egp_balance.toLocaleString()} EGP</div>
                                  <div className="text-gray-500">{t?.sdg_balance.toLocaleString()} SDG</div>
                              </div>
                          </div>
                          
                          <div className="flex gap-2">
                              <button 
                                onClick={() => openActionModal('feed', 'employee', emp.id)}
                                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm shadow hover:bg-green-700"
                              >
                                  + تغذية عهدة
                              </button>
                              <button 
                                onClick={() => openActionModal('withdraw', 'employee', emp.id)}
                                className="flex-1 bg-white border border-red-200 text-red-600 py-2 rounded-lg font-bold text-sm hover:bg-red-50"
                              >
                                  - استرداد
                              </button>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {/* Simplified Action Modal */}
      {showModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-end flex-col sm:justify-center">
              <div className="bg-white w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6 animate-slide-up">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800">
                          {modalActionType === 'feed' ? 'عملية إيداع' : 'عملية سحب'}
                          {modalTargetType === 'employee' && <span className="text-sm font-normal text-gray-500 block mt-1">الموظف: {users.find(u => u.id === selectedEmployee)?.full_name}</span>}
                      </h3>
                      <button onClick={() => setShowModal(false)} className="bg-gray-100 p-2 rounded-full text-gray-600">✕</button>
                  </div>

                  <form onSubmit={handleAction} className="space-y-5">
                      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                          <button type="button" onClick={() => setCurrency('EGP')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${currency === 'EGP' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>EGP (مصري)</button>
                          <button type="button" onClick={() => setCurrency('SDG')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${currency === 'SDG' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>SDG (سوداني)</button>
                      </div>

                      <div className="relative">
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                              <Banknote className="text-gray-400" />
                          </div>
                          <input 
                              type="number" 
                              inputMode="decimal"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="w-full pr-12 pl-4 py-4 text-2xl font-bold border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="0.00"
                              autoFocus
                          />
                          {amount && (
                            <div className="text-center mt-2 text-sm font-bold text-blue-600 bg-blue-50 py-1 rounded-lg">
                                {getFormattedAmount()} {currency}
                            </div>
                          )}
                      </div>

                      {message && (
                        <div className={`p-3 rounded-lg text-sm text-center font-bold flex items-center justify-center gap-2 ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {message.type === 'error' ? <AlertCircle size={16}/> : <CheckCircle2 size={16}/>}
                            {message.text}
                        </div>
                      )}

                      <button 
                        disabled={isLoading}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 ${modalActionType === 'feed' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} ${isLoading ? 'opacity-75 cursor-wait' : ''}`}
                      >
                          {isLoading ? (
                              <>
                                <Loader2 size={24} className="animate-spin" />
                                جاري المعالجة...
                              </>
                          ) : (
                              `تأكيد ${modalActionType === 'feed' ? 'الإيداع' : 'السحب'}`
                          )}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Treasury;
