
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { Landmark, UserPlus, Users, Wallet, Trash2, Key, Percent, Pencil, Share2, X, Loader2, FileText, Lock, RefreshCw, ChevronRight } from 'lucide-react';
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

  const QuickAction = ({ icon: Icon, label, onClick, color, subLabel }: any) => (
    <button onClick={onClick} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-blue-200 transition active:scale-95">
      <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full text-white ${color}`}>
            <Icon size={24} />
          </div>
          <div className="text-right">
            <span className="font-bold text-gray-800 block">{label}</span>
            {subLabel && <span className="text-xs text-gray-400">{subLabel}</span>}
          </div>
      </div>
      <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 transition"/>
    </button>
  );

  const getEmpStats = (empId: number) => {
      const treasury = treasuries.find(t => t.employee_id === empId);
      const txs = transactions.filter(t => t.employee_id === empId).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const recentTxs = txs.slice(0, 5);
      return { treasury, recentTxs, totalTxs: txs.length };
  };

  return (
    <div className="space-y-6">
      
      {/* Header Card with Rate & Settings Link */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <div>
                <h2 className="text-xl font-bold">{company?.name}</h2>
                <p className="text-slate-400 text-xs">لوحة التحكم الإدارية</p>
             </div>
          </div>
          
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                 <p className="text-slate-300 text-xs flex items-center gap-1"><RefreshCw size={12}/> أسعار الصرف الحالية</p>
                 <button onClick={() => setShowShareModal(true)} className="text-xs bg-blue-600 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-blue-500 transition">
                     <Share2 size={12} /> مشاركة
                 </button>
              </div>
              <div className="flex justify-between items-end">
                <div onClick={() => setShowRateModal(true)} className="cursor-pointer hover:opacity-80">
                  <span className="text-2xl font-bold block text-green-400">{rateData?.sd_to_eg_rate}</span>
                  <span className="text-[10px] opacity-75">سوداني {'->'} مصري</span>
                </div>
                <div className="h-8 w-px bg-white/10"></div>
                <div onClick={() => setShowRateModal(true)} className="cursor-pointer hover:opacity-80 text-right">
                  <span className="text-2xl font-bold block text-blue-400">{rateData?.eg_to_sd_rate}</span>
                  <span className="text-[10px] opacity-75">مصري {'->'} سوداني</span>
                </div>
              </div>
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Operations */}
        <p className="col-span-full text-xs font-bold text-gray-400 mt-2">العمليات والموظفين</p>
        
        <QuickAction 
            icon={RefreshCw} 
            label="تحديث الأسعار" 
            subLabel="تعديل سعر الصرف والعمولات"
            onClick={() => setShowRateModal(true)} 
            color="bg-slate-700" 
        />
        
        <QuickAction 
            icon={Users} 
            label="إدارة الموظفين" 
            subLabel={`${companyEmployees.length} موظف نشط`}
            onClick={() => setShowManageEmpModal(true)} 
            color="bg-purple-600" 
        />
        
        <QuickAction 
            icon={UserPlus} 
            label="إضافة موظف" 
            subLabel="تسجيل مستخدم جديد"
            onClick={() => setShowEmpModal(true)} 
            color="bg-orange-500" 
        />

        {/* Finance */}
        <p className="col-span-full text-xs font-bold text-gray-400 mt-2">المالية والخزينة</p>

        <QuickAction 
            icon={Landmark} 
            label="إدارة الخزينة" 
            subLabel="إيداع، سحب، جرد"
            onClick={() => navigate('/admin/treasury')} 
            color="bg-teal-600" 
        />
        
        <QuickAction 
            icon={Wallet} 
            label="المحافظ الإلكترونية" 
            subLabel="فودافون، انستا، بنكك"
            onClick={() => navigate('/admin/ewallets')} 
            color="bg-pink-600" 
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
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-800">تحديث الأسعار والإعدادات</h3>
                <form onSubmit={handleUpdateRates} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500">سوداني {'->'} مصري</label>
                            <input type="number" step="0.1" inputMode="decimal" value={sdRate} onChange={e => setSdRate(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg font-bold" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">مصري {'->'} سوداني</label>
                            <input type="number" step="0.1" inputMode="decimal" value={egRate} onChange={e => setEgRate(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg font-bold" />
                        </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                        <label className="text-xs text-blue-600 font-bold">سعر الجملة</label>
                        <input type="number" step="0.1" inputMode="decimal" value={wholesale} onChange={e => setWholesale(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg font-bold" />
                    </div>
                    <div>
                        <label className="text-xs text-blue-600 font-bold">حد الجملة (EGP)</label>
                        <input type="number" inputMode="decimal" value={threshold} onChange={e => setThreshold(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg font-bold" />
                    </div>

                    <div className="pt-2 border-t">
                        <label className="text-xs text-pink-600 font-bold flex items-center gap-1"><Percent size={12}/> عمولة المحفظة (%)</label>
                        <input type="number" step="0.1" inputMode="decimal" value={commission} onChange={e => setCommission(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg font-bold" placeholder="مثال: 1.0" />
                    </div>

                    <button disabled={isProcessing} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mt-2 flex items-center justify-center">
                        {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'حفظ التغييرات'}
                    </button>
                    <button type="button" onClick={() => setShowRateModal(false)} className="w-full bg-gray-100 py-2 rounded-lg text-sm">إلغاء</button>
                </form>
            </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                <h3 className="text-lg font-bold mb-4 text-gray-800">إضافة موظف جديد</h3>
                <form onSubmit={handleAddEmployee} className="space-y-3">
                    <input type="text" placeholder="الاسم الكامل" value={empName} onChange={e => setEmpName(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    <input type="text" placeholder="اسم المستخدم" value={empUser} onChange={e => setEmpUser(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    <input type="password" inputMode="numeric" placeholder="كلمة المرور (أرقام)" value={empPass} onChange={e => setEmpPass(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    {error && <p className="text-red-500 text-xs">{error}</p>}
                    <button disabled={isProcessing} className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold mt-2 flex items-center justify-center">
                         {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'إضافة'}
                    </button>
                    <button type="button" onClick={() => setShowEmpModal(false)} className="w-full bg-gray-100 py-2 rounded-lg text-sm">إلغاء</button>
                </form>
            </div>
        </div>
      )}

      {/* Manage Employees Modal */}
      {showManageEmpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">إدارة الموظفين</h3>
                    <button onClick={() => setShowManageEmpModal(false)} className="text-gray-500">إغلاق</button>
                </div>
                
                <div className="space-y-4">
                    {companyEmployees.map(emp => (
                        <div key={emp.id} className="border p-3 rounded-xl bg-gray-50 transition hover:border-blue-300">
                            {editInfoId?.id === emp.id ? (
                                <div className="space-y-2 mb-2">
                                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded" placeholder="الاسم" />
                                    <input value={editUser} onChange={e => setEditUser(e.target.value)} className="w-full p-2 border rounded" placeholder="اسم المستخدم" />
                                    {error && <p className="text-red-500 text-xs">{error}</p>}
                                    <div className="flex gap-2">
                                        <button onClick={handleUpdateInfo} disabled={isProcessing} className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 min-w-[60px] justify-center">
                                            {isProcessing ? <Loader2 className="animate-spin" size={12}/> : 'حفظ'}
                                        </button>
                                        <button onClick={() => setEditInfoId(null)} className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm">إلغاء</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div 
                                        className="cursor-pointer flex-1" 
                                        onClick={() => setSelectedEmpReport(emp)}
                                        title="اضغط لعرض التقرير"
                                    >
                                        <p className="font-bold text-blue-700 hover:underline">{emp.full_name}</p>
                                        <p className="text-xs text-gray-500">user: {emp.username}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditInfo(emp)} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg" title="تعديل البيانات">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => setEditPassId(editPassId === emp.id ? null : emp.id)} className="p-2 bg-blue-100 text-blue-600 rounded-lg" title="تغيير كلمة المرور">
                                            <Key size={16} />
                                        </button>
                                        <button onClick={() => initiateDeleteEmployee(emp.id)} className="p-2 bg-red-100 text-red-600 rounded-lg" title="حذف الموظف">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {editPassId === emp.id && (
                                <div className="mt-3 flex gap-2 border-t pt-2">
                                    <input 
                                        type="text" 
                                        inputMode="numeric"
                                        placeholder="كلمة المرور الجديدة (أرقام)" 
                                        className="flex-1 p-2 border rounded-lg text-sm"
                                        value={newPass}
                                        onChange={e => setNewPass(e.target.value)}
                                    />
                                    <button onClick={() => handleChangePassword(emp.id)} disabled={isProcessing} className="bg-green-600 text-white px-3 rounded-lg text-sm flex items-center min-w-[60px] justify-center">
                                         {isProcessing ? <Loader2 className="animate-spin" size={14}/> : 'تغيير'}
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
                          const stats = getEmpStats(selectedEmpReport.id);
                          return (
                              <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-3">
                                      <div className="bg-gray-50 p-3 rounded-xl border text-center">
                                          <span className="text-xs text-gray-500 block">رصيد (EGP)</span>
                                          <span className="font-bold text-lg">{stats.treasury?.egp_balance.toLocaleString()}</span>
                                      </div>
                                      <div className="bg-gray-50 p-3 rounded-xl border text-center">
                                          <span className="text-xs text-gray-500 block">رصيد (SDG)</span>
                                          <span className="font-bold text-lg">{stats.treasury?.sdg_balance.toLocaleString()}</span>
                                      </div>
                                  </div>

                                  <div className="border-t pt-3">
                                      <p className="text-xs font-bold text-gray-500 mb-2">آخر العمليات ({stats.totalTxs})</p>
                                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                          {stats.recentTxs.map(tx => (
                                              <div key={tx.id} className="flex justify-between text-xs bg-gray-50 p-2 rounded border border-gray-100">
                                                  <span className={tx.from_currency === 'SDG' ? 'text-orange-600' : 'text-blue-600'}>
                                                      {tx.type === 'exchange' ? 'صرف' : 'حركة'} {tx.from_amount.toLocaleString()} {tx.from_currency}
                                                  </span>
                                                  <span className="text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</span>
                                              </div>
                                          ))}
                                          {stats.recentTxs.length === 0 && <p className="text-center text-gray-400 text-xs py-2">لا توجد عمليات</p>}
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
      <div className="text-center text-xs text-gray-400 pt-4">
          ينتهي الاشتراك في: {company ? new Date(company.subscription_end).toLocaleDateString('ar-EG') : '-'}
      </div>
    </div>
  );
};

export default AdminDashboard;
