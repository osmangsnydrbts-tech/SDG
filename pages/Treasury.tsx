
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowDownCircle, ArrowUpCircle, AlertCircle, CheckCircle2, UserCheck, Banknote, Loader2, Users, Landmark, Wallet } from 'lucide-react';
import FormattedInput from '../components/FormattedInput';

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
  
  // Get Employees (Active Only)
  const employees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee' && u.is_active);

  // Calculate Total Employee Treasuries
  const totalEmployeeEgp = treasuries
    .filter(t => t.company_id === currentUser?.company_id && t.employee_id)
    .reduce((sum, t) => sum + (t.egp_balance || 0), 0);

  const totalEmployeeSdg = treasuries
    .filter(t => t.company_id === currentUser?.company_id && t.employee_id)
    .reduce((sum, t) => sum + (t.sdg_balance || 0), 0);

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
      
      {/* Main Selection Tabs */}
      <div className="grid grid-cols-2 gap-4 p-1 bg-gray-200 rounded-2xl">
        <button 
            onClick={() => setActiveTab('main')}
            className={`flex flex-col items-center justify-center py-4 rounded-xl transition-all duration-300 ${activeTab === 'main' ? 'bg-white shadow-md text-blue-700 scale-[1.02]' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            <Landmark size={28} className="mb-2" />
            <span className="font-bold text-lg">الخزينة الرئيسية</span>
        </button>
        <button 
            onClick={() => setActiveTab('employee')}
            className={`flex flex-col items-center justify-center py-4 rounded-xl transition-all duration-300 ${activeTab === 'employee' ? 'bg-white shadow-md text-blue-700 scale-[1.02]' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            <Users size={28} className="mb-2" />
            <span className="font-bold text-lg">خزينة الموظفين</span>
        </button>
      </div>

      {/* ================= MAIN TREASURY VIEW ================= */}
      {activeTab === 'main' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             <div className="flex items-center gap-2 text-gray-800 font-bold text-xl px-2">
                <Landmark size={24} className="text-blue-600" />
                <h2>أرصدة الخزينة الرئيسية</h2>
             </div>

             {/* Main Treasury Stats */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg border border-blue-500/50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <span className="font-bold text-lg">EGP</span>
                        </div>
                        <Banknote className="opacity-50" size={32} />
                    </div>
                    <p className="text-blue-100 text-sm mb-1">الرصيد المصري</p>
                    <h3 className="text-3xl font-bold tracking-tight">{mainTreasury?.egp_balance.toLocaleString()}</h3>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 rounded-2xl shadow-lg border border-emerald-500/50">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <span className="font-bold text-lg">SDG</span>
                        </div>
                        <Banknote className="opacity-50" size={32} />
                    </div>
                    <p className="text-emerald-100 text-sm mb-1">الرصيد السوداني</p>
                    <h3 className="text-3xl font-bold tracking-tight">{mainTreasury?.sdg_balance.toLocaleString()}</h3>
                </div>
             </div>

             {/* Actions */}
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-gray-500 font-bold mb-4">إجراءات مباشرة</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                    onClick={() => openActionModal('feed', 'main')}
                    className="group bg-green-50 border-2 border-green-100 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-green-100 transition active:scale-95"
                    >
                        <div className="bg-green-500 text-white p-3 rounded-full shadow-md group-hover:scale-110 transition">
                            <ArrowDownCircle size={24} />
                        </div>
                        <span className="font-bold text-green-800">إيداع / تغذية</span>
                    </button>

                    <button 
                    onClick={() => openActionModal('withdraw', 'main')}
                    className="group bg-red-50 border-2 border-red-100 p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-red-100 transition active:scale-95"
                    >
                        <div className="bg-red-500 text-white p-3 rounded-full shadow-md group-hover:scale-110 transition">
                            <ArrowUpCircle size={24} />
                        </div>
                        <span className="font-bold text-red-800">سحب خارجي</span>
                    </button>
                </div>
             </div>
          </div>
      )}

      {/* ================= EMPLOYEE TREASURY VIEW ================= */}
      {activeTab === 'employee' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex items-center gap-2 text-gray-800 font-bold text-xl px-2">
                <Users size={24} className="text-blue-600" />
                <h2>إجمالي عهدة الموظفين</h2>
             </div>

              {/* Total Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border-b-4 border-blue-500 shadow-sm">
                    <p className="text-gray-500 text-xs mb-2 font-bold flex items-center gap-1"><Wallet size={14}/> إجمالي المصري</p>
                    <p className="text-2xl font-bold text-gray-800">{totalEmployeeEgp.toLocaleString()}</p>
                    <span className="text-xs text-gray-400">EGP</span>
                </div>
                <div className="bg-white p-5 rounded-2xl border-b-4 border-emerald-500 shadow-sm">
                    <p className="text-gray-500 text-xs mb-2 font-bold flex items-center gap-1"><Wallet size={14}/> إجمالي السوداني</p>
                    <p className="text-2xl font-bold text-gray-800">{totalEmployeeSdg.toLocaleString()}</p>
                    <span className="text-xs text-gray-400">SDG</span>
                </div>
              </div>

              {/* Employee List */}
              <div className="space-y-4">
                  <h3 className="text-gray-500 font-bold px-2">تفاصيل الموظفين</h3>
                  {employees.map(emp => {
                      const t = treasuries.find(tr => tr.employee_id === emp.id);
                      return (
                          <div key={emp.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-200 transition">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                      <div className="bg-blue-50 p-3 rounded-full text-blue-600"><UserCheck size={20}/></div>
                                      <div>
                                          <h3 className="font-bold text-lg">{emp.full_name}</h3>
                                          <p className="text-xs text-gray-400">@{emp.username}</p>
                                      </div>
                                  </div>
                                  <div className="text-left bg-gray-50 p-2 rounded-lg min-w-[100px]">
                                      <div className="font-bold text-gray-800">{t?.egp_balance.toLocaleString()} <span className="text-xs text-gray-500">EGP</span></div>
                                      <div className="font-bold text-gray-600 text-sm">{t?.sdg_balance.toLocaleString()} <span className="text-xs text-gray-400">SDG</span></div>
                                  </div>
                              </div>
                              
                              <div className="flex gap-3">
                                  <button 
                                    onClick={() => openActionModal('feed', 'employee', emp.id)}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow hover:bg-green-700 flex items-center justify-center gap-2"
                                  >
                                      <ArrowDownCircle size={16}/> تغذية عهدة
                                  </button>
                                  <button 
                                    onClick={() => openActionModal('withdraw', 'employee', emp.id)}
                                    className="flex-1 bg-white border border-red-200 text-red-600 py-3 rounded-xl font-bold text-sm hover:bg-red-50 flex items-center justify-center gap-2"
                                  >
                                      <ArrowUpCircle size={16}/> استرداد
                                  </button>
                              </div>
                          </div>
                      );
                  })}
                  {employees.length === 0 && (
                      <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
                          <Users className="mx-auto text-gray-300 mb-2" size={40} />
                          <p className="text-gray-500">لا يوجد موظفين نشطين</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Action Modal */}
      {showModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-end flex-col sm:justify-center">
              <div className="bg-white w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6 animate-slide-up">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800">
                          {modalActionType === 'feed' ? 'عملية إيداع / تغذية' : 'عملية سحب / استرداد'}
                      </h3>
                      <button onClick={() => setShowModal(false)} className="bg-gray-100 p-2 rounded-full text-gray-600">✕</button>
                  </div>

                  {modalTargetType === 'employee' && (
                     <div className="bg-blue-50 p-3 rounded-xl mb-4 text-sm text-blue-800 font-bold flex items-center gap-2">
                         <UserCheck size={16}/>
                         الموظف: {users.find(u => u.id === selectedEmployee)?.full_name}
                     </div>
                  )}

                  <form onSubmit={handleAction} className="space-y-5">
                      <label className="block text-sm font-bold text-gray-600">اختر العملة:</label>
                      <div className="flex gap-3">
                          <button type="button" onClick={() => setCurrency('EGP')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition border-2 flex flex-col items-center gap-1 ${currency === 'EGP' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-500'}`}>
                              <span className="text-lg">مصري</span>
                              <span className="text-xs">EGP</span>
                          </button>
                          <button type="button" onClick={() => setCurrency('SDG')} className={`flex-1 py-3 rounded-xl font-bold text-sm transition border-2 flex flex-col items-center gap-1 ${currency === 'SDG' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-500'}`}>
                              <span className="text-lg">سوداني</span>
                              <span className="text-xs">SDG</span>
                          </button>
                      </div>

                      <div className="relative">
                          <label className="block text-sm font-bold text-gray-600 mb-2">المبلغ:</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                <Banknote className="text-gray-400" />
                            </div>
                            <FormattedInput 
                                value={amount}
                                onChange={setAmount}
                                className="w-full pr-12 pl-4 py-4 text-2xl font-bold border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                                autoFocus
                            />
                          </div>
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
