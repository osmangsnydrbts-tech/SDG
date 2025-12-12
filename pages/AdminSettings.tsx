
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Building, UploadCloud, Save, Loader2, Share2, CheckCircle, AlertCircle, ArrowLeft, Copy, Database } from 'lucide-react';
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

  const SQL_FIX_CODE = `
/* 1. هيكل المبيعات (Sales Structure) */
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false;

/* 2. تسجيل العمليات الملغاة (Cancelled Transactions Audit) */
/* هام: هذا الكود يضيف أعمدة لتوثيق سبب الإلغاء ومن قام به ووقت الإلغاء */
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cancelled_by bigint;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

/* 3. رصيد المبيعات في الخزينة (Sales Balance) */
ALTER TABLE public.treasuries ADD COLUMN IF NOT EXISTS sales_balance float8 DEFAULT 0;

/* 4. إعدادات الشركة (Company Settings) */
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone_numbers text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS footer_message text;

/* 5. المحافظ الإلكترونية (E-Wallets) */
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS wallet_id bigint;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS wallet_type text;
ALTER TABLE public.e_wallets ADD COLUMN IF NOT EXISTS commission float8 DEFAULT 0;

/* 6. تحديث الكاش (Refresh Cache) */
NOTIFY pgrst, 'reload schema';
  `.trim();

  useEffect(() => {
    if (currentCompany) {
        setName(currentCompany.name);
        setLogo(currentCompany.logo || '');
        setFooterMsg(currentCompany.footer_message || '');
        setPhoneNumbers(currentCompany.phone_numbers || '');
    }
  }, [currentCompany]);

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
          const MAX_WIDTH = 400; 
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
            if (file.size > 2 * 1024 * 1024) {
               setMsg({ type: 'error', text: 'حجم الصورة كبير جداً.' });
               return;
            }
            const compressedLogo = await compressImage(file);
            setLogo(compressedLogo);
            setMsg(null);
        } catch (error) {
            setMsg({ type: 'error', text: 'فشل في معالجة الصورة.' });
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
            setMsg({ type: 'success', text: 'تم حفظ الإعدادات' });
        } else {
            setMsg({ type: 'error', text: 'فشل الحفظ. تأكد من تحديث قاعدة البيانات بالكود أدناه.' });
        }
      } catch (err) {
        setMsg({ type: 'error', text: 'حدث خطأ غير متوقع' });
      } finally {
        setIsProcessing(false);
      }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SQL_FIX_CODE);
    alert('تم نسخ كود إنشاء جداول المبيعات');
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

            {/* Database Repair Helper - High Visibility */}
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 mb-8 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                        <Database size={24}/>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-indigo-800 text-lg mb-1">
                            تحديث هيكل النظام (هام جداً للحسابات)
                        </h3>
                        <p className="text-sm text-indigo-700 mb-3 leading-relaxed">
                           لضمان دقة الحسابات وتفعيل نظام "سجل التعديلات" (Audit Log) للمبيعات والإلغاء، يرجى نسخ الكود أدناه وتشغيله في قاعدة البيانات.
                        </p>
                        
                        <div className="relative group">
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono text-left shadow-inner" dir="ltr">
                                {SQL_FIX_CODE}
                            </pre>
                            <button 
                                onClick={copySql}
                                className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-2 text-xs font-bold backdrop-blur-sm"
                            >
                                <Copy size={14} /> نسخ الكود
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">الهوية والشعار</h3>
                    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-white shadow-sm group">
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"/>
                            {logo ? <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" /> : <div className="flex flex-col items-center justify-center h-full text-gray-400"><UploadCloud size={32} /></div>}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">اضغط على الصورة لتغيير الشعار</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">اسم الشركة</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-3 border rounded-xl" required />
                    </div>
                </div>

                <hr className="border-gray-100" />

                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">بيانات التواصل (الفوتر)</h3>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">أرقام الهواتف</label>
                        <input type="text" value={phoneNumbers} onChange={e => setPhoneNumbers(e.target.value)} className="w-full p-3 border rounded-xl" />
                    </div>

                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                        <label className="block text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <Share2 size={18}/> رسالة الفوتر
                        </label>
                        <textarea value={footerMsg} onChange={e => setFooterMsg(e.target.value)} rows={5} className="w-full p-3 border border-blue-200 rounded-xl resize-none bg-white"></textarea>
                    </div>
                </div>

                <div className="pt-2">
                    <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition active:scale-95">
                        {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <><Save size={20} /> حفظ الإعدادات</>}
                    </button>
                    {msg && <p className={`text-center mt-4 font-bold ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>}
                </div>
            </form>
        </div>
    </div>
  );
};

export default AdminSettings;
