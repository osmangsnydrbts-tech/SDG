
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
      // Wait a moment to ensure UI is stable
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 3, // High resolution for crisp text
        useCORS: true, // Allow loading external images (logos)
        logging: false,
        allowTaint: true
      });

      // Convert canvas to blob using a Promise wrapper for cleaner async/await
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));

      if (blob) {
        const fileName = `receipt_${transaction.receipt_number || transaction.id}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        
        // Check if the browser supports file sharing via Web Share API
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'إشعار عملية',
              text: `إشعار عملية - ${company.name}`,
            });
          } catch (error) {
            console.log('Sharing cancelled or failed', error);
          }
        } else {
          // Fallback to direct download
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
    if (t.type === 'exchange') return `صرف (${t.from_currency} -> ${t.to_currency})`;
    if (t.type === 'e_wallet') return 'تحويل محفظة إلكترونية';
    if (t.type === 'treasury_feed') return 'إيداع خزينة';
    if (t.type === 'treasury_withdraw') return 'سحب خزينة';
    if (t.type === 'wallet_feed') return 'تغذية محفظة';
    return 'عملية أخرى';
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md">
        
        {/* Printable Area */}
        <div id="receipt-content" className="bg-white rounded-2xl shadow-2xl overflow-hidden relative transform transition-all">
          {/* Header / Logo */}
          <div className="bg-gray-50 p-6 text-center border-b border-gray-100">
            {company.logo ? (
              <img src={company.logo} alt="Logo" className="h-20 mx-auto object-contain mb-3" />
            ) : (
              <div className="text-2xl font-bold text-gray-800">{company.name}</div>
            )}
            <p className="text-gray-500 text-sm mt-2">إشعار عملية</p>
          </div>

          {/* Receipt Content */}
          <div className="p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-1" dir="ltr">
                {transaction.from_amount.toLocaleString()} <span className="text-lg text-gray-500">{transaction.from_currency}</span>
              </h2>
              <p className="text-green-600 font-bold bg-green-50 inline-block px-3 py-1 rounded-full text-sm">
                 تمت العملية بنجاح
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                <span className="text-gray-500">رقم الإشعار</span>
                <span className="font-bold font-mono">{transaction.receipt_number || `#${transaction.id}`}</span>
              </div>
              
              <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                <span className="text-gray-500">نوع العملية</span>
                <span className="font-bold">{getTransactionType(transaction)}</span>
              </div>

              <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                <span className="text-gray-500">التاريخ والوقت</span>
                <span className="font-bold" dir="ltr">
                  {new Date(transaction.created_at).toLocaleDateString('ar-EG')} - {new Date(transaction.created_at).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>

              {transaction.to_amount && (
                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                  <span className="text-gray-500">المبلغ المستلم</span>
                  <span className="font-bold" dir="ltr">{transaction.to_amount.toLocaleString()} {transaction.to_currency}</span>
                </div>
              )}

              {transaction.commission && transaction.commission > 0 && (
                 <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                  <span className="text-gray-500">العمولة</span>
                  <span className="font-bold text-red-500">{transaction.commission.toLocaleString()} EGP</span>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <span className="text-gray-500">الموظف المسؤول</span>
                <span className="font-bold">{employee?.full_name}</span>
              </div>
            </div>
            
            <div className="text-center text-xs text-gray-300 pt-4 mt-4 border-t border-gray-50">
               نظام الصرفة الإلكتروني
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
