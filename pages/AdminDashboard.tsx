
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { Landmark, UserPlus, Users, Wallet, Trash2, Key, Percent, Pencil, Share2, X, Loader2, FileText, Lock, Store, TrendingDown, ArrowDownCircle, ArrowUpCircle, Settings } from 'lucide-react';
import { User } from '../types';

const AdminDashboard: React.FC = () => {
  const { currentUser, exchangeRates, updateExchangeRate, addEmployee, updateEmployee, users, updateEmployeePassword, deleteEmployee, companies, treasuries, transactions } = useStore();
  const navigate = useNavigate();
  const rateData = exchangeRates.find(r => r.company_id === currentUser?.company_id);
  const company = companies.find(c => c.id === currentUser?.company_id);

  const [showRateModal, setShowRateModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showManageEmpModal, setShowManageEmpModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [editPassId, setEditPassId] = useState<number | null>(null);
  const [editInfoId, setEditInfoId] = useState<User | null>(null);

  const [selectedEmpReport, setSelectedEmpReport] = useState<User | null>(null);
  const [empToDelete, setEmpToDelete] = useState<number | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');

  // Rate Form
  const [sdRate, setSdRate] = useState(rateData?.sd_to_eg_rate || 74);
  const [egRate, setEgRate] = useState(rateData?.eg_to_sd_rate || 73);
  const [wholesale, setWholesale] = useState(rateData?.wholesale_rate || 72.5);
  const [threshold, setThreshold] = useState(rateData?.wholesale_threshold || 30000);
  const [commission, setCommission] = useState(rateData?.ewallet_commission || 1);

  // Emp Add Form
  const [empName, setEmpName] = useState('');
  const [empUser, setEmpUser] = useState('');
  const [empPass, setEmpPass] = useState('');
  const [error, setError] = useState('');

  // Emp Edit Form
  const [editName, setEditName] = useState('');
  const [editUser, setEditUser] = useState('');
  const [newPass, setNewPass] = useState('');

  const companyEmployees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee' && u.is_active);

  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if(currentUser?.company_id) {
        setIsProcessing(true);
        await updateExchangeRate(currentUser.company_id, {
            sd_to_eg_rate: sdRate,
            eg_to_sd_rate: egRate,
            wholesale_rate: wholesale,
            wholesale_threshold: threshold,
            ewallet_commission: commission
        });
        setIsProcessing(false);
        setShowRateModal(false);
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

  const handleAddEmployee = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if(currentUser?.company_id) {
          setIsProcessing(true);
          const res = await addEmployee(currentUser.company_id, empName, empUser, empPass);
          if (res.success) {
            setShowEmpModal(false);
            setEmpName(''); setEmpUser(''); setEmpPass('');
          } else {
            setError(res.message);
          }
          setIsProcessing(false);
      }
  };

  const openEditInfo = (user: User) => {
      setEditInfoId(user);
      setEditName(user.full_name);
      setEditUser(user.username);
      setError('');
  };

  const handleUpdateInfo = async () => {
      if (!editInfoId) return;
      setIsProcessing(true);
      const res = await updateEmployee(editInfoId.id, { full_name: editName, username: editUser });
      if (res.success) {
          setEditInfoId(null);
      } else {
          setError(res.message);
      }
      setIsProcessing(false);
  };

  const handleChangePassword = async (id: number) => {
      if (newPass.length < 3) return;
      setIsProcessing(true);
      await updateEmployeePassword(id, newPass);
      setIsProcessing(false);
      setEditPassId(null);
      setNewPass('');
  };

  const initiateDeleteEmployee = (id: number) => {
      setEmpToDelete(id);
      setConfirmPassword('');
      setError('');
  };

  const confirmDeleteEmployee = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!empToDelete || !currentUser) return;
      
      if (confirmPassword === currentUser.password) {
        setIsProcessing(true);
        await deleteEmployee(empToDelete);
        setIsProcessing(false);
        setEmpToDelete(null);
        setConfirmPassword('');
      } else {
          setError('كلمة المرور غير صحيحة');
      }
  };

  // Dashboard Button Component
  const DashboardBtn = ({ title, icon: Icon, color, onClick }: any) => (
    <button 
      onClick={onClick} 
      className={`${color} text-white p-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition min-h-[140px]`}
    >
      <div className="bg-white/20 p-3 rounded-full">
        <Icon size={32} />
      </div>
      <span className="font-bold text-lg">{title}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      
      {/* Header Card - Exchange Rates */}
      <div className="bg-blue-600 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden mb-8">
        <div className="relative z-10">
           <div className="flex justify-between items-start mb-6">
               <h2 className="text-xl font-bold opacity-90">أسعار الصرف الحالية</h2>
               <button onClick={() => setShowShareModal(true)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition">
                   <Share2 size={20} />
               </button>
           </div>
           
           <div className="flex justify-between items-center text-center">
              <div onClick={() => setShowRateModal(true)} className="flex-1 cursor-pointer active:scale-95 transition">
                 <span className="text-5xl font-bold block mb-1">{rateData?.sd_to_eg_rate}</span>
                 <span className="text-blue-200 text-sm font-medium">مصري {'->'} سوداني</span>
              </div>
              <div className="h-12 w-px bg-blue-400/50 mx-4"></div>
              <div onClick={() => setShowRateModal(true)} className="flex-1 cursor-pointer active:scale-95 transition">
                 <span className="text-5xl font-bold block mb-1">{rateData?.eg_to_sd_rate}</span>
                 <span className="text-blue-200 text-sm font-medium">سوداني {'->'} مصري</span>
              </div>
           </div>
        </div>
        
        {/* Decorative Background */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-800/30 to-transparent"></div>
      </div>

      {/* Main Grid Actions */}
      <div className="grid grid-cols-2 gap-4">
        
        {/* Add Employee (Orange) */}
        <DashboardBtn 
            title="إضافة موظف" 
            icon={UserPlus} 
            color="bg-orange-500" 
            onClick={() => setShowEmpModal(true)} 
        />

        {/* Update Rates (Dark Slate) */}
        <DashboardBtn 
            title="تحديث الأسعار" 
            icon={Settings} 
            color="bg-slate-700" 
            onClick={() => setShowRateModal(true)} 
        />

        {/* Manage Treasury (Teal) */}
        <DashboardBtn 
            title="إدارة الخزينة" 
            icon={Landmark} 
            color="bg-teal-600" 
            onClick={() => navigate('/admin/treasury')} 
        />

        {/* Employees List (Purple) */}
        <DashboardBtn 
            title="قائمة الموظفين" 
            icon={Users} 
            color="bg-purple-600" 
            onClick={() => setShowManageEmpModal(true)} 
        />

        {/* Electronic Wallets (Pink) */}
        <DashboardBtn 
            title="المحافظ الإلكترونية" 
            icon={Wallet} 
            color="bg-pink-600" 
            onClick={() => navigate('/admin/ewallets')} 
        />

        {/* Merchants (Indigo) */}
        <DashboardBtn 
            title="إدارة التجار" 
            icon={Store} 
            color="bg-indigo-600" 
            onClick={() => navigate('/admin/merchants')} 
        />

      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div id="rate-card-content" className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-blue-600 p-6 text-white text-center">
                        {company?.logo && <img src={company.logo} alt="Logo" className="h-16 w-16 mx-auto bg-white rounded-lg p-1 object-contain mb-3" crossOrigin="anonymous"/>}
                        <h2 className="text-2xl font-bold">{company?.name}</h2>
                        <p className="text-blue-200 text-sm mt-1">نشرة أسعار الصرف اليومية</p>
                        {company?.phone_numbers && (
                           <p className="text-blue-100 text-xs mt-2 font-mono" dir="ltr">{company.phone_numbers}</p>
                        )}
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-500 font-medium">سوداني {'->'} مصري</span>
                            <span className="text-3xl font-bold text-gray-800">{rateData?.sd_to_eg_rate}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-500 font-medium">مصري {'->'} سوداني</span>
                            <span className="text-3xl font-bold text-gray-800">{rateData?.eg_to_sd_rate}</span>
                        </div>
                        
                        <div className="border-t pt-4 mt-2">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500">سعر الجملة</span>
                                <span className="font-bold text-blue-600">{rateData?.wholesale_rate}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">أقل كمية للجملة</span>
                                <span className="font-bold text-gray-800">{rateData?.wholesale_threshold.toLocaleString()} EGP</span>
                            </div>
                        </div>
                        
                        {company?.footer_message && (
                            <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 text-center whitespace-pre-wrap border border-gray-100">
                                {company.footer_message}
                            </div>
                        )}

                        <div className="text-center text-xs text-gray-400 mt-2 pt-2 border-t">
                            {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex gap-3">
                    <button onClick={() => setShowShareModal(false)} className="bg-white text-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-50">
                        <X size={24} />
                    </button>
                    <button 
                        onClick={handleShareRates}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Share2 size={20} /> مشاركة (نص)
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Rate Update Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-gray-800">تحديث الأسعار والإعدادات</h3>
                     <button onClick={() => setShowRateModal(false)} className="bg-gray-100 p-1 rounded-full"><X size={20} className="text-gray-500"/></button>
                </div>
                <form onSubmit={handleUpdateRates} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 p-3 rounded-xl">
                            <label className="text-xs text-blue-600 font-bold mb-1 block">سوداني {'->'} مصري</label>
                            <input type="number" step="0.1" inputMode="decimal" value={sdRate} onChange={e => setSdRate(parseFloat(e.target.value))} className="w-full p-2 border border-blue-200 rounded-lg font-bold text-lg text-center bg-white" />
                        </div>
                        <div className="bg-blue-50 p-3 rounded-xl">
                            <label className="text-xs text-blue-600 font-bold mb-1 block">مصري {'->'} سوداني</label>
                            <input type="number" step="0.1" inputMode="decimal" value={egRate} onChange={e => setEgRate(parseFloat(e.target.value))} className="w-full p-2 border border-blue-200 rounded-lg font-bold text-lg text-center bg-white" />
                        </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                        <label className="text-xs text-gray-500 font-bold mb-1 block">سعر الجملة</label>
                        <input type="number" step="0.1" inputMode="decimal" value={wholesale} onChange={e => setWholesale(parseFloat(e.target.value))} className="w-full p-3 border rounded-lg font-bold" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-1 block">حد الجملة (EGP)</label>
                        <input type="number" inputMode="decimal" value={threshold} onChange={e => setThreshold(parseFloat(e.target.value))} className="w-full p-3 border rounded-lg font-bold" />
                    </div>

                    <div className="pt-2 border-t">
                        <label className="text-xs text-pink-600 font-bold flex items-center gap-1 mb-1"><Percent size={12}/> عمولة المحفظة (%)</label>
                        <input type="number" step="0.1" inputMode="decimal" value={commission} onChange={e => setCommission(parseFloat(e.target.value))} className="w-full p-3 border rounded-lg font-bold" placeholder="مثال: 1.0" />
                    </div>

                    <button disabled={isProcessing} className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold mt-2 flex items-center justify-center shadow-lg hover:bg-slate-900 transition">
                        {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'حفظ التغييرات'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-gray-800">إضافة موظف جديد</h3>
                     <button onClick={() => setShowEmpModal(false)} className="bg-gray-100 p-1 rounded-full"><X size={20} className="text-gray-500"/></button>
                </div>
                <form onSubmit={handleAddEmployee} className="space-y-4">
                    <div>
                         <label className="text-xs font-bold text-gray-500 mb-1 block">الاسم الكامل</label>
                         <input type="text" placeholder="مثال: أحمد محمد" value={empName} onChange={e => setEmpName(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 mb-1 block">اسم المستخدم</label>
                         <input type="text" placeholder="username" value={empUser} onChange={e => setEmpUser(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 mb-1 block">كلمة المرور</label>
                         <input type="password" inputMode="numeric" placeholder="****" value={empPass} onChange={e => setEmpPass(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded">{error}</p>}
                    <button disabled={isProcessing} className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-orange-600 transition flex items-center justify-center">
                         {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'إضافة الموظف'}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Manage Employees Modal */}
      {showManageEmpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-800">إدارة الموظفين</h3>
                    <button onClick={() => setShowManageEmpModal(false)} className="bg-gray-100 p-2 rounded-full"><X size={20} className="text-gray-500"/></button>
                </div>
                
                <div className="space-y-4">
                    {companyEmployees.map(emp => (
                        <div key={emp.id} className="border p-4 rounded-xl bg-gray-50 transition hover:border-blue-300">
                            {editInfoId?.id === emp.id ? (
                                <div className="space-y-3 mb-2">
                                    <div>
                                       <label className="text-xs text-gray-400 block mb-1">الاسم</label>
                                       <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded" />
                                    </div>
                                    <div>
                                       <label className="text-xs text-gray-400 block mb-1">اسم المستخدم</label>
                                       <input value={editUser} onChange={e => setEditUser(e.target.value)} className="w-full p-2 border rounded" />
                                    </div>
                                    {error && <p className="text-red-500 text-xs">{error}</p>}
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={handleUpdateInfo} disabled={isProcessing} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 flex-1 justify-center font-bold">
                                            {isProcessing ? <Loader2 className="animate-spin" size={16}/> : 'حفظ'}
                                        </button>
                                        <button onClick={() => setEditInfoId(null)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm flex-1 font-bold">إلغاء</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div 
                                        className="cursor-pointer flex-1" 
                                        onClick={() => setSelectedEmpReport(emp)}
                                        title="اضغط لعرض التقرير"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full text-blue-600 font-bold w-10 h-10 flex items-center justify-center">
                                                {emp.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{emp.full_name}</p>
                                                <p className="text-xs text-gray-500">@{emp.username}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditInfo(emp)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title="تعديل البيانات">
                                            <Pencil size={18} />
                                        </button>
                                        <button onClick={() => setEditPassId(editPassId === emp.id ? null : emp.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="تغيير كلمة المرور">
                                            <Key size={18} />
                                        </button>
                                        <button onClick={() => initiateDeleteEmployee(emp.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="حذف الموظف">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {editPassId === emp.id && (
                                <div className="mt-4 flex gap-2 border-t pt-3 bg-white p-2 rounded-lg border">
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        placeholder="كلمة المرور الجديدة" 
                                        className="flex-1 p-2 border rounded-lg text-sm"
                                        value={newPass}
                                        onChange={e => setNewPass(e.target.value)}
                                    />
                                    <button onClick={() => handleChangePassword(emp.id)} disabled={isProcessing} className="bg-blue-600 text-white px-3 rounded-lg text-sm flex items-center min-w-[60px] justify-center font-bold">
                                         {isProcessing ? <Loader2 className="animate-spin" size={16}/> : 'تغيير'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {companyEmployees.length === 0 && <p className="text-center text-gray-500">لا يوجد موظفين</p>}
                </div>
            </div>
        </div>
      )}

      {/* Employee Detail Report Modal */}
      {selectedEmpReport && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <FileText size={20} />
                          <h3 className="font-bold">تقرير الموظف</h3>
                      </div>
                      <button onClick={() => setSelectedEmpReport(null)} className="p-1 hover:bg-white/20 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="p-5">
                      <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2 text-blue-600 font-bold text-xl">
                              {selectedEmpReport.full_name.charAt(0)}
                          </div>
                          <h4 className="font-bold text-lg text-gray-800">{selectedEmpReport.full_name}</h4>
                          <p className="text-xs text-gray-500">@{selectedEmpReport.username}</p>
                      </div>

                      {(() => {
                          const empTreasury = treasuries.find(t => t.employee_id === selectedEmpReport.id);
                          
                          // Filter Today's Transactions
                          const today = new Date().toISOString().split('T')[0];
                          const todayTxs = transactions.filter(t => 
                              t.employee_id === selectedEmpReport.id && 
                              t.created_at.startsWith(today)
                          );

                          // Calculate Daily Totals
                          const expenseEGP = todayTxs.filter(t => t.type === 'expense' && t.from_currency === 'EGP').reduce((a, b) => a + b.from_amount, 0);
                          const expenseSDG = todayTxs.filter(t => t.type === 'expense' && t.from_currency === 'SDG').reduce((a, b) => a + b.from_amount, 0);
                          const walletIncome = todayTxs.filter(t => t.type === 'wallet_deposit').reduce((a, b) => a + b.from_amount, 0);
                          const walletWithdraw = todayTxs.filter(t => t.type === 'wallet_withdrawal').reduce((a, b) => a + b.from_amount, 0);

                          return (
                              <div className="space-y-4">
                                  {/* Current Balance */}
                                  <div className="grid grid-cols-2 gap-3">
                                      <div className="bg-gray-50 p-3 rounded-xl border text-center">
                                          <span className="text-xs text-gray-500 block">رصيد (EGP)</span>
                                          <span className="font-bold text-lg">{empTreasury?.egp_balance.toLocaleString()}</span>
                                      </div>
                                      <div className="bg-gray-50 p-3 rounded-xl border text-center">
                                          <span className="text-xs text-gray-500 block">رصيد (SDG)</span>
                                          <span className="font-bold text-lg">{empTreasury?.sdg_balance.toLocaleString()}</span>
                                      </div>
                                  </div>

                                  <div className="border-t pt-3">
                                      <p className="text-xs font-bold text-gray-500 mb-2 text-center">حركة اليوم ({new Date().toLocaleDateString('ar-EG')})</p>
                                      
                                      <div className="space-y-2">
                                          {/* Expenses */}
                                          <div className="bg-red-50 p-3 rounded-xl flex items-center justify-between border border-red-100">
                                              <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                                                  <TrendingDown size={16} />
                                                  <span>المنصرفات</span>
                                              </div>
                                              <div className="text-left text-xs font-bold text-red-800">
                                                  <div>{expenseEGP.toLocaleString()} EGP</div>
                                                  {expenseSDG > 0 && <div>{expenseSDG.toLocaleString()} SDG</div>}
                                              </div>
                                          </div>

                                          {/* Wallet Income (Deposit) */}
                                          <div className="bg-green-50 p-3 rounded-xl flex items-center justify-between border border-green-100">
                                              <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                                                  <ArrowDownCircle size={16} />
                                                  <span>إيداع محافظ</span>
                                              </div>
                                              <span className="text-green-800 font-bold">{walletIncome.toLocaleString()} EGP</span>
                                          </div>

                                          {/* Wallet Withdraw */}
                                          <div className="bg-orange-50 p-3 rounded-xl flex items-center justify-between border border-orange-100">
                                              <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                                                  <ArrowUpCircle size={16} />
                                                  <span>سحب محافظ</span>
                                              </div>
                                              <span className="text-orange-800 font-bold">{walletWithdraw.toLocaleString()} EGP</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          );
                      })()}
                  </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {empToDelete && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl">
                  <div className="text-center mb-4">
                      <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Lock size={24} className="text-red-600" />
                      </div>
                      <h3 className="font-bold text-gray-800">تأكيد الحذف</h3>
                      <p className="text-xs text-gray-500 mt-1">لحذف الموظف، يرجى إدخال كلمة مرور المدير</p>
                  </div>
                  
                  <form onSubmit={confirmDeleteEmployee}>
                      <input 
                          type="password" 
                          autoFocus
                          placeholder="كلمة مرور المدير" 
                          className="w-full p-3 border rounded-lg mb-2 text-center"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                      />
                      {error && <p className="text-red-500 text-xs text-center mb-2">{error}</p>}
                      
                      <div className="flex gap-2">
                          <button 
                              type="submit" 
                              disabled={isProcessing}
                              className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold flex justify-center"
                          >
                              {isProcessing ? <Loader2 className="animate-spin" size={16}/> : 'حذف نهائي'}
                          </button>
                          <button 
                              type="button" 
                              onClick={() => { setEmpToDelete(null); setConfirmPassword(''); }}
                              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-bold"
                          >
                              إلغاء
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Subscription Info Footer */}
      <div className="text-center text-xs text-gray-400 pt-4 pb-2">
          ينتهي الاشتراك في: {company ? new Date(company.subscription_end).toLocaleDateString('ar-EG') : '-'}
      </div>
    </div>
  );
};

export default AdminDashboard;
