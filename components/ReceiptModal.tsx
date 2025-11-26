
import React from 'react';
import { Transaction, Company, User } from '../types';
import { X, Printer, Share2, MessageCircle } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  company: Company | undefined;
  employee: User | undefined;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, company, employee, onClose }) => {
  if (!transaction || !company) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = `
*إشعار عملية - ${company.name}*
------------------------
*رقم الإشعار:* ${transaction.receipt_number || transaction.id}
*التاريخ:* ${new Date(transaction.created_at).toLocaleDateString('ar-EG')}
------------------------
*نوع العملية:* ${getTransactionType(transaction)}
*المبلغ:* ${transaction.from_amount.toLocaleString()} ${transaction.from_currency}
${transaction.to_amount ? `*المبلغ المستلم:* ${transaction.to_amount.toLocaleString()} ${transaction.to_currency}` : ''}
------------------------
*الموظف:* ${employee?.full_name || 'System'}
    `.trim();

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getTransactionType = (t: Transaction) => {
    if (t.type === 'exchange') return `صرف (${t.from_currency} -> ${t.to_currency})`;
    if (t.type === 'e_wallet') return 'تحويل محفظة إلكترونية';
    if (t.type === 'treasury_feed') return 'إيداع خزينة';
    if (t.type === 'treasury_withdraw') return 'سحب خزينة';
    return 'عملية أخرى';
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 print:p-0 print:bg-white print:absolute print:inset-0">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative print:shadow-none print:w-full print:max-w-none">
        
        {/* Header / Logo */}
        <div className="bg-gray-50 p-6 text-center border-b border-gray-100 print:border-gray-300">
          <button onClick={onClose} className="absolute left-4 top-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300 print:hidden">
            <X size={20} />
          </button>
          
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
        </div>

        {/* Footer Actions (Hidden in Print) */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 print:hidden">
          <button 
            onClick={handlePrint} 
            className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-900 transition"
          >
            <Printer size={18} /> طباعة
          </button>
          
          <button 
            onClick={handleWhatsAppShare} 
            className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition"
          >
            <MessageCircle size={18} /> مشاركة
          </button>
        </div>

        {/* Print Footer */}
        <div className="hidden print:block text-center text-xs text-gray-400 p-4 border-t mt-8">
          تم إصدار هذا الإشعار إلكترونياً من نظام الصرفة
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
