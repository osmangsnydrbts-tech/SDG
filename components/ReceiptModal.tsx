
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
      // Small delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Ensure High Res
        useCORS: true,
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc: Document) => {
            const clonedElement = clonedDoc.getElementById('receipt-content');
            if (clonedElement) {
                clonedElement.style.width = '400px'; 
                clonedElement.style.margin = '0 auto';
                clonedElement.style.transform = 'none';
                clonedElement.style.fontVariantLigatures = 'normal';
                clonedElement.style.letterSpacing = 'normal';
            }
        }
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

      if (blob) {
        const fileName = `receipt_${transaction.receipt_number || transaction.id}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'إشعار عملية',
              text: `إشعار عملية - ${company.name}`,
            });
          } catch (error) {
            console.log('Sharing failed or cancelled', error);
          }
        } else {
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
      alert('حدث خطأ أثناء إنشاء الصورة. حاول مرة أخرى.');
    } finally {
      setIsSharing(false);
    }
  };

  const getTransactionType = (t: Transaction) => {
    if (t.type === 'exchange') return 'عملية صرف عملة';
    if (t.type === 'treasury_feed') return 'إيداع نقدي';
    if (t.type === 'treasury_withdraw') return 'سحب نقدي';
    if (t.type === 'expense') return 'منصرفات';
    if (t.type === 'sale') return 'بيع منتج';
    if (t.type === 'wallet_feed') return 'تغذية محفظة';
    if (t.type === 'wallet_transfer') {
         if (t.wallet_type === 'withdraw') return 'سحب من محفظة';
         if (t.wallet_type === 'deposit') return 'إيداع في محفظة';
         if (t.wallet_type === 'exchange') return 'صرف عبر محفظة';
         return 'تحويل محفظة';
    }
    return 'عملية مالية';
  };

  const getAmountLabel = (t: Transaction) => {
      if (t.type === 'exchange') return 'المبلغ المستلم من العميل';
      if (t.type === 'expense') return 'المبلغ المخصوم';
      if (t.type === 'sale') return 'سعر المنتج';
      return 'المبلغ';
  };

  // Ensure no decimals are shown
  const formatAmount = (amount: number) => {
    return Math.round(amount).toLocaleString('en-US');
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-md my-auto">
        
        {/* Printable Area - Fixed Font Stack & Ligatures for Canvas Reliability */}
        <div 
          id="receipt-content" 
          className="bg-white rounded-2xl shadow-2xl overflow-hidden relative" 
          style={{ 
            fontFamily: 'Tajawal, sans-serif',
            letterSpacing: 'normal',
            direction: 'rtl'
          }}
        >
          
          {/* Header */}
          <div className="bg-gray-50 p-6 border-b border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="flex flex-row-reverse items-center justify-center gap-3 w-full flex-nowrap">
                <h2 className="text-xl font-extrabold text-gray-800 text-right whitespace-nowrap overflow-visible">
                  {company.name}
                </h2>
                {company.logo ? (
                  <img 
                    src={company.logo} 
                    alt="Logo" 
                    className="h-14 w-14 object-contain rounded-lg bg-white border border-gray-200 p-0.5 shrink-0" 
                    crossOrigin="anonymous" 
                  />
                ) : (
                  <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center shrink-0 text-blue-600 font-bold text-xl">
                     {company.name.charAt(0)}
                  </div>
                )}
            </div>
            <p className="text-gray-400 text-xs mt-3 font-medium tracking-wide">إشعار معاملة مالية</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5 bg-white">
            
            <div className="text-center border-b border-dashed border-gray-200 pb-4">
               <h3 className="text-lg font-bold text-blue-700 mb-1">{getTransactionType(transaction)}</h3>
               <p className="text-xs text-gray-500">رقم الإشعار: <span className="font-mono font-bold text-gray-700 text-sm">{transaction.receipt_number || `#${transaction.id}`}</span></p>
               <p className="text-xs text-gray-500 mt-1" dir="ltr">
                  {new Date(transaction.created_at).toLocaleDateString('ar-EG')} - {new Date(transaction.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
               </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 font-medium">
                    {getAmountLabel(transaction)}
                </span>
                <span className="font-bold text-gray-900 text-lg" dir="ltr">
                  {formatAmount(transaction.from_amount)} {transaction.from_currency}
                </span>
              </div>

              {transaction.product_name && (
                   <div className="flex justify-between items-center px-2">
                     <span className="text-gray-500">المنتج</span>
                     <span className="font-bold text-gray-800">{transaction.product_name}</span>
                   </div>
              )}

              {transaction.type === 'expense' && transaction.description && (
                  <div className="bg-red-50 p-3 rounded-lg text-center text-red-700 font-bold text-sm">
                      {transaction.description}
                  </div>
              )}

              {transaction.type === 'exchange' && transaction.rate && (
                <div className="flex justify-between items-center px-2">
                  <span className="text-gray-500">سعر الصرف</span>
                  <span className="font-bold text-gray-800">{transaction.rate}</span>
                </div>
              )}

              {transaction.to_amount && (
                <div className="flex justify-between items-center p-4 bg-blue-600 rounded-lg shadow-sm text-white">
                  <span className="text-blue-100 font-bold">
                     {transaction.type === 'exchange' ? 'المبلغ المسلم للعميل' : 'المبلغ المستلم'}
                  </span>
                  <span className="font-extrabold text-2xl" dir="ltr">
                    {formatAmount(transaction.to_amount)} {transaction.to_currency}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-6 mt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>الموظف المسؤول:</span>
                <span className="font-bold text-gray-700">{employee?.full_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
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
                <span>مشاركة الإشعار (صورة)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
