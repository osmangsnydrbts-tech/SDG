
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, Power, Calendar, Building, UploadCloud, Activity, Trash2, Pencil, Database, Download, Loader2 } from 'lucide-react';
import { Company } from '../types';

const SuperAdminDashboard: React.FC = () => {
  const { 
    companies, addCompany, updateCompany, renewSubscription, toggleCompanyStatus, deleteCompany, 
    exportDatabase, importDatabase 
  } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Company | null>(null);
  const [showRenewModal, setShowRenewModal] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [dbMessage, setDbMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form States (Add/Edit)
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState(''); // Shared state for Add & Edit (Optional in Edit)
  const [logo, setLogo] = useState('');
  const [days, setDays] = useState(365);
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [footerMessage, setFooterMessage] = useState('');
  const [expiryDate, setExpiryDate] = useState(''); // Only for Edit

  const activeCompanies = companies.filter(c => c.is_active).length;
  const totalCompanies = companies.length;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setLogo(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const openAddModal = () => {
      setName(''); setUsername(''); setPassword(''); setDays(365); setLogo(''); setPhoneNumbers(''); setFooterMessage(''); setError('');
      setShowAddModal(true);
  };

  const openEditModal = (company: Company) => {
      setName(company.name);
      setUsername(company.username);
      setPassword(''); // Reset password field
      setLogo(company.logo || '');
      setPhoneNumbers(company.phone_numbers || '');
      setFooterMessage(company.footer_message || '');
      setExpiryDate(new Date(company.subscription_end).toISOString().split('T')[0]);
      setError('');
      setShowEditModal(company);
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
        const res = await addCompany(name, username, password, days, phoneNumbers, logo, footerMessage);
        if (res.success) {
            setShowAddModal(false);
        } else {
            setError(res.message);
        }
    } finally {
        setIsProcessing(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!showEditModal) return;
      setError('');
      setIsProcessing(true);
      
      try {
          const res = await updateCompany(showEditModal.id, {
              name,
              username,
              logo,
              phone_numbers: phoneNumbers,
              footer_message: footerMessage,
              subscription_end: new Date(expiryDate).toISOString(),
              password: password || undefined // Only send if not empty
          });

          if (res.success) {
              setShowEditModal(null);
          } else {
              setError(res.message);
          }
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDeleteCompany = (id: number) => {
      if (window.confirm('تحذير: هل أنت متأكد تماماً من حذف هذه الشركة؟\n\nسيتم حذف جميع البيانات المرتبطة بها نهائياً (موظفين، عمليات، محافظ، تقارير) ولا يمكن استرجاعها.')) {
          deleteCompany(id);
      }
  };

  const handleRenew = (companyId: number, days: number) => {
    renewSubscription(companyId, days);
    setShowRenewModal(null);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          if (event.target?.result) {
              const res = await importDatabase(event.target.result as string);
              setDbMessage(res.message);
              setTimeout(() => setDbMessage(''), 3000);
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Active Companies Report */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Building size={18} />
                  <span className="text-xs">إجمالي الشركات</span>
              </div>
              <p className="text-2xl font-bold">{totalCompanies}</p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Activity size={18} />
                  <span className="text-xs">الشركات النشطة</span>
              </div>
              <p className="text-2xl font-bold">{activeCompanies}</p>
          </div>
      </div>

      {/* Database Management */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Database size={20} className="text-purple-600"/> إدارة قاعدة البيانات
          </h3>
          <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={exportDatabase}
                className="bg-purple-50 text-purple-700 border border-purple-200 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-purple-100 transition"
              >
                  <Download size={24} />
                  <span className="font-bold">نسخ احتياطي (تصدير)</span>
              </button>
              
              <div className="relative bg-blue-50 text-blue-700 border border-blue-200 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-blue-100 transition cursor-pointer">
                  <UploadCloud size={24} />
                  <span className="font-bold">استعادة بيانات (استيراد)</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleImport} 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                  />
              </div>
          </div>
          {dbMessage && <p className="text-center text-sm font-bold text-green-600 mt-2">{dbMessage}</p>}
      </div>

      <div className="flex justify-between items-center mt-8">
        <h2 className="text-xl font-bold text-gray-800">إدارة الشركات</h2>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm text-sm"
        >
          <Plus size={16} /> إضافة شركة
        </button>
      </div>

      <div className="grid gap-4">
        {companies.map(company => (
          <div key={company.id} className={`bg-white p-4 rounded-xl shadow-sm border ${company.is_active ? 'border-gray-100' : 'border-red-200 bg-red-50'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                {company.logo ? (
                    <img src={company.logo} alt={company.name} className="w-12 h-12 rounded-full object-cover border" />
                ) : (
                    <div className="bg-blue-50 p-2 rounded-full">
                      <Building size={24} className="text-blue-600" />
                    </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      {company.name}
                      {!company.is_active && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">موقوفة</span>}
                  </h3>
                  <p className="text-sm text-gray-500">Admin: {company.username}</p>
                  {company.phone_numbers && <p className="text-xs text-gray-400 mt-1">{company.phone_numbers}</p>}
                </div>
              </div>
              
              <div className="flex gap-2">
                  <button 
                    onClick={() => openEditModal(company)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"
                    title="تعديل البيانات"
                  >
                      <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => toggleCompanyStatus(company.id)}
                    className={`p-2 rounded-full transition ${company.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}
                    title={company.is_active ? 'إيقاف الشركة' : 'تنشيط الشركة'}
                  >
                    <Power size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCompany(company.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                    title="حذف الشركة نهائياً"
                  >
                      <Trash2 size={18} />
                  </button>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Calendar size={14} />
                <span>ينتهي: {new Date(company.subscription_end).toLocaleDateString('ar-EG')}</span>
              </div>
              <button 
                onClick={() => setShowRenewModal(company.id)}
                className="text-blue-600 font-medium hover:underline"
              >
                تجديد الاشتراك
              </button>
            </div>
          </div>
        ))}
        {companies.length === 0 && (
          <p className="text-center text-gray-500 py-8">لا توجد شركات مسجلة</p>
        )}
      </div>

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">إضافة شركة جديدة</h3>
            <form onSubmit={handleAddCompany} className="space-y-4">
              <input type="text" placeholder="اسم الشركة" className="w-full p-2 border rounded-lg" value={name} onChange={e => setName(e.target.value)} required />
              
              <div className="space-y-1">
                 <label className="text-xs text-gray-500">شعار الشركة (صورة)</label>
                 <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center text-gray-400">
                        {logo ? (
                            <img src={logo} alt="Preview" className="h-16 w-16 object-cover rounded-lg mb-2" />
                        ) : (
                            <UploadCloud size={24} className="mb-2" />
                        )}
                        <span className="text-xs">{logo ? 'تم اختيار الصورة' : 'اضغط لرفع الشعار'}</span>
                    </div>
                 </div>
              </div>
              
              <input type="text" placeholder="أرقام الهواتف (اختياري)" className="w-full p-2 border rounded-lg" value={phoneNumbers} onChange={e => setPhoneNumbers(e.target.value)} />
              <textarea placeholder="رسالة تذييل الإيصال (الفوتر)" className="w-full p-2 border rounded-lg" rows={3} value={footerMessage} onChange={e => setFooterMessage(e.target.value)} />

              <input type="text" placeholder="اسم مستخدم المدير" className="w-full p-2 border rounded-lg" value={username} onChange={e => setUsername(e.target.value)} required />
              <input type="password" inputMode="numeric" placeholder="كلمة المرور" className="w-full p-2 border rounded-lg" value={password} onChange={e => setPassword(e.target.value)} required />
              <input type="number" inputMode="numeric" placeholder="مدة الاشتراك (يوم)" className="w-full p-2 border rounded-lg" value={days} onChange={e => setDays(parseInt(e.target.value))} required />
              
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isProcessing} className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center">
                    {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'حفظ'}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">تعديل بيانات الشركة</h3>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div>
                  <label className="text-xs text-gray-500 font-bold">اسم الشركة</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div className="space-y-1">
                 <label className="text-xs text-gray-500 font-bold">شعار الشركة</label>
                 <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer">
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center text-gray-400">
                        {logo ? (
                            <img src={logo} alt="Preview" className="h-16 w-16 object-cover rounded-lg mb-2" />
                        ) : (
                            <UploadCloud size={24} className="mb-2" />
                        )}
                        <span className="text-xs">{logo ? 'تغيير الصورة' : 'رفع شعار'}</span>
                    </div>
                 </div>
              </div>

              <div>
                  <label className="text-xs text-gray-500 font-bold">أرقام الهواتف</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={phoneNumbers} onChange={e => setPhoneNumbers(e.target.value)} />
              </div>

              <div>
                  <label className="text-xs text-gray-500 font-bold">رسالة تذييل الإيصال</label>
                  <textarea className="w-full p-2 border rounded-lg" rows={3} value={footerMessage} onChange={e => setFooterMessage(e.target.value)} />
              </div>

              <div>
                  <label className="text-xs text-gray-500 font-bold">اسم مستخدم المدير</label>
                  <input type="text" className="w-full p-2 border rounded-lg" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>

              <div>
                  <label className="text-xs text-gray-500 font-bold">كلمة المرور الجديدة (اختياري)</label>
                  <input 
                    type="text"
                    inputMode="numeric" 
                    className="w-full p-2 border rounded-lg" 
                    placeholder="اتركه فارغاً إذا لم ترد التغيير"
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
              </div>

              <div>
                  <label className="text-xs text-gray-500 font-bold">تاريخ انتهاء الاشتراك</label>
                  <input type="date" className="w-full p-2 border rounded-lg" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required />
              </div>
              
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={isProcessing} className="flex-1 bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center">
                    {isProcessing ? <Loader2 className="animate-spin" size={20}/> : 'تحديث'}
                </button>
                <button type="button" onClick={() => setShowEditModal(null)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4">تجديد الاشتراك</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => handleRenew(showRenewModal, 30)} className="p-3 border rounded-lg hover:bg-blue-50">30 يوم</button>
              <button onClick={() => handleRenew(showRenewModal, 90)} className="p-3 border rounded-lg hover:bg-blue-50">3 شهور</button>
              <button onClick={() => handleRenew(showRenewModal, 180)} className="p-3 border rounded-lg hover:bg-blue-50">6 شهور</button>
              <button onClick={() => handleRenew(showRenewModal, 365)} className="p-3 border rounded-lg hover:bg-blue-50">سنة</button>
            </div>
            <button onClick={() => setShowRenewModal(null)} className="w-full bg-gray-200 py-2 rounded-lg">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
