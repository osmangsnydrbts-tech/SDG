
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, Power, Calendar, Building, UploadCloud, Activity } from 'lucide-react';

const SuperAdminDashboard: React.FC = () => {
  const { companies, addCompany, renewSubscription, toggleCompanyStatus } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Form States
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLogo, setNewLogo] = useState('');
  const [newDays, setNewDays] = useState(365);

  const activeCompanies = companies.filter(c => c.is_active).length;
  const totalCompanies = companies.length;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setNewLogo(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = addCompany(newName, newUsername, newPassword, newDays, newLogo);
    
    if (res.success) {
        setShowAddModal(false);
        // Reset form
        setNewName(''); setNewUsername(''); setNewPassword(''); setNewDays(365); setNewLogo('');
    } else {
        setError(res.message);
    }
  };

  const handleRenew = (companyId: number, days: number) => {
    renewSubscription(companyId, days);
    setShowRenewModal(null);
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

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">إدارة الشركات</h2>
        <button 
          onClick={() => setShowAddModal(true)}
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
                </div>
              </div>
              <button 
                onClick={() => toggleCompanyStatus(company.id)}
                className={`p-2 rounded-full transition ${company.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                title={company.is_active ? 'إيقاف الشركة' : 'تنشيط الشركة'}
              >
                <Power size={18} />
              </button>
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
              <input type="text" placeholder="اسم الشركة" className="w-full p-2 border rounded-lg" value={newName} onChange={e => setNewName(e.target.value)} required />
              
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
                        {newLogo ? (
                            <img src={newLogo} alt="Preview" className="h-16 w-16 object-cover rounded-lg mb-2" />
                        ) : (
                            <UploadCloud size={24} className="mb-2" />
                        )}
                        <span className="text-xs">{newLogo ? 'تم اختيار الصورة' : 'اضغط لرفع الشعار'}</span>
                    </div>
                 </div>
              </div>

              <input type="text" placeholder="اسم مستخدم المدير" className="w-full p-2 border rounded-lg" value={newUsername} onChange={e => setNewUsername(e.target.value)} required />
              <input type="password" placeholder="كلمة المرور" className="w-full p-2 border rounded-lg" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              <input type="number" placeholder="مدة الاشتراك (يوم)" className="w-full p-2 border rounded-lg" value={newDays} onChange={e => setNewDays(parseInt(e.target.value))} required />
              
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg">حفظ</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg">إلغاء</button>
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
