
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
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        x: 0,
        y: 0
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
      <div className="w-full max-w-sm my-auto">
        
        {/* Printable Area */}
        <div 
          id="receipt-content" 
          className="bg-white rounded-xl shadow-2xl overflow-hidden relative p-6 text-center" 
          dir="rtl"
          style={{ fontFamily: "'Tajawal', sans-serif" }}
        >
          
          {/* 1. Logo (Center) */}
          <div className="flex justify-center mb-3">
            {company.logo ? (
              <img 
                src={company.logo} 
                alt="Logo" 
                className="h-20 w-20 object-contain rounded-xl border border-gray-100 bg-white p-1" 
                crossOrigin="anonymous" 
              />
            ) : (
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl border border-blue-200">
                  {company.name.charAt(0)}
              </div>
            )}
          </div>

          {/* 2. Company Name (Center) */}
          <h2 className="text-lg font-bold text-gray-800 mb-1 leading-tight">
            {company.name}
          </h2>

          {/* 3. Transaction Type (Center) */}
          <h3 className="text-blue-600 font-bold text-base mb-6 pb-4 border-b border-dashed border-gray-200">
            {getTransactionType(transaction)}
          </h3>

          {/* 4. Details Body */}
          <div className="space-y-5 mb-6">
            
            {/* Amount Received */}
            <div>
              <p className="text-gray-500 text-xs mb-1">المبلغ المستلم من العميل</p>
              <div className="text-gray-900 font-bold text-xl dir-ltr">
                {formatAmount(transaction.from_amount)} <span className="text-sm font-medium">{transaction.from_currency}</span>
              </div>
            </div>

            {/* Exchange Rate (If exists) - Side by Side */}
            {transaction.type === 'exchange' && transaction.rate && (
              <div className="flex justify-center items-center gap-2 bg-gray-50 py-2 rounded-lg mx-4">
                <span className="text-gray-500 text-xs">سعر الصرف:</span>
                <span className="text-gray-800 font-bold text-base">{transaction.rate}</span>
              </div>
            )}

            {/* Amount Delivered */}
            {transaction.to_amount && (
              <div>
                <p className="text-gray-500 text-xs mb-1">المبلغ المسلم للعميل</p>
                <div className="text-blue-700 font-extrabold text-2xl dir-ltr">
                  {formatAmount(transaction.to_amount)} <span className="text-base font-bold">{transaction.to_currency}</span>
                </div>
              </div>
            )}

            {/* Commission (If exists) */}
            {transaction.commission && transaction.commission > 0 && (
               <div>
                 <p className="text-gray-400 text-[10px]">العمولة</p>
                 <p className="text-red-500 font-bold text-sm">{transaction.commission.toLocaleString()} EGP</p>
               </div>
            )}

          </div>

          {/* 5. Footer Info */}
          <div className="border-t border-gray-100 pt-4 text-xs text-gray-500 space-y-2">
            <div className="flex justify-between px-2">
               <span>التاريخ:</span>
               <span className="font-bold dir-ltr">
                 {new Date(transaction.created_at).toLocaleDateString('ar-EG')}
               </span>
            </div>
            <div className="flex justify-between px-2">
               <span>رقم الإشعار:</span>
               <span className="font-mono font-bold text-gray-700">{transaction.receipt_number || `#${transaction.id}`}</span>
            </div>
            <div className="flex justify-between px-2">
               <span>الموظف:</span>
               <span className="font-bold text-gray-700">{employee?.full_name}</span>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex gap-3">
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
