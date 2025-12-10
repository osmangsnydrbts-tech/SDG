
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Building, UploadCloud, Save, Loader2, Share2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminSettings: React.FC = () => {
  const { currentUser, companies, updateCompany } = useStore();
  const navigate = useNavigate();
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
          const MAX_WIDTH = 400; // Reduced for safety
          const MAX_HEIGHT = 400;

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
          
          // Compress to JPEG with 0.7 quality to keep size small
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
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
            // Check file size (limit to 2MB before compression)
            if (file.size > 2 * 1024 * 1024) {
               setMsg({ type: 'error', text: 'حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 2MB.' });
               return;
            }
            const compressedLogo = await compressImage(file);
            setLogo(compressedLogo);
            setMsg(null);
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setMsg(null), 3000);
        } else {
            console.error('Update failed:', res.message);
            // Check specifically for the missing column error
            if (res.message.includes('footer_message') || res.message.includes('schema cache')) {
                setMsg({ type: 'error', text: 'تنبيه: قاعدة البيانات غير محدثة. يرجى تشغيل كود SQL الذي تم توفيره لإضافة الأعمدة الجديدة.' });
            } else {
                setMsg({ type: 'error', text: `فشل الحفظ: ${res.message}` });
            }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setMsg({ type: 'error', text: 'حدث خطأ غير متوقع أثناء الحفظ' });
      } finally {
        setIsProcessing(false);
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
        
        <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-blue-600 transition w-fit" onClick={() => navigate('/admin')}>
            <ArrowLeft size={18} />
            <span className="text-sm font-bold">العودة للرئيسية</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
                <Building size={24} className="text-blue-600" />
                إعدادات الشركة
            </h2>

            {msg && (
                <div className={`p-4 rounded-xl flex items-center gap-3 font-bold mb-6 ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {msg.type === 'success' ? <CheckCircle size={24}/> : <AlertCircle size={24}/>}
                    <span>{msg.text}</span>
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                
                {/* Section 1: Branding */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">الهوية والشعار</h3>
                    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-white shadow-sm group">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                            />
                            {logo ? (
                                <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <UploadCloud size={32} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-xs font-bold z-20 pointer-events-none">
                                تغيير
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">اضغط على الصورة لتغيير الشعار (يفضل صورة مربعة)</p>
                    </div>

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
                </div>

                <hr className="border-gray-100" />

                {/* Section 2: Contact Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">بيانات التواصل (الفوتر)</h3>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">أرقام الهواتف الرئيسية</label>
                        <input 
                            type="text" 
                            value={phoneNumbers} 
                            onChange={e => setPhoneNumbers(e.target.value)}
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" 
                            placeholder="مثال: 09123... / 0123..."
                        />
                    </div>

                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                        <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <Share2 size={18}/> رسالة الفوتر (عند المشاركة)
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
                </div>

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
