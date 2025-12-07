
import React, { useState } from 'react';
import { Transaction, Company, User } from '../types';
import { X, Share2, Loader2, CheckCircle2 } from 'lucide-react';
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
      // Wait for UI to stabilize and fonts to load
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 3, // Increased scale for sharper text
        useCORS: true,
        logging: false,
        allowTaint: true,
        // Ensure the full height/width is captured
        windowWidth: element.scrollWidth + 50,
        windowHeight: element.scrollHeight + 50,
        onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById('receipt-content');
            if (clonedElement) {
                // Reset styles that might interfere with capture
                clonedElement.style.transform = 'none';
                clonedElement.style.margin = '0';
                clonedElement.style.boxShadow = 'none'; 
                
                // Force Layout & Typography for Arabic
                clonedElement.style.fontFamily = "'Tajawal', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
                clonedElement.style.direction = 'rtl';
                clonedElement.style.textAlign = 'right';
                clonedElement.style.textRendering = 'optimizeLegibility';
                clonedElement.style.fontVariantLigatures = 'normal';
                
                // Ensure header text is centered in the clone
                const headerText = clonedElement.querySelectorAll('.text-center');
                headerText.forEach((el: any) => el.style.textAlign = 'center');
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
              text: `إشعار عملية - ${company.name} - ${transaction.receipt_number || ''}`,
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
    if (t.type === 'exchange') return 'إشعار صرف عملة';
    if (t.type === 'e_wallet') return 'تحويل محفظة إلكترونية';
    if (t.type === 'wallet_deposit') return 'إشعار إيداع محفظة';
    if (t.type === 'wallet_withdrawal') return 'إشعار سحب محفظة';
    if (t.type === 'treasury_feed') return 'إيصال استلام نقدية';
    if (t.type === 'treasury_withdraw') return 'إيصال صرف نقدية';
    if (t.type === 'wallet_feed') return 'إشعار تغذية محفظة';
    return 'إشعار عملية مالية';
  };

  const getFromLabel = (t: Transaction) => {
      switch (t.type) {
          case 'exchange': return 'المبلغ المستلم';
          case 'wallet_deposit': return 'المبلغ المستلم';
          case 'wallet_withdrawal': return 'المسحوب من المحفظة';
          case 'treasury_feed': return 'المبلغ المودع';
          case 'treasury_withdraw': return 'المبلغ المسحوب';
          case 'wallet_feed': return 'قيمة التغذية';
          default: return 'المبلغ';
      }
  };

  const getToLabel = (t: Transaction) => {
      switch (t.type) {
          case 'exchange': return 'المبلغ المسلم';
          case 'wallet_deposit': return 'المودع في المحفظة';
          case 'wallet_withdrawal': return 'المضاف للعهدة';
          default: return 'المبلغ المستلم';
      }
  };

  const formatAmount = (amount: number) => {
    if (transaction.type === 'exchange') {
      return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-md my-auto">
        
        {/* Printable Area */}
        <div id="receipt-content" className="bg-white rounded-3xl shadow-2xl overflow-hidden relative border border-gray-100" dir="rtl">
          
          {/* Decorative Pattern */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>

          {/* Header */}
          <div className="bg-slate-50 p-6 pt-8 pb-4 flex flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center justify-center gap-3 w-full mb-2">
                {company.logo ? (
                  <img 
                    src={company.logo} 
                    alt="Logo" 
                    className="h-20 w-20 object-contain rounded-xl bg-white shadow-sm border border-gray-100 p-1" 
                    crossOrigin="anonymous" 
                  />
                ) : (
                  <div className="h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                     {company.name.charAt(0)}
                  </div>
                )}
                <h2 className="text-xl font-bold text-slate-800 tracking-tight mt-1">
                  {company.name}
                </h2>
            </div>
            <div className="inline-block bg-white px-4 py-1 rounded-full border border-gray-200 text-xs text-gray-500 font-medium">
                إشعار معاملة رسمية
            </div>
          </div>

          {/* Content */}
          <div className="p-6 pt-2 bg-white relative">
            
            {/* Transaction Title & Meta */}
            <div className="text-center mb-6">
               <h3 className="text-lg font-bold text-blue-700 mb-2">{getTransactionType(transaction)}</h3>
               <div className="flex justify-center items-center gap-2 text-xs text-gray-400 font-mono bg-gray-50 py-1.5 px-3 rounded-lg mx-auto w-fit">
                 <span>{new Date(transaction.created_at).toLocaleDateString('en-US')}</span>
                 <span>|</span>
                 <span>{new Date(transaction.created_at).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                 <span>|</span>
                 <span>#{transaction.receipt_number || transaction.id}</span>
               </div>
            </div>

            {/* Main Details Card */}
            <div className="space-y-3">
              {/* Row 1: From Amount */}
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-500 text-sm font-medium">
                    {getFromLabel(transaction)}
                </span>
                <span className="font-bold text-slate-900 text-lg tracking-tight" dir="ltr">
                  {formatAmount(transaction.from_amount)} <span className="text-sm font-normal text-slate-500">{transaction.from_currency}</span>
                </span>
              </div>

              {/* Rate (If Exchange) */}
              {transaction.type === 'exchange' && transaction.rate && (
                <div className="flex justify-between items-center px-3 py-1 text-sm">
                  <span className="text-gray-400">سعر الصرف</span>
                  <span className="font-bold text-gray-700 font-mono bg-gray-50 px-2 py-0.5 rounded">{transaction.rate}</span>
                </div>
              )}

              {/* Row 2: To Amount (Highlighted) */}
              {transaction.to_amount && (
                <div className="flex justify-between items-center p-4 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 text-white mt-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 size={40}/></div>
                  <span className="text-blue-100 font-medium text-sm relative z-10">
                    {getToLabel(transaction)}
                  </span>
                  <span className="font-bold text-2xl tracking-tight relative z-10" dir="ltr">
                    {formatAmount(transaction.to_amount)} <span className="text-base font-normal opacity-80">{transaction.to_currency}</span>
                  </span>
                </div>
              )}

              {/* Commission Details */}
              {transaction.commission && transaction.commission > 0 && (
                 <div className="flex justify-between items-center px-3 pt-2 text-xs">
                  <span className="text-gray-400">شامل العمولة والخدمة</span>
                  <span className="font-bold text-slate-600">{transaction.commission.toLocaleString()} EGP</span>
                </div>
              )}
            </div>

            {/* Footer Information */}
            <div className="pt-6 mt-6 border-t border-gray-100 border-dashed">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1">الموظف: <span className="font-bold text-gray-700">{employee?.full_name}</span></span>
                {/* QR Code Placeholder Style */}
                <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                    <div className="grid grid-cols-2 gap-0.5">
                        <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-sm"></div>
                    </div>
                </div>
              </div>
              
              <div className="text-center text-[10px] text-gray-400 font-light">
                 تم إصدار هذا الإشعار إلكترونياً
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
