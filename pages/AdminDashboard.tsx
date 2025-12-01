
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { Landmark, UserPlus, Users, Settings, Wallet, Trash2, Key, Percent, Pencil, Share2, X } from 'lucide-react';
import { User } from '../types';

const AdminDashboard: React.FC = () => {
  const { currentUser, exchangeRates, updateExchangeRate, addEmployee, updateEmployee, users, updateEmployeePassword, deleteEmployee, companies } = useStore();
  const navigate = useNavigate();
  const rateData = exchangeRates.find(r => r.company_id === currentUser?.company_id);
  const company = companies.find(c => c.id === currentUser?.company_id);

  const [showRateModal, setShowRateModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showManageEmpModal, setShowManageEmpModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // States for sub-modals in Manage Employees
  const [editPassId, setEditPassId] = useState<number | null>(null);
  const [editInfoId, setEditInfoId] = useState<User | null>(null);

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

  // Emp Edit Form (Info)
  const [editName, setEditName] = useState('');
  const [editUser, setEditUser] = useState('');

  // Emp Pass Change
  const [newPass, setNewPass] = useState('');

  const companyEmployees = users.filter(u => u.company_id === currentUser?.company_id && u.role === 'employee' && u.is_active);

  const handleUpdateRates = (e: React.FormEvent) => {
    e.preventDefault();
    if(currentUser?.company_id) {
        updateExchangeRate(currentUser.company_id, {
            sd_to_eg_rate: sdRate,
            eg_to_sd_rate: egRate,
            wholesale_rate: wholesale,
            wholesale_threshold: threshold,
            ewallet_commission: commission
        });
        setShowRateModal(false);
    }
  };

  const handleShareRates = async () => {
    if (!rateData || !company) return;

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
      // Fallback to clipboard
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
          const res = await addEmployee(currentUser.company_id, empName, empUser, empPass);
          if (res.success) {
            setShowEmpModal(false);
            setEmpName(''); setEmpUser(''); setEmpPass('');
          } else {
            setError(res.message);
          }
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
      const res = await updateEmployee(editInfoId.id, { full_name: editName, username: editUser });
      if (res.success) {
          setEditInfoId(null);
      } else {
          setError(res.message);
      }
  };

  const handleChangePassword = (id: number) => {
      if (newPass.length < 3) return;
      updateEmployeePassword(id, newPass);
      setEditPassId(null);
      setNewPass('');
  };

  const handleDeleteEmployee = (id: number) => {
      if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
          deleteEmployee(id);
      }
  };

  const QuickAction = ({ icon: Icon, label, onClick, color }: any) => (
    <button onClick={onClick} className={`${color} text-white p-4 rounded-xl shadow-md flex flex-col items-center justify-center gap-2 active:scale-95 transition`}>
      <Icon size={28} />
      <span className="font-bold text-sm">{label}</span>
    </button>
  );

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

      {/* Share Rate Modal (Preview) */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div id="rate-card-content" className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-blue-600 p-6 text-white text-center">
                        {company?.logo && <img src={company.logo} alt="Logo" className="h-16 w-16 mx-auto bg-white rounded-lg p-1 object-contain mb-3" crossOrigin="anonymous"/>}
                        <h2 className="text-2xl font-bold">{company?.name}</h2>
                        <p className="text-blue-200 text-sm mt-1">نشرة أسعار الصرف اليومية</p>
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

      {/* Rate Modal */}
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

                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold mt-2">حفظ التغييرات</button>
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
                    <button className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold mt-2">إضافة</button>
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
                        <div key={emp.id} className="border p-3 rounded-xl bg-gray-50">
                            {editInfoId?.id === emp.id ? (
                                <div className="space-y-2 mb-2">
                                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded" placeholder="الاسم" />
                                    <input value={editUser} onChange={e => setEditUser(e.target.value)} className="w-full p-2 border rounded" placeholder="اسم المستخدم" />
                                    {error && <p className="text-red-500 text-xs">{error}</p>}
                                    <div className="flex gap-2">
                                        <button onClick={handleUpdateInfo} className="bg-green-600 text-white px-3 py-1 rounded text-sm">حفظ</button>
                                        <button onClick={() => setEditInfoId(null)} className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm">إلغاء</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">{emp.full_name}</p>
                                        <p className="text-xs text-gray-500">user: {emp.username}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditInfo(emp)} className="p-2 bg-indigo-100 text-indigo-600 rounded-lg" title="تعديل البيانات">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => setEditPassId(editPassId === emp.id ? null : emp.id)} className="p-2 bg-blue-100 text-blue-600 rounded-lg" title="تغيير كلمة المرور">
                                            <Key size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteEmployee(emp.id)} className="p-2 bg-red-100 text-red-600 rounded-lg" title="حذف الموظف">
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
                                    <button onClick={() => handleChangePassword(emp.id)} className="bg-green-600 text-white px-3 rounded-lg text-sm">تغيير</button>
                                </div>
                            )}
                        </div>
                    ))}
                    {companyEmployees.length === 0 && <p className="text-center text-gray-500">لا يوجد موظفين</p>}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
