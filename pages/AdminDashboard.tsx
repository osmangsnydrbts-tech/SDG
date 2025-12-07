
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { Landmark, UserPlus, Users, Settings, Wallet, Trash2, Key, Percent, Pencil, Share2, X, Loader2, FileText, Lock } from 'lucide-react';
import { User } from '../types';

const AdminDashboard: React.FC = () => {
  const { currentUser, exchangeRates, updateExchangeRate, addEmployee, updateEmployee, users, updateEmployeePassword, deleteEmployee, companies, treasuries, transactions, showToast } = useStore();
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

  // New States for Employee Report & Secure Delete
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
  const [empPhone, setEmpPhone] = useState('');
  const [error, setError] = useState('');

  // Emp Edit Form
  const [editName, setEditName] = useState('');
  const [editUser, setEditUser] = useState('');
  const [editPhone, setEditPhone] = useState('');
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

    const phones = company.phone_numbers ? `\n📞 للتواصل: ${company.phone_numbers}` : '';

    const text = `
*${company.name}*
نشرة أسعار الصرف اليومية
📅 ${new Date().toLocaleDateString('ar-EG')}

💱 *الأسعار الحالية:*
🇸🇩 سوداني -> 🇪🇬 مصري: *${rateData.sd_to_eg_rate}*
🇪🇬 مصري -> 🇸🇩 سوداني: *${rateData.eg_to_sd_rate}*

📦 *الجملة:*
السعر: ${rateData.wholesale_rate}
أقل كمية: ${rateData.wholesale_threshold.toLocaleString()} EGP${phones}
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
          const res = await addEmployee(currentUser.company_id, empName, empUser, empPass, empPhone);
          if (res.success) {
            setShowEmpModal(false);
            setEmpName(''); setEmpUser(''); setEmpPass(''); setEmpPhone('');
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
      setEditPhone(user.phone || '');
      setError('');
  };

  const handleUpdateInfo = async () => {
      if (!editInfoId) return;
      setIsProcessing(true);
      const res = await updateEmployee(editInfoId.id, { full_name: editName, username: editUser, phone: editPhone });
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
      
      // Simple security check (Checking current user password vs input)
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

  const QuickAction = ({ icon: Icon, label, onClick, color }: any) => (
    <button onClick={onClick} className={`${color} text-white p-4 rounded-xl shadow-md flex flex-col items-center justify-center gap-2 active:scale-95 transition`}>
      <Icon size={28} />
      <span className="font-bold text-sm">{label}</span>
    </button>
  );

  // Helper for Employee Report
  const getEmpStats = (empId: number) => {
      const treasury = treasuries.find(t => t.employee_id === empId);
      const txs = transactions.filter(t => t.employee_id === empId).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const recentTxs = txs.slice(0, 5);
      return { treasury, recentTxs, totalTxs: txs.length };
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
             <p className="text-blue-200">أسعار الصرف الحالية</p>
             <button onClick={() => setShowShareModal(true)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
                 <Share2 size={20} />
             </button>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <span className="text-3xl font-bold block">{rateData?.sd_to_eg_rate}</span>
              <span className="text-xs opacity-75">سوداني {'->'} مصري</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold block">{rateData?.eg_to_sd_rate}</span>
              <span className="text-xs opacity-75">مصري {'->'} سوداني</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <QuickAction 
            icon={Settings} 
            label="تحديث الأسعار" 
            onClick={() => setShowRateModal(true)} 
            color="bg-slate-700" 
        />
        <QuickAction 
            icon={UserPlus} 
            label="إضافة موظف" 
            onClick={() => setShowEmpModal(true)} 
            color="bg-orange-500" 
        />
         <QuickAction 
            icon={Users} 
            label="قائمة الموظفين" 
            onClick={() => setShowManageEmpModal(true)} 
            color="bg-purple-600" 
        />
        <QuickAction 
            icon={Landmark} 
            label="إدارة الخزينة" 
            onClick={() => navigate('/admin/treasury')} 
            color="bg-teal-600" 
        />
        <QuickAction 
            icon={Users} 
            label="إدارة التجار" 
            onClick={() => navigate('/admin/merchants')} 
            color="bg-indigo-600" 
        />
        <QuickAction 
            icon={Wallet} 
            label="المحافظ الإلكترونية" 
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

                        <div className="text-center text-xs text-gray-400 mt-4 pt-4 border-t">
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
                         {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'تحديث'}
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
                <h3 className="text-lg font-bold mb-4">إضافة موظف جديد</h3>
                <form onSubmit={handleAddEmployee} className="space-y-3">
                    <input type="text" placeholder="الاسم الكامل" value={empName} onChange={e => setEmpName(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    <input type="text" placeholder="اسم المستخدم" value={empUser} onChange={e => setEmpUser(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    <input type="text" placeholder="كلمة المرور" value={empPass} onChange={e => setEmpPass(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    <input type="tel" placeholder="رقم الهاتف (اختياري)" value={empPhone} onChange={e => setEmpPhone(e.target.value)} className="w-full p-3 border rounded-lg" />
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <button disabled={isProcessing} className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold mt-2 flex items-center justify-center">
                        {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'حفظ'}
                    </button>
                    <button type="button" onClick={() => setShowEmpModal(false)} className="w-full bg-gray-100 py-2 rounded-lg text-sm">إلغاء</button>
                </form>
            </div>
        </div>
      )}

      {/* Manage Employees Modal */}
      {showManageEmpModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">قائمة الموظفين</h3>
                    <button onClick={() => setShowManageEmpModal(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3">
                    {companyEmployees.map(emp => (
                        <div key={emp.id} className="border p-3 rounded-lg relative">
                            {editInfoId?.id === emp.id ? (
                                <div className="space-y-2">
                                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-1 border rounded" placeholder="الاسم" />
                                    <input type="text" value={editUser} onChange={e => setEditUser(e.target.value)} className="w-full p-1 border rounded" placeholder="Username" />
                                    <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full p-1 border rounded" placeholder="رقم الهاتف" />
                                    <div className="flex gap-2">
                                        <button onClick={handleUpdateInfo} disabled={isProcessing} className="bg-green-500 text-white px-3 py-1 rounded text-xs">حفظ</button>
                                        <button onClick={() => setEditInfoId(null)} className="bg-gray-300 text-gray-800 px-3 py-1 rounded text-xs">إلغاء</button>
                                    </div>
                                    {error && <p className="text-red-500 text-xs">{error}</p>}
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between">
                                      <h4 className="font-bold">{emp.full_name}</h4>
                                      {emp.phone && <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{emp.phone}</span>}
                                    </div>
                                    <p className="text-sm text-gray-500 mb-2">Username: {emp.username}</p>
                                    
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <button onClick={() => openEditInfo(emp)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded flex items-center gap-1">
                                            <Pencil size={12} /> تعديل
                                        </button>
                                        <button onClick={() => setEditPassId(emp.id)} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded flex items-center gap-1">
                                            <Key size={12} /> كلمة المرور
                                        </button>
                                        <button onClick={() => initiateDeleteEmployee(emp.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded flex items-center gap-1">
                                            <Trash2 size={12} /> حذف
                                        </button>
                                        <button onClick={() => setSelectedEmpReport(emp)} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded flex items-center gap-1">
                                            <FileText size={12} /> تقرير
                                        </button>
                                    </div>

                                    {/* Password Change Field */}
                                    {editPassId === emp.id && (
                                        <div className="mt-2 flex gap-1 animate-in slide-in-from-top-2">
                                            <input 
                                                type="text" 
                                                placeholder="كلمة المرور الجديدة" 
                                                className="border rounded px-2 py-1 text-xs w-full"
                                                value={newPass}
                                                onChange={e => setNewPass(e.target.value)}
                                            />
                                            <button onClick={() => handleChangePassword(emp.id)} disabled={isProcessing} className="bg-green-500 text-white px-2 rounded">
                                                <CheckIcon size={14} />
                                            </button>
                                            <button onClick={() => setEditPassId(null)} className="bg-gray-300 text-black px-2 rounded">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Delete Confirmation */}
                                    {empToDelete === emp.id && (
                                        <div className="mt-2 bg-red-50 p-2 rounded animate-in slide-in-from-top-2">
                                            <p className="text-xs text-red-700 font-bold mb-1">أدخل كلمة مرورك للتأكيد:</p>
                                            <form onSubmit={confirmDeleteEmployee} className="flex gap-1">
                                                <input 
                                                    type="password" 
                                                    className="border rounded px-2 py-1 text-xs w-full"
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    placeholder="••••"
                                                    autoFocus
                                                />
                                                <button type="submit" disabled={isProcessing} className="bg-red-600 text-white px-2 rounded text-xs">
                                                    حذف
                                                </button>
                                                <button type="button" onClick={() => setEmpToDelete(null)} className="bg-gray-300 text-black px-2 rounded text-xs">
                                                    إلغاء
                                                </button>
                                            </form>
                                            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {companyEmployees.length === 0 && <p className="text-center text-gray-500">لا يوجد موظفين</p>}
                </div>
            </div>
        </div>
      )}

      {/* Employee Mini Report Modal */}
      {selectedEmpReport && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm p-5 relative">
                  <button onClick={() => setSelectedEmpReport(null)} className="absolute top-4 left-4 bg-gray-100 p-1 rounded-full"><X size={18}/></button>
                  <h3 className="font-bold text-lg mb-1">{selectedEmpReport.full_name}</h3>
                  {selectedEmpReport.phone && <p className="text-sm text-gray-600 mb-1">{selectedEmpReport.phone}</p>}
                  <p className="text-xs text-gray-500 mb-4">تقرير مختصر</p>
                  
                  {(() => {
                      const stats = getEmpStats(selectedEmpReport.id);
                      return (
                          <div className="space-y-4">
                              <div className="flex gap-2">
                                  <div className="flex-1 bg-blue-50 p-3 rounded-xl text-center">
                                      <p className="text-xs text-blue-400">عهدة مصري</p>
                                      <p className="font-bold text-lg">{stats.treasury?.egp_balance.toLocaleString()}</p>
                                  </div>
                                  <div className="flex-1 bg-emerald-50 p-3 rounded-xl text-center">
                                      <p className="text-xs text-emerald-400">عهدة سوداني</p>
                                      <p className="font-bold text-lg">{stats.treasury?.sdg_balance.toLocaleString()}</p>
                                  </div>
                              </div>
                              
                              <div>
                                  <h4 className="font-bold text-xs text-gray-500 mb-2">آخر 5 عمليات</h4>
                                  <div className="space-y-2 text-xs">
                                      {stats.recentTxs.map(t => (
                                          <div key={t.id} className="flex justify-between border-b pb-1">
                                              <span>{t.type}</span>
                                              <span className="font-bold">{t.from_amount} {t.from_currency}</span>
                                          </div>
                                      ))}
                                      {stats.recentTxs.length === 0 && <p className="text-gray-400">لا توجد عمليات</p>}
                                  </div>
                              </div>
                          </div>
                      );
                  })()}
              </div>
          </div>
      )}

    </div>
  );
};

// Helper Icon for Password Save
const CheckIcon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

export default AdminDashboard;
