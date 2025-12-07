
import React, { useState, useEffect } from 'react';
import { Transaction, Company, User } from '../types';
import { X, Share2, Loader2, CheckCircle2, Copy } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
  transaction: Transaction | null;
  company: Company | undefined;
  employee: User | undefined;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, company, employee, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!transaction || !company) return null;

  const handleShareImage = async () => {
    const element = document.getElementById('receipt-content');
    if (!element || isSharing) return;

    setIsSharing(true);

    try {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 3, 
        useCORS: true,
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('receipt-content');
          if (clonedElement) {
            // Apply specific styles for the image capture to ensure Arabic text renders correctly
            clonedElement.style.direction = 'rtl';
            clonedElement.style.fontFamily = "'Tajawal', sans-serif";
            clonedElement.style.textAlign = 'center';
            
            // Fix text rendering issues
            const allElements = clonedElement.querySelectorAll('*');
            Array.from(allElements).forEach((el: any) => {
              if (el.style) {
                 el.style.fontVariantLigatures = 'none';
                 el.style.fontFeatureSettings = '"liga" 0';
                 el.style.letterSpacing = '0px'; 
              }
            });

            // Ensure LTR for numbers
            const ltrElements = clonedElement.querySelectorAll('[dir="ltr"]');
            Array.from(ltrElements).forEach((el: any) => {
                el.style.direction = 'ltr';
                el.style.textAlign = 'center';
            });
            
            // Explicitly set colors to ensure they capture correctly
            const blueElements = clonedElement.querySelectorAll('.text-blue-600');
            Array.from(blueElements).forEach((el: any) => el.style.color = '#2563eb');
          }
        }
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));

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
            console.log('Share cancelled', error);
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
      console.error('Error generating receipt image', error);
      alert('حدث خطأ أثناء حفظ الإشعار');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyDetails = () => {
    const details = `
${company.name}
${getTransactionType(transaction)}
رقم الإشعار: ${transaction.receipt_number || transaction.id}
التاريخ: ${new Date(transaction.created_at).toLocaleDateString('ar-SA')}
المبلغ: ${transaction.from_amount.toLocaleString('ar-SA')} ${transaction.from_currency}
${transaction.to_amount ? `المستلم: ${transaction.to_amount.toLocaleString('ar-SA')} ${transaction.to_currency}` : ''}
الموظف: ${employee?.full_name || 'غير محدد'}
    `.trim();

    navigator.clipboard.writeText(details).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getTransactionType = (t: Transaction) => {
    const types: Record<string, string> = {
      'exchange': 'عملية صرف عملة',
      'e_wallet': 'تحويل محفظة',
      'wallet_deposit': 'إيداع محفظة',
      'wallet_withdrawal': 'سحب محفظة',
      'treasury_feed': 'استلام نقدية',
      'treasury_withdraw': 'صرف نقدية',
      'wallet_feed': 'تغذية محفظة'
    };
    return types[t.type] || 'عملية مالية';
  };

  const getFromLabel = (t: Transaction) => {
    const labels: Record<string, string> = {
      'exchange': 'المبلغ المستلم من العميل',
      'wallet_deposit': 'المبلغ المستلم من العميل',
      'wallet_withdrawal': 'المبلغ المخصوم من المحفظة',
      'treasury_feed': 'المبلغ المستلم',
      'treasury_withdraw': 'المبلغ المسلم',
      'wallet_feed': 'قيمة التغذية'
    };
    return labels[t.type] || 'المبلغ';
  };

  const getToLabel = (t: Transaction) => {
    const labels: Record<string, string> = {
      'exchange': 'المبلغ المسلم للعميل',
      'wallet_deposit': 'المبلغ المودع في المحفظة',
      'wallet_withdrawal': 'المبلغ المسلم للعميل', // Withdrawal means giving cash to customer
    };
    return labels[t.type] || 'المبلغ المستلم';
  };

  const formatAmount = (amount: number) => {
    // Show integer for large amounts if no decimals, or standard format
    return amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
      <div className="w-full max-w-sm my-auto animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Printable Area - Designed to match the image */}
        <div id="receipt-content" className="bg-white rounded-3xl overflow-hidden relative shadow-2xl" dir="rtl">
          
          {/* Header Section */}
          <div className="pt-8 pb-4 px-6 flex flex-col items-center text-center">
             {/* Logo */}
             <div className="mb-4 relative">
                {company.logo ? (
                    <img 
                        src={company.logo} 
                        className="w-24 h-24 rounded-full object-contain bg-white shadow-md border border-gray-100 p-1" 
                        crossOrigin="anonymous"
                    />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                        <span className="text-3xl font-bold text-blue-600">{company.name.charAt(0)}</span>
                    </div>
                )}
             </div>
             
             {/* Company Name */}
             <h2 className="text-xl font-extrabold text-gray-800 mb-2 font-tajawal">{company.name}</h2>
             
             {/* Transaction Type */}
             <h3 className="text-lg font-bold text-blue-600">{getTransactionType(transaction)}</h3>
          </div>

          {/* Dashed Separator */}
          <div className="w-full border-b-2 border-dashed border-gray-200 my-2"></div>

          {/* Body Section */}
          <div className="px-6 py-6 flex flex-col items-center gap-6">
            
            {/* From Amount */}
            <div className="text-center w-full">
                <p className="text-gray-500 font-medium text-sm mb-1">{getFromLabel(transaction)}</p>
                <div className="flex items-center justify-center gap-2" dir="ltr">
                    <span className="text-3xl font-extrabold text-gray-900">{formatAmount(transaction.from_amount)}</span>
                    <span className="text-sm font-bold text-gray-500 uppercase mt-2">{transaction.from_currency}</span>
                </div>
            </div>

            {/* Rate Section (Only for Exchange) */}
            {transaction.type === 'exchange' && transaction.rate && (
                <div className="bg-gray-50 rounded-xl px-8 py-2 w-full text-center">
                     <div className="flex items-center justify-center gap-2">
                        <span className="text-gray-500 font-medium">سعر الصرف:</span>
                        <span className="text-xl font-bold text-gray-900" dir="ltr">{transaction.rate}</span>
                     </div>
                </div>
            )}

            {/* To Amount */}
             {transaction.to_amount && (
                <div className="text-center w-full">
                    <p className="text-gray-500 font-medium text-sm mb-1">{getToLabel(transaction)}</p>
                    <div className="flex items-center justify-center gap-2" dir="ltr">
                        <span className="text-3xl font-extrabold text-blue-600">{formatAmount(transaction.to_amount)}</span>
                        <span className="text-sm font-bold text-blue-400 uppercase mt-2">{transaction.to_currency}</span>
                    </div>
                </div>
            )}
          </div>

          {/* Footer Details */}
          <div className="px-8 pb-8 pt-2">
             <div className="flex justify-between items-end text-sm border-t border-gray-100 pt-6">
                 {/* Right Side */}
                 <div className="text-right space-y-4">
                     <div>
                         <p className="text-gray-400 text-xs mb-1">التاريخ:</p>
                         <p className="font-bold text-gray-600 font-mono" dir="ltr">{new Date(transaction.created_at).toLocaleDateString('en-GB')}</p>
                     </div>
                     <div>
                         <p className="text-gray-400 text-xs mb-1">رقم الإشعار:</p>
                         <p className="font-bold text-gray-600 font-mono" dir="ltr">{transaction.receipt_number || transaction.id}</p>
                     </div>
                 </div>

                 {/* Left Side */}
                 <div className="text-left space-y-4">
                      {/* Empty space to align with date if needed, or put time */}
                      <div></div>
                      <div>
                          <p className="text-gray-400 text-xs mb-1 text-right">الموظف:</p>
                          <p className="font-bold text-gray-600 text-right">{employee?.full_name}</p>
                      </div>
                 </div>
             </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
            <button 
              onClick={onClose}
              className="bg-white text-gray-700 p-4 rounded-xl shadow-lg hover:bg-gray-50 transition-all flex items-center justify-center"
            >
              <X size={24} />
            </button>
            
            <button 
              onClick={handleShareImage} 
              disabled={isSharing}
              className={`flex-1 bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-blue-700 active:scale-95 transition-all ${isSharing ? 'opacity-80' : ''}`}
            >
              {isSharing ? <Loader2 className="animate-spin" /> : <Share2 />}
              <span>مشاركة الإشعار</span>
            </button>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
