
import React, { useState } from 'react';
import { Transaction, Company, User } from '../types';
import { X, Share2, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
  transaction: Transaction | null;
  company: Company | undefined;
  employee: User | undefined;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, company, employee, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);

  if (!transaction || !company) return null;

  const handleShareImage = async () => {
    const element = document.getElementById('receipt-content');
    if (!element || isSharing) return;

    setIsSharing(true);

    try {
      // Wait a moment to ensure UI is fully rendered
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 3, // Higher scale for better text rendering
        useCORS: true,
        logging: false,
        allowTaint: true,
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        x: 0,
        y: 0,
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));

      if (blob) {
        const fileName = `receipt_${transaction.receipt_number || transaction.id}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        let shared = false;
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'إشعار عملية',
              text: `إشعار عملية - ${company.name}`,
            });
            shared = true;
          } catch (error) {
            console.warn('Sharing cancelled or failed', error);
          }
        } 

        if (!shared) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error('Error generating image', error);
      alert('حدث خطأ أثناء إنشاء الصورة.');
    } finally {
      setIsSharing(false);
    }
  };

  const getTransactionType = (t: Transaction) => {
    if (t.type === 'exchange') return 'عملية صرف عملة';
    if (t.type === 'e_wallet') return 'تحويل محفظة إلكترونية';
    if (t.type === 'treasury_feed') return 'إيداع نقدي';
    if (t.type === 'treasury_withdraw') return 'سحب نقدي';
    if (t.type === 'wallet_feed') return 'تغذية محفظة';
    return 'عملية مالية';
  };

  const formatAmount = (amount: number) => {
    if (transaction.type === 'exchange') {
      return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto font-sans">
      <div className="w-full max-w-md my-auto">
        
        {/* Printable Area */}
        <div 
          id="receipt-content" 
          className="bg-white rounded-3xl shadow-2xl overflow-hidden relative px-6 py-8" 
          dir="rtl"
          style={{ fontFamily: "'Tajawal', sans-serif" }}
        >
          
          {/* 1. Header Section */}
          <div className="flex justify-between items-center mb-6">
             {/* Right: Logo */}
             <div className="flex-shrink-0">
                {company.logo ? (
                  <img 
                    src={company.logo} 
                    alt="Logo" 
                    className="h-20 w-20 object-contain rounded-xl border border-gray-100 bg-white p-1 shadow-sm" 
                    crossOrigin="anonymous" 
                  />
                ) : (
                  <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl border border-blue-200">
                     {company.name.charAt(0)}
                  </div>
                )}
             </div>

             {/* Left: Company Name */}
             <div className="flex-1 text-left pl-4">
                <h2 className="text-2xl font-extrabold text-gray-900 leading-relaxed py-1" style={{ wordBreak: 'break-word' }}>
                  {company.name}
                </h2>
             </div>
          </div>

          {/* Gray Capsule Title */}
          <div className="flex justify-center mb-8">
            <div className="bg-gray-100 text-gray-600 font-bold px-6 py-2 rounded-full text-sm tracking-wide shadow-inner border border-gray-200">
              إشعار معاملة مالية
            </div>
          </div>

          {/* 2. Transaction Details */}
          <div className="text-center mb-8">
             <h3 className="text-2xl font-extrabold text-blue-700 mb-2 leading-snug">{getTransactionType(transaction)}</h3>
             
             <div className="flex items-center justify-center gap-2 text-gray-500 mb-1">
               <span className="text-sm font-medium">رقم الإشعار:</span>
               <span className="font-mono font-bold text-gray-800 text-lg">{transaction.receipt_number || `#${transaction.id}`}</span>
             </div>
             
             <p className="text-xs text-gray-400 font-medium" dir="ltr">
                {new Date(transaction.created_at).toLocaleDateString('ar-EG')} - {new Date(transaction.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
             </p>
          </div>

          {/* Separator Line */}
          <div className="border-t-2 border-dashed border-gray-100 mb-8"></div>

          {/* 3. Amounts Section */}
          <div className="space-y-6">
            
            {/* Amount Received */}
            <div className="flex justify-between items-center px-2">
              <span className="text-gray-600 font-bold text-lg">المبلغ المستلم من العميل</span>
              <div className="text-left">
                <div className="font-extrabold text-gray-900 text-2xl leading-none" dir="ltr">
                  {formatAmount(transaction.from_amount)}
                </div>
                <div className="text-xs text-gray-500 font-bold mt-1 uppercase text-left" dir="ltr">{transaction.from_currency}</div>
              </div>
            </div>

            {/* Exchange Rate */}
            {transaction.type === 'exchange' && transaction.rate && (
              <div className="flex justify-between items-center px-2">
                <span className="text-gray-500 font-medium">سعر الصرف</span>
                <span className="font-bold text-gray-800 text-xl">{transaction.rate}</span>
              </div>
            )}

            {/* Delivered Amount (Blue Card) */}
            {transaction.to_amount && (
              <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200 mt-2">
                <div className="flex justify-between items-center mb-1">
                   <span className="font-bold text-blue-100 text-lg">المبلغ المسلم للعميل</span>
                </div>
                <div className="flex justify-between items-end">
                   <div className="font-extrabold text-4xl tracking-tight leading-tight pt-2" dir="ltr">
                     {formatAmount(transaction.to_amount)}
                   </div>
                   <div className="text-lg font-bold text-blue-200 mb-1 uppercase" dir="ltr">{transaction.to_currency}</div>
                </div>
              </div>
            )}

            {/* Commission */}
            {transaction.commission && transaction.commission > 0 && (
                <div className="flex justify-between items-center px-2 pt-2">
                <span className="text-gray-500 font-medium">العمولة</span>
                <span className="font-bold text-red-500 text-lg">{transaction.commission.toLocaleString()} EGP</span>
              </div>
            )}
          </div>

          {/* 4. Footer */}
          <div className="mt-10 pt-6 border-t border-gray-100">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="text-gray-500 text-sm font-medium">الموظف المسؤول:</span>
              <span className="font-bold text-gray-800 text-base">{employee?.full_name}</span>
            </div>
            
            <div className="text-center">
               <p className="text-gray-400 text-xs font-medium">شكراً لثقتكم بنا</p>
            </div>
          </div>

        </div>

        {/* Action Buttons (Hidden in Image) */}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="bg-white text-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors">
            <X size={24} />
          </button>
          
          <button 
            onClick={handleShareImage} 
            disabled={isSharing}
            className={`flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${isSharing ? 'opacity-75 cursor-wait' : 'hover:bg-blue-700 active:scale-95'}`}
          >
            {isSharing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : (
              <>
                <Share2 size={20} />
                <span>مشاركة الإشعار</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
