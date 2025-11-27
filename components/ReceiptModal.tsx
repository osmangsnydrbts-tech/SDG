
import React from 'react';
import { Transaction, Company, User } from '../types';
import { X, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
  transaction: Transaction | null;
  company: Company | undefined;
  employee: User | undefined;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, company, employee, onClose }) => {
  if (!transaction || !company) return null;

  const handleShareImage = async () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `receipt_${transaction.receipt_number || transaction.id}.png`, { type: 'image/png' });
          
          // Use Web Share API if available
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'إشعار عملية',
                text: `إشعار عملية من ${company.name}`,
              });
            } catch (error) {
              console.error('Error sharing', error);
            }
          } else {
            // Fallback to Download
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `receipt_${transaction.receipt_number || transaction.id}.png`;
            link.click();
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error generating image', error);
      alert('حدث خطأ أثناء إنشاء الصورة');
    }
  };

  const getTransactionType = (t: Transaction) => {
    if (t.type === 'exchange') return `صرف (${t.from_currency} -> ${t.to_currency})`;
    if (t.type === 'e_wallet') return 'تحويل محفظة إلكترونية';
    if (t.type === 'treasury_feed') return 'إيداع خزينة';
    if (t.type === 'treasury_withdraw') return 'سحب خزينة';
    return 'عملية أخرى';
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Printable Area */}
        <div id="receipt-content" className="bg-white rounded-2xl shadow-2xl overflow-hidden relative">
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
              <h2 className="text-3xl font-bold text-gray-800 mb-1">
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
                  <span className="font-bold">{transaction.to_amount.toLocaleString()} {transaction.to_currency}</span>
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
            
            <div className="text-center text-xs text-gray-300 pt-4">
               نظام الصرفة
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="bg-white text-gray-700 p-3 rounded-full shadow-lg hover:bg-gray-50">
            <X size={24} />
          </button>
          
          <button 
            onClick={handleShareImage} 
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg"
          >
            <Share2 size={20} /> حفظ / مشاركة كصورة
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
