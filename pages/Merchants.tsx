import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Plus, User, ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react';

const Merchants: React.FC = () => {
  const { currentUser, merchants, addMerchant, addMerchantEntry, deleteMerchant } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState<number | null>(null);

  // Add Merchant Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Entry Form
  const [entryType, setEntryType] = useState<'credit' | 'debit'>('debit');
  const [currency, setCurrency] = useState<'EGP' | 'SDG'>('EGP');
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');

  const companyMerchants = merchants.filter(m => m.company_id === currentUser?.company_id && m.is_active);

  const handleAddMerchant = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.company_id) {
      addMerchant(currentUser.company_id, name, phone);
      setShowAddModal(false);
      setName('');
      setPhone('');
    }
  };

  // دالة معالجة إدخال المبلغ مع تحكم دقيق في المنازل العشرية
  const handleAmountChange = (value: string) => {
    // إزالة أي مسافات من المدخلات
    const trimmedValue = value.trim();
    
    // السماح فقط بالأرقام والنقطة العشرية
    const cleanedValue = trimmedValue.replace(/[^0-9.]/g, '');
    
    // إذا كانت القيمة فارغة بعد التنظيف
    if (cleanedValue === '') {
      setAmount('');
      setAmountError('');
      return;
    }
    
    // التحقق من أن المدخل لا يبدأ بنقطة
    if (cleanedValue === '.') {
      setAmount('0.');
      setAmountError('');
      return;
    }
    
    // التأكد من وجود نقطة عشرية واحدة فقط
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
      // لا تقبل أكثر من نقطة عشرية واحدة
      return;
    }
    
    // السماح بحد أقصى 2 منزلتين عشريتين (تم التغيير من 3 إلى 2)
    if (parts[1] && parts[1].length > 2) {
      // إذا كان المستخدم يحاول إضافة أكثر من منزلتين عشريتين، نقبل أول 2 فقط
      const truncatedDecimal = parts[1].substring(0, 2);
      setAmount(`${parts[0]}.${truncatedDecimal}`);
      setAmountError('');
      return;
    }
    
    // عدم السماح بأكثر من 10 أرقام قبل العلامة العشرية
    if (parts[0].length > 10) {
      return;
    }
    
    // السماح بإدخال الصفر كقيمة أولية
    if (cleanedValue === '0' || cleanedValue === '00') {
      setAmount('0');
      setAmountError('');
      return;
    }
    
    // إزالة الأصفار البادئة غير الضرورية
    if (parts[0].length > 1 && parts[0].startsWith('0') && !parts[0].startsWith('0.')) {
      const withoutLeadingZeros = parts[0].replace(/^0+/, '');
      if (parts[1]) {
        setAmount(`${withoutLeadingZeros}.${parts[1]}`);
      } else {
        setAmount(withoutLeadingZeros);
      }
      setAmountError('');
      return;
    }
    
    // منع الأرقام السالبة (يتم التحكم بالسالب من خلال نوع القيد)
    if (cleanedValue.includes('-')) {
      return;
    }
    
    // السماح بالأرقام العادية
    setAmount(cleanedValue);
    setAmountError('');
  };

  // دالة تقصير المنازل العشرية إلى منزلتين
  const truncateToTwoDecimals = (numStr: string): string => {
    const parts = numStr.split('.');
    
    // إذا لم يكن هناك جزء عشري أو كان فارغًا
    if (parts.length < 2 || !parts[1]) {
      return numStr;
    }
    
    // إذا كان الجزء العشري بطول 1، نضيف صفرًا
    if (parts[1].length === 1) {
      return `${parts[0]}.${parts[1]}0`;
    }
    
    // إذا كان الجزء العشري بطول 2 أو أكثر، نأخذ أول منزلتين
    if (parts[1].length >= 2) {
      const truncatedDecimal = parts[1].substring(0, 2);
      return `${parts[0]}.${truncatedDecimal}`;
    }
    
    return numStr;
  };

  const handleEntry = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!showEntryModal) return;
    
    // التحقق من صحة المبلغ
    if (!amount.trim()) {
      setAmountError('يرجى إدخال المبلغ');
      return;
    }
    
    // التحقق من أن المبلغ يحتوي على قيمة صالحة
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    
    // تطبيق تقصير المنازل العشرية
    let finalAmount = truncateToTwoDecimals(amount);
    
    // إذا كان المستخدم أدخل نقطة فقط في النهاية، نضيف صفرين
    if (amount.endsWith('.')) {
      finalAmount = amount + '00';
    }
    
    // التحويل إلى رقم مع التقريب إلى منزلتين عشريتين
    const roundedAmount = Math.round(parseFloat(finalAmount) * 100) / 100;
    
    // التحقق من أن الرقم النهائي صالح
    if (isNaN(roundedAmount) || roundedAmount <= 0) {
      setAmountError('يرجى إدخال مبلغ صحيح');
      return;
    }
    
    // التحقق من أن المبلغ لا يحتوي على أكثر من منزلتين عشريتين
    const decimalPart = finalAmount.split('.')[1];
    if (decimalPart && decimalPart.length > 2) {
      setAmountError('الحد الأقصى للمنازل العشرية هو منزلتين');
      return;
    }
    
    // إضافة القيد
    addMerchantEntry(showEntryModal, entryType, currency, roundedAmount);
    
    // إعادة تعيين الحقول
    setShowEntryModal(null);
    setAmount('');
    setAmountError('');
  };

  const handleDeleteMerchant = (id: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا التاجر؟')) {
      deleteMerchant(id);
    }
  };

  // دالة تنسيق الأرقام مع فواصل الآلاف ومنزلتين عشريتين
  const fmt = (n: number) => {
    if (n === null || n === undefined) return '0.00';
    
    return n.toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  };

  // دالة لإظهار عملة المتجر
  const getCurrencySymbol = (curr: 'EGP' | 'SDG') => {
    return curr === 'EGP' ? 'ج.م' : 'ج.س';
  };

  // دالة لحساب الرصيد الإجمالي
  const getTotalBalance = (merchant: any) => {
    return fmt(merchant.egp_balance + (merchant.sdg_balance || 0));
  };

  // دالة لتنسيق المبلغ المدخل في الـ input لعرضه بشكل أفضل
  const formatInputAmount = (value: string) => {
    if (!value) return '';
    
    // إذا كان يحتوي على نقطة عشرية، نتركه كما هو
    if (value.includes('.')) {
      return value;
    }
    
    // إذا كان رقمًا صحيحًا كبيرًا، يمكن إضافة فواصل للقراءة
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 1000) {
      return num.toLocaleString('ar-EG', {
        maximumFractionDigits: 0,
        useGrouping: true
      });
    }
    
    return value;
  };

  // دالة لإظهار التحذير عند محاولة إدخال أكثر من منزلتين عشريتين
  const showDecimalWarning = () => {
    if (!amount) return false;
    
    const parts = amount.split('.');
    if (parts.length < 2) return false;
    
    return parts[1].length > 2;
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full bg-indigo-600 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md hover:bg-indigo-700 transition-colors"
      >
        <Plus size={20} /> إضافة تاجر جديد
      </button>

      <div className="space-y-3">
        {companyMerchants.map((m) => (
          <div key={m.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 p-2 rounded-full text-indigo-600">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{m.name}</h3>
                  <p className="text-xs text-gray-500">{m.phone || 'لا يوجد رقم هاتف'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowEntryModal(m.id);
                    setAmount('');
                    setAmountError('');
                  }}
                  className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold hover:bg-indigo-100 transition-colors"
                >
                  تسجيل قيد
                </button>
                <button
                  onClick={() => handleDeleteMerchant(m.id)}
                  className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                  title="حذف التاجر"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">الرصيد الإجمالي</span>
                <span className={`font-bold text-lg ${(m.egp_balance + (m.sdg_balance || 0)) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {getTotalBalance(m)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  مصري
                </span>
                <span className={`font-bold ${m.egp_balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {fmt(m.egp_balance)} <span className="text-xs text-gray-500">ج.م</span>
                </span>
              </div>
              <div className="flex justify-between items-center border-r pr-2 border-gray-200">
                <span className="text-gray-500 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  سوداني
                </span>
                <span className={`font-bold ${m.sdg_balance < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {fmt(m.sdg_balance)} <span className="text-xs text-gray-500">ج.س</span>
                </span>
              </div>
            </div>
          </div>
        ))}
        {companyMerchants.length === 0 && (
          <div className="text-center py-8">
            <div className="bg-gray-50 p-6 rounded-xl">
              <User size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-2">لا يوجد تجار</p>
              <p className="text-sm text-gray-400">ابدأ بإضافة تاجر جديد</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">إضافة تاجر</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <form onSubmit={handleAddMerchant} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم التاجر</label>
                <input
                  type="text"
                  placeholder="أدخل اسم التاجر"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  placeholder="رقم الهاتف (اختياري)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                >
                  حفظ
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">تسجيل قيد جديد</h3>
              <button
                onClick={() => {
                  setShowEntryModal(null);
                  setAmount('');
                  setAmountError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع القيد</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEntryType('debit')}
                    className={`flex-1 p-3 border rounded-lg flex flex-col items-center gap-2 transition-all ${
                      entryType === 'debit'
                        ? 'bg-red-50 border-red-500 text-red-600'
                        : 'border-gray-300 hover:border-red-300'
                    }`}
                  >
                    <ArrowDownLeft size={20} />
                    <span>عليه (مدين)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('credit')}
                    className={`flex-1 p-3 border rounded-lg flex flex-col items-center gap-2 transition-all ${
                      entryType === 'credit'
                        ? 'bg-green-50 border-green-500 text-green-600'
                        : 'border-gray-300 hover:border-green-300'
                    }`}
                  >
                    <ArrowUpRight size={20} />
                    <span>له (دائن)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العملة</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'EGP' | 'SDG')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="SDG">جنيه سوداني (SDG)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المبلغ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={formatInputAmount(amount)}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={`w-full p-3 border rounded-lg text-lg font-bold text-right ${
                      amountError || showDecimalWarning()
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-indigo-500'
                    } focus:ring-2 focus:border-transparent`}
                    required
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {getCurrencySymbol(currency)}
                  </div>
                </div>
                {amountError && <p className="text-red-500 text-sm mt-1">{amountError}</p>}
                {showDecimalWarning() && !amountError && (
                  <p className="text-orange-500 text-sm mt-1">سيتم تقصير المنازل العشرية إلى منزلتين</p>
                )}
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">يمكن إدخال المنازل العشرية (مثال: 1500.75)</p>
                  <p className="text-xs text-gray-500">الحد الأقصى: منزلتين عشريتين</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors"
                >
                  تسجيل القيد
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEntryModal(null);
                    setAmount('');
                    setAmountError('');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Merchants;
