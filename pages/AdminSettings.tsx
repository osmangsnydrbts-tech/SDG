
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

  // Image Compression Utility
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.8 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (e) => reject(e);
      };
      reader.onerror = (e) => reject(e);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            // Compress before setting state
            const compressedLogo = await compressImage(file);
            setLogo(compressedLogo);
        } catch (error) {
            setMsg({ type: 'error', text: 'فشل في معالجة الصورة. يرجى اختيار صورة أخرى.' });
        }
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
            // Scroll to top to see message
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Building size={24} className="text-blue-600" />
                إعدادات الشركة
            </h2>

            {msg && (
                <div className={`p-4 rounded-xl flex items-center gap-3 font-bold mb-6 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {msg.type === 'success' ? <CheckCircle size={24}/> : <AlertCircle size={24}/>}
                    {msg.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                
                {/* Logo Section */}
                <div className="flex flex-col items-center justify-center">
                    <label className="block text-sm font-bold text-gray-700 mb-2">شعار الشركة (اللوجو)</label>
                    <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-full overflow-hidden hover:bg-gray-50 transition cursor-pointer group bg-white shadow-sm">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                        {logo ? (
                            <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
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
                    <p className="text-xs text-gray-400 mt-2">اضغط على الدائرة لرفع صورة جديدة</p>
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
                        <label className="block text-sm font-bold text-gray-700 mb-2">أرقام الهواتف (الرئيسية)</label>
                        <input 
                            type="text" 
                            value={phoneNumbers} 
                            onChange={e => setPhoneNumbers(e.target.value)}
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="مثال: 09123... / 0123..."
                        />
                    </div>
                </div>

                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                    <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                        <Share2 size={18}/> بيانات التواصل في الإيصال (الفوتر)
                    </label>
                    <p className="text-xs text-blue-600 mb-3 leading-relaxed">
                        هذه البيانات ستظهر أسفل "نشرة أسعار الصرف" وعند مشاركة الإيصالات.
                        <br/>
                        يمكنك كتابة العنوان، أرقام التواصل الإضافية، الإيميل، أو أي ملاحظات.
                    </p>
                    <textarea 
                        value={footerMsg}
                        onChange={e => setFooterMsg(e.target.value)}
                        rows={5}
                        className="w-full p-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white"
                        placeholder="مثال: &#10;الخرطوم - السوق العربي - عمارة الذهب&#10;تلفون: 0912345678&#10;إيميل: info@exchange.com"
                    ></textarea>
                </div>

                <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={isProcessing} 
                        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition active:scale-95"
                    >
                        {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><Save size={20} /> حفظ التغييرات</>}
                    </button>
                </div>

            </form>
        </div>
    </div>
  );
};

export default AdminSettings;
