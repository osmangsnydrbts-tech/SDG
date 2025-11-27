
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
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        logging: false,
        allowTaint: true
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

      if (blob) {
        const fileName = `receipt_${transaction.receipt_number || transaction.id}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
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
      alert('حدث خطأ أثناء إنشاء الصورة. يرجى المحاولة مرة أخرى.');
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
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md">
        
        {/* Printable Area */}
        <div id="receipt-content" className="bg-white rounded-2xl shadow-2xl overflow-hidden relative transform transition-all">
          
          {/* 1. Header: Logo & Company Name */}
          <div className="bg-gray-50 p-6 border-b border-gray-100">
            <div className="flex items-center justify-center gap-3" dir="rtl">
                {company.logo ? (
                  <img src={company.logo} alt="Logo" className="h-14 w-14 object-contain rounded-lg bg-white border border-gray-100 p-1" />
                ) : (
                  <div className="h-14 w-14 bg-blue-100 rounded-full flex items-center justify-center">
                     <span className="text-xl font-bold text-blue-600">{company.name.charAt(0)}</span>
                  </div>
                )}
                <h2 className="text-2xl font-extrabold text-gray-800">{company.name}</h2>
            </div>
            <p className="text-gray-400 text-xs text-center mt-2 font-medium">إشعار معاملة مالية</p>
          </div>

          {/* 2. Receipt Content */}
          <div className="p-6 space-y-5">
            
            {/* Status & Type */}
            <div className="text-center border-b border-dashed border-gray-200 pb-4">
               <h3 className="text-lg font-bold text-blue-700 mb-1">{getTransactionType(transaction)}</h3>
               <p className="text-xs text-gray-500">رقم الإشعار: <span className="font-mono font-bold text-gray-700">{transaction.receipt_number || `#${transaction.id}`}</span></p>
               <p className="text-xs text-gray-500 mt-1" dir="ltr">
                  {new Date(transaction.created_at).toLocaleDateString('ar-EG')} - {new Date(transaction.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
               </p>
            </div>

            {/* Detailed Table */}
            <div className="space-y-3 text-sm">
              
              {/* Amount Received */}
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <span className="text-gray-600">المبلغ المستلم من العميل</span>
                <span className="font-bold text-gray-900 text-lg" dir="ltr">
                  {formatAmount(transaction.from_amount)} {transaction.from_currency}
                </span>
              </div>

              {/* Exchange Rate (Only for Exchange) */}
              {transaction.type === 'exchange' && transaction.rate && (
                <div className="flex justify-between items-center px-2">
                  <span className="text-gray-500">سعر الصرف</span>
                  <span className="font-bold text-gray-800">{transaction.rate}</span>
                </div>
              )}

              {/* Amount Delivered */}
              {transaction.to_amount && (
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-blue-800 font-bold">المبلغ المسلم للعميل</span>
                  <span className="font-extrabold text-blue-700 text-xl" dir="ltr">
                    {formatAmount(transaction.to_amount)} {transaction.to_currency}
                  </span>
                </div>
              )}

              {/* Commission */}
              {transaction.commission && transaction.commission > 0 && (
                 <div className="flex justify-between items-center px-2 pt-1">
                  <span className="text-gray-500">العمولة</span>
                  <span className="font-bold text-red-500">{transaction.commission.toLocaleString()} EGP</span>
                </div>
              )}
            </div>

            {/* 3. Footer: Employee Info */}
            <div className="pt-4 mt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                <span>الموظف المسؤول:</span>
                <span className="font-bold text-gray-700">{employee?.full_name}</span>
              </div>
              <div className="text-center text-xs text-gray-400 font-light">
                 شكراً لتعاملكم مع {company.name}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex gap-3">
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
