
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { Landmark, UserPlus, Users, Settings, Wallet, Trash2, Key, Percent, Pencil, Share2, X, Loader2, FileText, ChevronDown, ChevronUp, Banknote, ArrowRightLeft, Smartphone, ArrowUpCircle } from 'lucide-react';
import { User } from '../types';

const AdminDashboard: React.FC<RouteComponentProps> = ({ history }) => {
  const { currentUser, exchangeRates, updateExchangeRate, addEmployee, updateEmployee, users, updateEmployeePassword, deleteEmployee, companies, treasuries } = useStore();
  const rateData = exchangeRates.find(r => r.company_id === currentUser?.company_id);
  const company = companies.find(c => c.id === currentUser?.company_id);

  const [showRateModal, setShowRateModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showManageEmpModal, setShowManageEmpModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [editPassId, setEditPassId] = useState<number | null>(null);
  const [editInfoId, setEditInfoId] = useState<User | null>(null);

  // New States for Employee List
  const [expandedEmpId, setExpandedEmpId] = useState<number | null>(null);
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

  // Custom Share Text State
  const [customShareText, setCustomShareText] = useState(() => localStorage.getItem('customShareText') || '');

  // Persist Custom Share Text
  useEffect(() => {
    localStorage.setItem('customShareText', customShareText);
  }, [customShareText]);

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

    let text = `
*${company.name}*
نشرة أسعار الصرف اليومية
📅 ${new Date().toLocaleDateString('ar-EG')}

💱 *الأسعار الحالية:*
🇸🇩 سوداني -> 🇪🇬 مصري: *${rateData.sd_to_eg_rate}*
🇪🇬 مصري -> 🇸🇩 سوداني: *${rateData.eg_to_sd_rate}*

📦 *الجملة:*
السعر: ${rateData.wholesale_rate}
أقل كمية: ${rateData.wholesale_threshold.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP
    `.trim();

    if (customShareText.trim()) {
        text += `\n\n${customShareText.trim()}`;
    }

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

  const toggleEmployeeExpand = (id: number) => {
      setExpandedEmpId(expandedEmpId === id ? null : id);
  };

  const getEmployeeBalance = (empId: number) => {
      return treasuries.find(t => t.employee_id === empId);
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
            onClick={() => history.push('/admin/treasury')} 
            color="bg-teal-600" 
        />
        <QuickAction 
            icon={Users} 
            label="إدارة التجار" 
            onClick={() => history.push('/admin/merchants')} 
            color="bg-indigo-600" 
        />
        <QuickAction 
            icon={Wallet} 
            label="المحافظ الإلكترونية" 
            onClick={() => history.push('/admin/ewallets')} 
            color="bg-pink-600" 
        />
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-sm flex flex-col max-h-[90vh]">
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <div id="rate-card-content" className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-4">
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
                                    <span className="font-bold text-gray-800">{rateData?.wholesale_threshold.toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP</span>
                                </div>
                            </div>
                            
                            {/* Custom Text Preview */}
                            {customShareText && (
                                <div className="mt-2 pt-2 border-t border-dashed border-gray-200 text-center text-sm font-medium text-gray-700 whitespace-pre-line">
                                    {customShareText}
                                </div>
                            )}

                            <div className="text-center text-xs text-gray-400 mt-4 pt-4 border-t">
                                {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Custom Text Input */}
                <div className="bg-white p-3 rounded-xl shadow-lg mb-3">
                    <label className="text-xs font-bold text-gray-500 mb-2 flex items-center justify-between">
                        <span>نص إضافي (توقيع / ملاحظات)</span>
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">يُحفظ تلقائياً</span>
                    </label>
                    <textarea 
                        value={customShareText}
                        onChange={(e) => setCustomShareText(e.target.value)}
                        placeholder="أضف نصاً سيظهر في كل مشاركة (مثال: نسعد بخدمتكم...)"
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex gap-3 shrink-0">
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
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 h-[85vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">قائمة الموظفين</h3>
                    <button onClick={() => setShowManageEmpModal(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
                    {companyEmployees.map(emp => {
                        const isExpanded = expandedEmpId === emp.id;
                        const treasury = getEmployeeBalance(emp.id);

                        return (
                            <div key={emp.id} className={`border rounded-xl overflow-hidden transition-all ${isExpanded ? 'border-blue-300 shadow-md' : 'border-gray-200'}`}>
                                {editInfoId?.id === emp.id ? (
                                    <div className="p-4 space-y-2 bg-gray-50">
                                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="الاسم" />
                                        <input type="text" value={editUser} onChange={e => setEditUser(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Username" />
                                        <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="رقم الهاتف" />
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={handleUpdateInfo} disabled={isProcessing} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-bold">حفظ</button>
                                            <button onClick={() => setEditInfoId(null)} className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg text-sm font-bold">إلغاء</button>
                                        </div>
                                        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                                    </div>
                                ) : (
                                    <>
                                        {/* Header - Click to Expand */}
                                        <div 
                                            onClick={() => toggleEmployeeExpand(emp.id)}
                                            className={`p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 ${isExpanded ? 'bg-gray-50 border-b border-gray-100' : ''}`}
                                        >
                                            <div>
                                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                    {emp.full_name}
                                                    {emp.phone && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{emp.phone}</span>}
                                                </h4>
                                                <p className="text-xs text-gray-400 mt-0.5">@{emp.username}</p>
                                            </div>
                                            <div className="text-gray-400">
                                                {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                            </div>
                                        </div>

                                        {/* Expanded Simplified Detail View */}
                                        {isExpanded && treasury && (
                                            <div className="p-4 animate-in slide-in-from-top-2 bg-gray-50/50">
                                                
                                                {/* Simplified Balance Grid */}
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col items-center justify-center">
                                                        <span className="text-xs font-bold text-blue-500 mb-1">الرصيد المصري (EGP)</span>
                                                        <span className="text-xl font-bold text-gray-800" dir="ltr">
                                                            {treasury.egp_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 flex flex-col items-center justify-center">
                                                        <span className="text-xs font-bold text-emerald-500 mb-1">الرصيد السوداني (SDG)</span>
                                                        <span className="text-xl font-bold text-gray-800" dir="ltr">
                                                            {treasury.sdg_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Coordinated Action Toolbar */}
                                                <div className="grid grid-cols-3 gap-2 border-t pt-3">
                                                    <button 
                                                        onClick={() => openEditInfo(emp)} 
                                                        className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                                                    >
                                                        <Pencil size={18} className="text-blue-600 mb-1"/>
                                                        <span className="text-[10px] font-bold text-gray-600">تعديل البيانات</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => setEditPassId(emp.id)} 
                                                        className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                                                    >
                                                        <Key size={18} className="text-yellow-600 mb-1"/>
                                                        <span className="text-[10px] font-bold text-gray-600">تغيير السر</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => initiateDeleteEmployee(emp.id)} 
                                                        className="flex flex-col items-center justify-center p-2 rounded-lg bg-red-50 hover:bg-red-100 transition"
                                                    >
                                                        <Trash2 size={18} className="text-red-600 mb-1"/>
                                                        <span className="text-[10px] font-bold text-red-600">حذف الموظف</span>
                                                    </button>
                                                </div>

                                                {/* Inline Password Change */}
                                                {editPassId === emp.id && (
                                                    <div className="mt-3 bg-yellow-50 p-3 rounded-lg border border-yellow-100 animate-in fade-in">
                                                        <label className="text-xs font-bold text-yellow-800 mb-1 block">كلمة المرور الجديدة</label>
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="text" 
                                                                className="border rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-1 focus:ring-yellow-500"
                                                                value={newPass}
                                                                onChange={e => setNewPass(e.target.value)}
                                                                placeholder="أدخل كلمة المرور"
                                                            />
                                                            <button onClick={() => handleChangePassword(emp.id)} disabled={isProcessing} className="bg-green-500 text-white px-3 rounded-lg">
                                                                <CheckIcon size={18} />
                                                            </button>
                                                            <button onClick={() => setEditPassId(null)} className="bg-gray-300 text-black px-3 rounded-lg">
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Inline Delete Confirm */}
                                                {empToDelete === emp.id && (
                                                    <div className="mt-3 bg-red-50 p-3 rounded-lg border border-red-100 animate-in fade-in">
                                                        <p className="text-xs text-red-700 font-bold mb-2">أدخل كلمة مرورك (المدير) للتأكيد:</p>
                                                        <form onSubmit={confirmDeleteEmployee} className="flex gap-2">
                                                            <input 
                                                                type="password" 
                                                                className="border rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-1 focus:ring-red-500"
                                                                value={confirmPassword}
                                                                onChange={e => setConfirmPassword(e.target.value)}
                                                                placeholder="كلمة مرور المدير"
                                                                autoFocus
                                                            />
                                                            <button type="submit" disabled={isProcessing} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap">
                                                                حذف نهائي
                                                            </button>
                                                        </form>
                                                        <button onClick={() => setEmpToDelete(null)} className="text-xs text-gray-500 mt-2 hover:underline">إلغاء</button>
                                                        {error && <p className="text-red-600 text-xs mt-2 font-bold">{error}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                    {companyEmployees.length === 0 && <p className="text-center text-gray-500 mt-10">لا يوجد موظفين</p>}
                </div>
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

export default withRouter(AdminDashboard);
