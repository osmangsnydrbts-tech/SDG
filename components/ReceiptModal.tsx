import React, { useState, useEffect } from 'react';
import { Transaction, Company, User } from '../types';
import { X, Share2, Loader2, CheckCircle2, Copy, QrCode, Download, Printer } from 'lucide-react';
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
  const [isPrinting, setIsPrinting] = useState(false);

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
      // الانتظار حتى يتم تحميل الخطوط بالكامل
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 3, // دقة عالية جداً للطباعة
        useCORS: true,
        logging: false,
        allowTaint: true,
        removeContainer: true,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('receipt-content');
          if (clonedElement) {
            // 1. إزالة الأنماط التي قد تؤثر على لقطة الشاشة
            clonedElement.style.transform = 'none';
            clonedElement.style.margin = '0';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.borderRadius = '0';
            clonedElement.style.maxWidth = '100%';
            clonedElement.style.width = '100%';
            
            // 2. تعيين النص العربي بشكل صحيح
            clonedElement.style.direction = 'rtl';
            clonedElement.style.textAlign = 'right';
            
            // 3. حل مشاكل التباعد في الحروف العربية
            clonedElement.style.letterSpacing = '0px';
            clonedElement.style.wordSpacing = 'normal';
            clonedElement.style.fontVariantLigatures = 'normal';
            clonedElement.style.fontFeatureSettings = '"liga" 1, "calt" 1';
            clonedElement.style.fontFamily = "'Tajawal', 'Arial', sans-serif";
            
            // 4. تطبيق التصحيحات على جميع العناصر
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el: any) => {
              if (el.style) {
                el.style.fontFamily = "'Tajawal', 'Arial', sans-serif";
                el.style.letterSpacing = '0px';
                el.style.wordSpacing = 'normal';
                el.style.fontVariantLigatures = 'normal';
              }
            });

            // 5. الحفاظ على LTR للأرقام والعملات
            const ltrElements = clonedElement.querySelectorAll('[dir="ltr"]');
            ltrElements.forEach((el: any) => {
              el.style.direction = 'ltr';
              el.style.textAlign = 'left';
              el.style.fontFamily = "'Roboto', 'Arial', sans-serif";
            });

            // 6. إخفاء عناصر التفاعل
            const buttons = clonedElement.querySelectorAll('button');
            buttons.forEach((btn: any) => {
              btn.style.display = 'none';
              btn.style.visibility = 'hidden';
            });

            // 7. إزالة الظلال والتأثيرات للطباعة
            const shadowElements = clonedElement.querySelectorAll('[class*="shadow"]');
            shadowElements.forEach((el: any) => {
              el.style.boxShadow = 'none';
            });

            // 8. التأكد من ظهور جميع النصوص
            clonedElement.style.opacity = '1';
            clonedElement.style.visibility = 'visible';
          }
        }
      });

      // خيارات مشاركة متعددة
      const blob = await new Promise<Blob | null>(resolve => 
        canvas.toBlob(resolve, 'image/png', 1.0)
      );

      if (blob) {
        const fileName = `إشعار_${transaction.receipt_number || transaction.id}_${new Date().toISOString().slice(0,10)}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        
        // محاولة المشاركة عبر Web Share API
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `إشعار معاملة - ${company.name}`,
              text: `إشعار معاملة رقم: ${transaction.receipt_number || transaction.id}`,
            });
          } catch (error) {
            console.log('تم إلغاء المشاركة', error);
            // إذا فشلت المشاركة، نقوم بالتحميل
            downloadImage(blob, fileName);
          }
        } else {
          // تحميل مباشر
          downloadImage(blob, fileName);
        }
      }
    } catch (error) {
      console.error('خطأ في إنشاء صورة الإشعار', error);
      alert('حدث خطأ أثناء حفظ الإشعار. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSharing(false);
    }
  };

  const downloadImage = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    const printContent = document.getElementById('receipt-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>طباعة الإشعار - ${company.name}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
              @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap');
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Tajawal', sans-serif;
              }
              
              body {
                background: white;
                color: #333;
                line-height: 1.6;
                padding: 20px;
                direction: rtl;
                text-align: right;
              }
              
              .print-container {
                max-width: 800px;
                margin: 0 auto;
                padding: 30px;
                border: 2px solid #f0f0f0;
                border-radius: 20px;
                background: white;
              }
              
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px dashed #e0e0e0;
              }
              
              .logo {
                max-width: 150px;
                height: auto;
                margin: 0 auto 15px;
              }
              
              .company-name {
                font-size: 28px;
                font-weight: 700;
                color: #1e3a8a;
                margin-bottom: 5px;
              }
              
              .receipt-title {
                font-size: 22px;
                font-weight: 600;
                color: #374151;
                background: #f3f4f6;
                padding: 10px 20px;
                border-radius: 10px;
                display: inline-block;
                margin: 15px 0;
              }
              
              .amount-card {
                background: linear-gradient(135deg, #1e3a8a, #3730a3);
                color: white;
                padding: 25px;
                border-radius: 15px;
                margin: 25px 0;
              }
              
              .amount-number {
                font-size: 36px;
                font-weight: 700;
                font-family: 'Roboto', sans-serif;
                direction: ltr;
                text-align: left;
              }
              
              .details-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin: 30px 0;
              }
              
              .detail-item {
                background: #f9fafb;
                padding: 15px;
                border-radius: 10px;
                border: 1px solid #e5e7eb;
              }
              
              .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px dashed #e0e0e0;
                color: #6b7280;
                font-size: 14px;
              }
              
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
                .print-container { 
                  border: none;
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${printContent.innerHTML}
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 1000);
              }
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
    setTimeout(() => setIsPrinting(false), 1000);
  };

  const handleCopyDetails = () => {
    const details = `
إشعار معاملة - ${company.name}
━━━━━━━━━━━━━━━━━━━━━━━
📋 رقم الإيصال: ${transaction.receipt_number || transaction.id}
📅 التاريخ: ${new Date(transaction.created_at).toLocaleDateString('ar-SA')}
⏰ الوقت: ${new Date(transaction.created_at).toLocaleTimeString('ar-SA')}
🏷️ نوع المعاملة: ${getTransactionType(transaction)}
━━━━━━━━━━━━━━━━━━━━━━━
💰 المبلغ: ${transaction.from_amount.toLocaleString('ar-SA')} ${transaction.from_currency}
${transaction.to_amount ? `💸 المبلغ المستلم: ${transaction.to_amount.toLocaleString('ar-SA')} ${transaction.to_currency}` : ''}
${transaction.commission && transaction.commission > 0 ? `💼 العمولة: ${transaction.commission.toLocaleString('ar-SA')} EGP` : ''}
━━━━━━━━━━━━━━━━━━━━━━━
👤 الموظف: ${employee?.full_name || 'غير محدد'}
🔗 الرقم المرجعي: ${transaction.id}
━━━━━━━━━━━━━━━━━━━━━━━
📝 ملاحظة: هذا إشعار إلكتروني معتمد
    `.trim();

    navigator.clipboard.writeText(details).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const getTransactionType = (t: Transaction) => {
    const types: Record<string, string> = {
      'exchange': '💱 صرف عملة',
      'e_wallet': '📱 محفظة إلكترونية',
      'wallet_deposit': '💰 إيداع محفظة',
      'wallet_withdrawal': '💳 سحب محفظة',
      'treasury_feed': '🏦 إيداع نقدي',
      'treasury_withdraw': '💵 سحب نقدي',
      'wallet_feed': '🔋 تغذية محفظة'
    };
    return types[t.type] || '📄 معاملة مالية';
  };

  const getFromLabel = (t: Transaction) => {
    const labels: Record<string, string> = {
      'exchange': 'المبلغ المدفوع',
      'wallet_deposit': 'المبلغ المودع',
      'wallet_withdrawal': 'المبلغ المسحوب',
      'treasury_feed': 'المبلغ المودع',
      'treasury_withdraw': 'المبلغ المسحوب',
      'wallet_feed': 'قيمة التغذية'
    };
    return labels[t.type] || 'المبلغ';
  };

  const getToLabel = (t: Transaction) => {
    const labels: Record<string, string> = {
      'exchange': 'المبلغ المستلم',
      'wallet_deposit': 'رصيد المحفظة',
      'wallet_withdrawal': 'الصافي المستلم'
    };
    return labels[t.type] || 'المبلغ النهائي';
  };

  const formatAmount = (amount: number) => {
    if (transaction.type === 'exchange') {
      return amount.toLocaleString('ar-SA', { maximumFractionDigits: 0 });
    }
    return amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = () => {
    return transaction.status === 'completed' ? 'bg-green-500' :
           transaction.status === 'pending' ? 'bg-yellow-500' :
           transaction.status === 'failed' ? 'bg-red-500' : 'bg-blue-500';
  };

  const getStatusText = () => {
    return transaction.status === 'completed' ? 'مكتملة' :
           transaction.status === 'pending' ? 'قيد المعالجة' :
           transaction.status === 'failed' ? 'ملغاة' : 'غير معروف';
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 md:p-4 overflow-y-auto animate-in fade-in duration-300">
      <div className="w-full max-w-lg mx-auto my-auto animate-in slide-in-from-bottom-10 duration-300">
        
        {/* الإشعار الرئيسي */}
        <div id="receipt-content" className="bg-white rounded-3xl shadow-2xl overflow-hidden relative border-4 border-white" dir="rtl">
          
          {/* الخلفية المزخرفة */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-60"></div>
          
          {/* الشريط العلوي */}
          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 py-1">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <div className="h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400"></div>
          </div>

          {/* الهيدر */}
          <div className="relative p-6 md:p-8 pt-10 pb-6 flex flex-col items-center justify-center text-center border-b border-gray-100">
            {/* الشعار */}
            <div className="relative mb-6">
              {company.logo ? (
                <div className="relative group">
                  <img 
                    src={company.logo} 
                    alt={`شعار ${company.name}`}
                    className="h-32 w-32 object-contain rounded-3xl bg-gradient-to-br from-white to-gray-50 shadow-2xl border-4 border-white p-3 transform group-hover:scale-105 transition-transform duration-300"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden h-32 w-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center text-white font-bold text-4xl shadow-2xl border-4 border-white">
                    {company.name.charAt(0)}
                  </div>
                </div>
              ) : (
                <div className="h-32 w-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center text-white font-bold text-4xl shadow-2xl border-4 border-white">
                  {company.name.charAt(0)}
                </div>
              )}
              
              {/* حالة المعاملة */}
              <div className={`absolute -bottom-2 -right-2 ${getStatusColor()} text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg`}>
                {getStatusText()}
              </div>
            </div>

            {/* اسم الشركة */}
            <div className="mb-4">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                {company.name}
              </h1>
              {company.slogan && (
                <p className="text-gray-600 text-sm font-medium bg-gray-50 px-4 py-2 rounded-full inline-block">
                  {company.slogan}
                </p>
              )}
            </div>

            {/* نوع الإشعار */}
            <div className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full border border-gray-200 shadow-lg mb-2">
              <div className={`h-3 w-3 ${getStatusColor()} rounded-full animate-pulse`}></div>
              <span className="text-lg font-bold text-gray-800">
                {getTransactionType(transaction)}
              </span>
            </div>
          </div>

          {/* المحتوى الرئيسي */}
          <div className="p-6 md:p-8 bg-white relative">
            
            {/* معلومات التاريخ والرقم */}
            <div className="text-center mb-10">
              <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-6">
                <div className="bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100 min-w-[180px]">
                  <div className="text-blue-600 text-sm font-semibold mb-1">📅 التاريخ</div>
                  <div className="text-gray-900 font-bold text-lg">{formatDate(transaction.created_at)}</div>
                </div>
                
                <div className="bg-purple-50 px-5 py-3 rounded-2xl border border-purple-100 min-w-[180px]">
                  <div className="text-purple-600 text-sm font-semibold mb-1">⏰ الوقت</div>
                  <div className="text-gray-900 font-bold text-lg">{formatTime(transaction.created_at)}</div>
                </div>
              </div>
              
              <div className="inline-block bg-gray-900 text-white px-6 py-3 rounded-xl font-mono text-sm tracking-wider">
                الرقم المرجعي: #{transaction.receipt_number || transaction.id}
              </div>
            </div>

            {/* المبالغ */}
            <div className="space-y-6 mb-10">
              {/* المبلغ الأصلي */}
              <div className="relative p-6 bg-gradient-to-l from-gray-50 to-white rounded-3xl border-2 border-gray-100 shadow-lg">
                <div className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow-lg">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-xl font-bold">←</span>
                  </div>
                </div>
                <div className="pr-16">
                  <div className="text-gray-600 text-base font-medium mb-2">
                    {getFromLabel(transaction)}
                  </div>
                  <div className="font-black text-gray-900 text-3xl tracking-tight" dir="ltr">
                    {formatAmount(transaction.from_amount)} 
                    <span className="text-xl font-normal text-gray-500 mr-2">{transaction.from_currency}</span>
                  </div>
                </div>
              </div>

              {/* سعر الصرف (إن وجد) */}
              {transaction.type === 'exchange' && transaction.rate && (
                <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border-2 border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-amber-600 text-lg font-bold">⇄</span>
                    </div>
                    <span className="text-amber-700 font-semibold">سعر الصرف</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-amber-900 text-2xl font-mono bg-white px-4 py-2 rounded-xl shadow-inner">
                      {transaction.rate}
                    </span>
                    <span className="text-sm text-amber-600">نقطة</span>
                  </div>
                </div>
              )}

              {/* المبلغ النهائي */}
              {transaction.to_amount && (
                <div className="relative p-7 bg-gradient-to-r from-emerald-500 to-green-600 rounded-3xl shadow-2xl text-white overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-20">
                    <CheckCircle2 size={80}/>
                  </div>
                  <div className="absolute bottom-0 left-0 p-6 opacity-10">
                    <CheckCircle2 size={100}/>
                  </div>
                  <div className="relative z-10">
                    <div className="text-emerald-100 font-semibold text-lg mb-3">
                      {getToLabel(transaction)}
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="font-black text-5xl tracking-tight" dir="ltr">
                        {formatAmount(transaction.to_amount)}
                      </div>
                      <div className="text-2xl font-semibold bg-white/20 px-6 py-3 rounded-full backdrop-blur-sm">
                        {transaction.to_currency}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* العمولة */}
              {transaction.commission && transaction.commission > 0 && (
                <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl border-2 border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-600 text-xl font-bold">%</span>
                    </div>
                    <div>
                      <div className="text-gray-600 font-semibold">العمولة</div>
                      <div className="text-gray-500 text-sm">+ الرسوم الإدارية</div>
                    </div>
                  </div>
                  <div className="font-black text-gray-900 text-2xl" dir="ltr">
                    {transaction.commission.toLocaleString('ar-SA')} 
                    <span className="text-lg font-normal text-gray-500 mr-1">EGP</span>
                  </div>
                </div>
              )}
            </div>

            {/* المعلومات الإضافية */}
            <div className="pt-8 mt-8 border-t-2 border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* الموظف */}
                <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-2xl border-2 border-blue-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                      <span className="text-blue-600 text-xl">👤</span>
                    </div>
                    <div>
                      <div className="text-blue-600 text-sm font-semibold">الموظف المسؤول</div>
                      <div className="font-bold text-gray-900 text-lg">{employee?.full_name || 'غير محدد'}</div>
                    </div>
                  </div>
                  {employee?.email && (
                    <div className="text-gray-600 text-sm bg-white px-3 py-2 rounded-lg border border-gray-200">
                      📧 {employee.email}
                    </div>
                  )}
                </div>
                
                {/* رمز التحقق */}
                <div className="bg-gradient-to-br from-green-50 to-white p-5 rounded-2xl border-2 border-green-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                      <QrCode size={24} className="text-green-600" />
                    </div>
                    <div>
                      <div className="text-green-600 text-sm font-semibold">رمز التحقق</div>
                      <div className="font-bold text-gray-900 text-lg">مشفر رقمياً</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-gray-800 text-base font-black tracking-wider bg-white px-4 py-2 rounded-lg border border-gray-300">
                      {String(transaction.id).slice(-8).match(/.{1,4}/g)?.join('-')}
                    </div>
                    <div className="h-14 w-14 bg-gray-50 rounded-xl border-2 border-gray-200 flex items-center justify-center">
                      <div className="grid grid-cols-3 gap-1">
                        {[...Array(9)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-2 h-2 ${i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-500'} rounded-full`}
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* النص التذييلي */}
              <div className="text-center space-y-4">
                <div className="text-sm text-gray-500 font-light leading-relaxed bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div className="font-semibold text-gray-700 mb-2">📌 ملاحظات هامة:</div>
                  <div className="space-y-1">
                    <div>• هذا الإشعار إلكتروني معتمد وله قوة الإثبات القانونية</div>
                    <div>• يحق للعميل الاحتفاظ به كمرجع لأي استفسار لاحق</div>
                    <div>• الرجاء التأكد من صحة البيانات قبل الختم</div>
                    <div>• للمساعدة: {company.contact_email || 'info@company.com'}</div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 pt-2">
                  <div>تم الإنشاء آلياً بواسطة نظام {company.name}</div>
                  <div className="text-gray-300 mt-1">
                    {new Date().toLocaleDateString('ar-SA', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* الختم السفلي */}
          <div className="bg-gradient-to-r from-gray-50 to-white py-4 px-8 border-t border-gray-100">
            <div className="flex justify-between items-center text-gray-500 text-sm">
              <span>صفحة 1 من 1</span>
              <span>إصدار: 2.0</span>
            </div>
          </div>
        </div>

        {/* لوحة التحكم */}
        <div className="mt-8 space-y-4">
          {/* الإجراءات الرئيسية */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button 
              onClick={onClose}
              className="bg-white text-gray-700 p-4 rounded-2xl shadow-xl hover:bg-gray-50 transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-2"
              title="إغلاق"
            >
              <X size={24} />
              <span className="text-xs font-medium">إغلاق</span>
            </button>
            
            <button 
              onClick={handleShareImage} 
              disabled={isSharing}
              className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-2xl shadow-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                isSharing ? 'opacity-75 cursor-wait' : 'hover:from-blue-700 hover:to-blue-800 active:scale-95'
              }`}
            >
              {isSharing ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs font-medium">جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <Share2 size={24} />
                  <span className="text-xs font-medium">مشاركة</span>
                </>
              )}
            </button>
            
            <button 
              onClick={handlePrint}
              disabled={isPrinting}
              className={`bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 rounded-2xl shadow-xl transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
                isPrinting ? 'opacity-75 cursor-wait' : 'hover:from-purple-700 hover:to-purple-800 active:scale-95'
              }`}
            >
              {isPrinting ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs font-medium">جاري الطباعة...</span>
                </>
              ) : (
                <>
                  <Printer size={24} />
                  <span className="text-xs font-medium">طباعة</span>
                </>
              )}
            </button>
            
            <button 
              onClick={handleCopyDetails}
              className={`p-4 rounded-2xl shadow-xl transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-2 ${
                copied 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="نسخ التفاصيل"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={24} />
                  <span className="text-xs font-medium">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy size={24} />
                  <span className="text-xs font-medium">نسخ النص</span>
                </>
              )}
            </button>
          </div>

          {/* التعليمات */}
          <div className="text-center space-y-2">
            <div className="text-xs text-gray-400">
              يمكنك مشاركة الإشعار كصورة، طباعته، أو نسخ النص
            </div>
            <div className="text-[10px] text-gray-300">
              تم التصميم للعمل على جميع الأجهزة • دعم كامل للغة العربية
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReceiptModal;
