
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Building, UploadCloud, Save, Loader2, Info, Share2, CheckCircle, AlertCircle } from 'lucide-react';

const AdminSettings: React.FC = () => {
  const { currentUser, companies, updateCompany } = useStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const currentCompany = companies.find(c => c.id === currentUser?.company_id);

  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [footerMsg, setFooterMsg] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');

  useEffect(() => {
    if (currentCompany) {
        setName(currentCompany.name);
        setLogo(currentCompany.logo || '');
        setFooterMsg(currentCompany.footer_message || '');
        setPhoneNumbers(currentCompany.phone_numbers || '');
    }
  }, [currentCompany]);

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

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentCompany) return;
      setIsProcessing(true);
      setMsg(null);
      
      try {
        const res = await updateCompany(currentCompany.id, {
            name,
            logo,
            phone_numbers: phoneNumbers,
            footer_message: footerMsg
        });

        if (res.success) {
            setMsg({ type: 'success', text: 'تم حفظ إعدادات الشركة بنجاح' });
            setTimeout(() => setMsg(null), 3000);
        } else {
            setMsg({ type: 'error', text: res.message || 'حدث خطأ أثناء الحفظ' });
        }
      } catch (err) {
        setMsg({ type: 'error', text: 'حدث خطأ غير متوقع' });
      } finally {
        setIsProcessing(false);
      }
  };

  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Building size={24} className="text-blue-600" />
                إعدادات الشركة
            </h2>

            <form onSubmit={handleSave} className="space-y-6">
                
                {/* Logo Section */}
                <div className="flex flex-col items-center justify-center mb-6">
                    <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-full overflow-hidden hover:bg-gray-50 transition cursor-pointer group bg-white shadow-sm">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        {logo ? (
                            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <UploadCloud size={32} />
                                <span className="text-xs mt-1">رفع الشعار</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-bold z-20">
                            تغيير الشعار
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">اسم الشركة</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="اسم الشركة التجاري"
                            required 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">أرقام الهواتف (للتواصل)</label>
                        <input 
                            type="text" 
                            value={phoneNumbers} 
                            onChange={e => setPhoneNumbers(e.target.value)}
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="مثال: 09123... / 0123..."
                        />
                    </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                        <Share2 size={16}/> رسالة التذييل (للمشاركة)
                    </label>
                    <p className="text-xs text-blue-600 mb-3 flex items-start gap-1">
                        <Info size={14} className="shrink-0 mt-0.5"/>
                        هذه البيانات تظهر في أسفل رسالة "مشاركة أسعار الصرف" عند نسخها أو إرسالها. يمكنك إضافة العنوان، البريد الإلكتروني، أو أي ملاحظات إضافية.
                    </p>
                    <textarea 
                        value={footerMsg}
                        onChange={e => setFooterMsg(e.target.value)}
                        rows={4}
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white"
                        placeholder="مثال: &#10;الخرطوم - السوق العربي - عمارة الذهب&#10;إيميل: info@company.com&#10;خدمة العملاء 24 ساعة"
                    ></textarea>
                </div>

                {msg && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 font-bold ${msg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {msg.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                        {msg.text}
                    </div>
                )}

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={isProcessing} 
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition active:scale-95"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><Save size={20} /> حفظ الإعدادات</>}
                    </button>
                </div>

            </form>
        </div>
    </div>
  );
};

export default AdminSettings;
