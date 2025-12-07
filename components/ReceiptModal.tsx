import React, { useState, useEffect } from 'react';
import { Transaction, Company, User } from '../types';
import { X, Share2, Loader2, CheckCircle2, Printer, Copy, Download, QrCode } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReceiptModalProps {
  transaction: Transaction | null;
  company: Company | undefined;
  employee: User | undefined;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, company, employee, onClose }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    // إغلاق النافذة عند الضغط على زر ESC
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
      // انتظار تحميل الخطوط والاستقرار
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        logging: false,
        allowTaint: true,
        windowWidth: element.scrollWidth + 50,
        windowHeight: element.scrollHeight + 50,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('receipt-content');
          if (clonedElement) {
            // إعادة تعيين الأنماط التي قد تتعارض مع الالتقاط
            clonedElement.style.transform = 'none';
            clonedElement.style.margin = '0';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.borderRadius = '0';
            
            // إجبار تخطيط اللغة العربية وتصحيح الخطوط
            clonedElement.style.fontFamily = "'Tajawal', sans-serif";
            clonedElement.style.direction = 'rtl';
            clonedElement.style.textAlign = 'right';
            clonedElement.style.letterSpacing = 'normal'; // منع تقطع الحروف
            clonedElement.style.fontVariantLigatures = 'normal';
            clonedElement.style.webkitFontSmoothing = 'antialiased';
            
            // التأكد من أن النص المركزي يبقى في المركز
            const headerText = clonedElement.querySelectorAll('.text-center');
            headerText.forEach((el: any) => el.style.textAlign = 'center');
            
            // تحسين عرض الأزرار للصورة
            const buttons = clonedElement.querySelectorAll('button');
            buttons.forEach((btn: any) => btn.style.display = 'none');
          }
        }
      });

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 1.0));

      if (blob) {
        const fileName = `إشعار_${transaction.receipt_number || transaction.id}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'إشعار عملية',
              text: `إشعار عملية - ${company.name} - ${transaction.receipt_number || ''}`,
            });
          } catch (error) {
            console.log('تم إلغاء المشاركة', error);
          }
        } else {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // إظهار تأكيد التنزيل
          alert('تم تحميل صورة الإشعار بنجاح');
        }
      }
    } catch (error) {
      console.error('خطأ في إنشاء الصورة', error);
      alert('حدث خطأ أثناء إنشاء الصورة. حاول مرة أخرى.');
    } finally {
      setIsSharing(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    const element = document.getElementById('receipt-content');
    
    if (!element) {
      setIsPrinting(false);
      return;
    }

    try {
      // إنشاء نافذة طباعة
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('الرجاء السماح بالنوافذ المنبثقة للطباعة');
        setIsPrinting(false);
        return;
      }

      // إعداد محتوى الطباعة
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <title>إشعار عملية - ${company.name}</title>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Tajawal', sans-serif;
              direction: rtl;
              padding: 20px;
              background: white;
              color: #333;
            }
            .receipt { 
              max-width: 400px;
              margin: 0 auto;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .print-header {
              text-align: center;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .print-header h1 { font-size: 24px; margin-bottom: 10px; }
            .print-header h2 { font-size: 18px; opacity: 0.9; }
            .print-footer {
              text-align: center;
              padding: 15px;
              border-top: 2px dashed #e5e7eb;
              margin-top: 20px;
              color: #6b7280;
              font-size: 12px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${element.innerHTML}
          </div>
          <div class="print-footer no-print">
            <p>تم الإنشاء في: ${new Date().toLocaleString('ar-SA')}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();
    } catch (error) {
      console.error('خطأ في الطباعة', error);
      alert('حدث خطأ أثناء الطباعة');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleGeneratePDF = async () => {
    const element = document.getElementById('receipt-content');
    if (!element || isGeneratingPDF) return;

    setIsGeneratingPDF(true);

    try {
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`إشعار_${transaction.receipt_number || transaction.id}.pdf`);
      
      alert('تم تحميل ملف PDF بنجاح');
    } catch (error) {
      console.error('خطأ في إنشاء PDF', error);
      alert('حدث خطأ أثناء إنشاء ملف PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCopyDetails = () => {
    const details = `
إشعار عملية - ${company.name}
رقم الإيصال: ${transaction.receipt_number || transaction.id}
التاريخ: ${new Date(transaction.created_at).toLocaleDateString('ar-SA')}
الوقت: ${new Date(transaction.created_at).toLocaleTimeString('ar-SA')}
نوع المعاملة: ${getTransactionType(transaction)}
المبلغ: ${transaction.from_amount.toLocaleString('ar-SA')} ${transaction.from_currency}
${transaction.to_amount ? `المبلغ المستلم: ${transaction.to_amount.toLocaleString('ar-SA')} ${transaction.to_currency}` : ''}
${transaction.commission && transaction.commission > 0 ? `العمولة: ${transaction.commission.toLocaleString('ar-SA')} EGP` : ''}
الموظف: ${employee?.full_name || 'غير محدد'}
    `.trim();

    navigator.clipboard.writeText(details).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getTransactionType = (t: Transaction) => {
    const types: Record<string, string> = {
      'exchange': 'إشعار صرف عملة',
      'e_wallet': 'تحويل محفظة إلكترونية',
      'wallet_deposit': 'إشعار إيداع محفظة',
      'wallet_withdrawal': 'إشعار سحب محفظة',
      'treasury_feed': 'إيصال استلام نقدية',
      'treasury_withdraw': 'إيصال صرف نقدية',
      'wallet_feed': 'إشعار تغذية محفظة'
    };
    return types[t.type] || 'إشعار عملية مالية';
  };

  const getFromLabel = (t: Transaction) => {
    const labels: Record<string, string> = {
      'exchange': 'المبلغ المستلم',
      'wallet_deposit': 'المبلغ المستلم',
      'wallet_withdrawal': 'المسحوب من المحفظة',
      'treasury_feed': 'المبلغ المودع',
      'treasury_withdraw': 'المبلغ المسحوب',
      'wallet_feed': 'قيمة التغذية'
    };
    return labels[t.type] || 'المبلغ';
  };

  const getToLabel = (t: Transaction) => {
    const labels: Record<string, string> = {
      'exchange': 'المبلغ المسلم',
      'wallet_deposit': 'المودع في المحفظة',
      'wallet_withdrawal': 'المضاف للعهدة'
    };
    return labels[t.type] || 'المبلغ المستلم';
  };

  const formatAmount = (amount: number) => {
    if (transaction.type === 'exchange') {
      return amount.toLocaleString('ar-SA', { maximumFractionDigits: 0 });
    }
    return amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto">
      <div className="w-full max-w-md my-auto animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Printable Area */}
        <div id="receipt-content" className="bg-white rounded-3xl shadow-2xl overflow-hidden relative border-2 border-gray-100" dir="rtl">
          
          {/* Decorative Header */}
          <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600">
            <div className="absolute inset-0 bg-black/5"></div>
            <div className="p-1"></div>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-b from-slate-50 to-white p-6 pt-8 pb-6 flex flex-col items-center justify-center text-center">
            <div className="flex flex-col items-center justify-center gap-3 w-full mb-4">
              {company.logo ? (
                <div className="relative">
                  <img 
                    src={company.logo} 
                    alt={`شعار ${company.name}`}
                    className="h-24 w-24 object-contain rounded-2xl bg-white shadow-lg border-2 border-white p-2" 
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden h-24 w-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg border-2 border-white">
                    {company.name.charAt(0)}
                  </div>
                </div>
              ) : (
                <div className="h-24 w-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg border-2 border-white">
                  {company.name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                  {company.name}
                </h2>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-white px-5 py-2 rounded-full border border-gray-200 shadow-sm">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-600">
                إشعار معاملة رسمية
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 pt-2 bg-white relative">
            
            {/* Transaction Title & Meta */}
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-1.5 rounded-full mb-3">
                <h3 className="text-lg font-bold text-blue-700">{getTransactionType(transaction)}</h3>
              </div>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 text-sm text-gray-500 bg-gray-50/80 py-2.5 px-4 rounded-xl mx-auto w-fit backdrop-blur-sm">
                <div className="flex items-center gap-1">
                  <span className="font-medium">التاريخ:</span>
                  <span className="font-bold text-gray-700">{formatDate(transaction.created_at)}</span>
                </div>
                <div className="hidden sm:block text-gray-300">|</div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">الوقت:</span>
                  <span className="font-bold text-gray-700">{formatTime(transaction.created_at)}</span>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-mono">
                  الرقم المرجعي: #{transaction.receipt_number || transaction.id}
                </span>
              </div>
            </div>

            {/* Main Details Card */}
            <div className="space-y-4">
              {/* From Amount Card */}
              <div className="relative p-4 bg-gradient-to-l from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="absolute top-3 right-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-bold">→</span>
                  </div>
                </div>
                <div className="pr-12">
                  <span className="text-slate-500 text-sm font-medium block mb-1">
                    {getFromLabel(transaction)}
                  </span>
                  <span className="font-bold text-slate-900 text-xl tracking-tight" dir="ltr">
                    {formatAmount(transaction.from_amount)} 
                    <span className="text-base font-normal text-slate-500 mr-1">{transaction.from_currency}</span>
                  </span>
                </div>
              </div>

              {/* Rate (If Exchange) */}
              {transaction.type === 'exchange' && transaction.rate && (
                <div className="flex justify-between items-center px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-100">
                  <span className="text-amber-700 text-sm font-medium">سعر الصرف</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-800 text-lg font-mono bg-white px-3 py-1 rounded-lg shadow-inner">
                      {transaction.rate}
                    </span>
                    <span className="text-xs text-amber-600">نقطة</span>
                  </div>
                </div>
              )}

              {/* To Amount (Highlighted) */}
              {transaction.to_amount && (
                <div className="relative p-5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl shadow-blue-200/50 text-white mt-3 overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCircle2 size={60}/>
                  </div>
                  <div className="absolute bottom-0 left-0 p-4 opacity-5">
                    <CheckCircle2 size={80}/>
                  </div>
                  <div className="relative z-10">
                    <span className="text-blue-100 font-medium text-sm block mb-2">
                      {getToLabel(transaction)}
                    </span>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-3xl tracking-tight" dir="ltr">
                        {formatAmount(transaction.to_amount)}
                      </span>
                      <span className="text-xl font-normal opacity-90 bg-white/20 px-3 py-1 rounded-full">
                        {transaction.to_currency}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Commission Details */}
              {transaction.commission && transaction.commission > 0 && (
                <div className="flex justify-between items-center px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-bold">%</span>
                    </div>
                    <span className="text-gray-500 text-sm">العمولة والرسوم</span>
                  </div>
                  <span className="font-bold text-gray-700 text-lg">
                    {transaction.commission.toLocaleString('ar-SA')} 
                    <span className="text-sm font-normal text-gray-500 mr-1">EGP</span>
                  </span>
                </div>
              )}
            </div>

            {/* Footer Information */}
            <div className="pt-8 mt-8 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 text-sm">👤</span>
                    </div>
                    <span className="text-gray-500 text-xs">الموظف المسؤول</span>
                  </div>
                  <span className="font-bold text-gray-800 text-sm">{employee?.full_name || 'غير محدد'}</span>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                      <QrCode size={16} className="text-green-600" />
                    </div>
                    <span className="text-gray-500 text-xs">رمز التحقق</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-gray-800 text-sm font-bold tracking-wider">
                      {transaction.id.slice(-8).toUpperCase()}
                    </span>
                    <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center">
                      <div className="grid grid-cols-3 gap-0.5">
                        {[...Array(9)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-1.5 h-1.5 ${i % 3 === 0 ? 'bg-gray-600' : 'bg-gray-400'} rounded-sm`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <div className="text-xs text-gray-400 font-light leading-relaxed">
                  هذا إشعار إلكتروني معتمد وله قوة الإثبات القانونية
                  <br />
                  يحق للعميل الاحتفاظ به كمرجع لأي استفسار لاحق
                </div>
                <div className="text-[10px] text-gray-300">
                  تم الإنشاء بواسطة نظام {company.name} • {new Date().toLocaleDateString('ar-SA')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <div className="mt-8 space-y-4">
          {/* Primary Actions */}
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="bg-white text-gray-700 p-4 rounded-2xl shadow-xl hover:bg-gray-50 transition-all duration-200 active:scale-95 flex items-center justify-center"
              title="إغلاق"
            >
              <X size={24} />
            </button>
            
            <button 
              onClick={handleShareImage} 
              disabled={isSharing}
              className={`flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl transition-all duration-200 ${isSharing ? 'opacity-75 cursor-wait' : 'hover:from-blue-700 hover:to-blue-800 active:scale-95'}`}
            >
              {isSharing ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <Share2 size={22} />
                  <span>مشاركة الإشعار</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={handlePrint}
              disabled={isPrinting}
              className="bg-white text-gray-700 p-3 rounded-xl shadow-lg hover:bg-gray-50 transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-2"
              title="طباعة"
            >
              {isPrinting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Printer size={20} />
              )}
              <span className="text-xs font-medium">طباعة</span>
            </button>
            
            <button 
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="bg-white text-gray-700 p-3 rounded-xl shadow-lg hover:bg-gray-50 transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-2"
              title="تحميل PDF"
            >
              {isGeneratingPDF ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Download size={20} />
              )}
              <span className="text-xs font-medium">PDF</span>
            </button>
            
            <button 
              onClick={handleCopyDetails}
              className={`p-3 rounded-xl shadow-lg transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-2 ${
                copied 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="نسخ التفاصيل"
            >
              {copied ? (
                <CheckCircle2 size={20} />
              ) : (
                <Copy size={20} />
              )}
              <span className="text-xs font-medium">
                {copied ? 'تم النسخ' : 'نسخ'}
              </span>
            </button>
          </div>
          
          {/* Help Text */}
          <div className="text-center text-xs text-gray-400 pt-2">
            يمكنك مشاركة الإشعار كصورة أو طباعته أو حفظه كملف PDF
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
