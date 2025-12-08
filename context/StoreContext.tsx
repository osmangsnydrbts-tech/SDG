
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Company, Treasury, ExchangeRate, Transaction, 
  Merchant, MerchantEntry, EWallet
} from '../types';
import { supabase } from '../src/lib/supabase';
import { ToastType } from '../components/Toast';

interface StoreData {
  currentUser: User | null;
  companies: Company[];
  users: User[];
  treasuries: Treasury[];
  exchangeRates: ExchangeRate[];
  transactions: Transaction[];
  merchants: Merchant[];
  merchantEntries: MerchantEntry[];
  eWallets: EWallet[];
  
  // Toast State
  toast: { message: string; type: ToastType } | null;
  showToast: (message: string, type: ToastType) => void;
  hideToast: () => void;

  // Actions
  login: (username: string, password: string) => Promise<{ success: boolean; role?: string }>;
  logout: () => void;
  addCompany: (name: string, username: string, password: string, days: number, logo?: string) => Promise<{ success: boolean; message: string }>;
  updateCompany: (id: number, data: Partial<Company> & { password?: string }) => Promise<{ success: boolean; message: string }>;
  renewSubscription: (companyId: number, days: number) => Promise<void>;
  deleteCompany: (companyId: number) => Promise<void>;
  toggleCompanyStatus: (companyId: number) => Promise<void>; 
  updateExchangeRate: (companyId: number, rates: Partial<ExchangeRate>) => Promise<void>;
  addEmployee: (companyId: number, fullName: string, username: string, pass: string, phone: string) => Promise<{ success: boolean; message: string }>;
  updateEmployee: (userId: number, data: { full_name: string; username: string; phone?: string }) => Promise<{ success: boolean; message: string }>;
  updateEmployeePassword: (userId: number, newPass: string) => Promise<void>;
  deleteEmployee: (userId: number) => Promise<void>;
  
  // Operations
  performExchange: (
    employeeId: number, 
    companyId: number, 
    fromCurrency: 'EGP' | 'SDG', 
    amount: number, 
    receipt: string
  ) => Promise<{ success: boolean; message: string; transaction?: Transaction }>;
  
  addExpense: (
    employeeId: number,
    currency: 'EGP' | 'SDG',
    amount: number,
    description: string
  ) => Promise<{ success: boolean; message: string; transaction?: Transaction }>;

  deleteTransaction: (transactionId: number) => Promise<{ success: boolean; message: string }>;

  addMerchant: (companyId: number, name: string, phone: string) => Promise<void>;
  deleteMerchant: (merchantId: number) => Promise<void>;
  addMerchantEntry: (merchantId: number, type: 'credit' | 'debit', currency: 'EGP' | 'SDG', amount: number) => Promise<void>;
  addEWallet: (companyId: number, employeeId: number, phone: string, provider: string) => Promise<void>;
  deleteEWallet: (id: number) => Promise<void>;
  feedEWallet: (walletId: number, amount: number) => Promise<{ success: boolean; message: string }>;
  
  performEWalletTransfer: (
      walletId: number, 
      type: 'deposit' | 'withdraw',
      amount: number, 
      recipientPhone: string, 
      receipt: string
  ) => Promise<{ success: boolean; message: string; transaction?: Transaction }>;
  
  manageTreasury: (
    type: 'feed' | 'withdraw', 
    target: 'main' | 'employee', 
    companyId: number, 
    currency: 'EGP' | 'SDG', 
    amount: number,
    employeeId?: number
  ) => Promise<{ success: boolean; message: string; transaction?: Transaction }>;

  // Database Management
  exportDatabase: () => void;
  importDatabase: (jsonData: string) => Promise<{ success: boolean; message: string }>;
}

const StoreContext = createContext<StoreData | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State Initialization
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantEntries, setMerchantEntries] = useState<MerchantEntry[]>([]);
  const [eWallets, setEWallets] = useState<EWallet[]>([]);
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

  // Fetch Data from Supabase
  const fetchData = async () => {
    try {
      const { data: companiesData } = await supabase.from('companies').select('*');
      if (companiesData) setCompanies(companiesData);

      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) setUsers(usersData);

      const { data: treasuriesData } = await supabase.from('treasuries').select('*');
      if (treasuriesData) setTreasuries(treasuriesData);

      const { data: ratesData } = await supabase.from('exchange_rates').select('*');
      if (ratesData) setExchangeRates(ratesData);

      const { data: txData } = await supabase.from('transactions').select('*');
      if (txData) setTransactions(txData);

      const { data: merchData } = await supabase.from('merchants').select('*');
      if (merchData) setMerchants(merchData);

      const { data: entriesData } = await supabase.from('merchant_entries').select('*');
      if (entriesData) setMerchantEntries(entriesData);

      const { data: walletsData } = await supabase.from('e_wallets').select('*');
      if (walletsData) setEWallets(walletsData);

    } catch (error) {
      console.error("Critical error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const channels = supabase.channel('custom-all-channel')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, []);

  useEffect(() => localStorage.setItem('currentUser', JSON.stringify(currentUser)), [currentUser]);

  const isUsernameTaken = (username: string, excludeId?: number) => {
      return users.some(u => u.username.toLowerCase() === username.toLowerCase() && u.is_active && u.id !== excludeId);
  };

  // --- ACTIONS ---

  const login = async (username: string, pass: string) => {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', pass)
      .eq('is_active', true)
      .single();

    if (user) {
      if (user.role !== 'super_admin' && user.company_id) {
        const { data: company } = await supabase.from('companies').select('*').eq('id', user.company_id).single();
        if (!company || !company.is_active || new Date(company.subscription_end) < new Date()) {
          return { success: false };
        }
      }
      // Set State
      setCurrentUser(user);
      
      // Update local storage immediately to ensure sync for navigation
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      showToast(`مرحباً ${user.full_name}`, 'success');
      return { success: true, role: user.role };
    }
    return { success: false };
  };

  const logout = () => {
      setCurrentUser(null);
      showToast('تم تسجيل الخروج', 'info');
  };

  const addCompany = async (name: string, username: string, pass: string, days: number, logo?: string) => {
    if (isUsernameTaken(username)) {
      return { success: false, message: 'اسم المستخدم مسجل مسبقاً' };
    }

    const subEnd = new Date();
    subEnd.setDate(subEnd.getDate() + days);

    const companyData: any = {
      name,
      username,
      subscription_end: subEnd.toISOString(),
      is_active: true,
      logo
    };

    let { data: company, error: compError } = await supabase.from('companies').insert(companyData).select().single();

    if (compError || !company) {
      console.error("Error adding company:", compError);
      return { success: false, message: 'فشل إنشاء الشركة: ' + (compError?.message || '') };
    }

    await supabase.from('users').insert({
      username,
      password: pass,
      role: 'admin',
      full_name: `مدير ${name}`,
      company_id: company.id,
      is_active: true
    });

    await supabase.from('treasuries').insert({
      company_id: company.id,
      egp_balance: 0,
      sdg_balance: 0
    });

    await supabase.from('exchange_rates').insert({
        company_id: company.id,
        sd_to_eg_rate: 74.0,
        eg_to_sd_rate: 73.0,
        wholesale_rate: 72.5,
        wholesale_threshold: 30000,
        ewallet_commission: 1.0,
        updated_at: new Date().toISOString()
    });

    await fetchData();
    showToast('تم إضافة الشركة بنجاح', 'success');
    return { success: true, message: 'تم إضافة الشركة بنجاح' };
  };

  const updateCompany = async (id: number, data: Partial<Company> & { password?: string }) => {
      // Handle Username change collision check
      if (data.username) {
        const currentCompany = companies.find(c => c.id === id);
        if (currentCompany && currentCompany.username !== data.username) {
             if (isUsernameTaken(data.username)) return { success: false, message: 'اسم المستخدم الجديد مسجل مسبقاً' };
        }
      }

      const { password, ...companyData } = data;
      const payload: any = { ...companyData };

      let { error } = await supabase.from('companies').update(payload).eq('id', id);

      if (error) {
        console.error("Error updating company:", error);
        return { success: false, message: error.message };
      }
      
      // Update Admin User details
      const updateData: any = {};
      if (data.username) updateData.username = data.username;
      if (password) updateData.password = password;

      if (Object.keys(updateData).length > 0) {
          await supabase.from('users')
            .update(updateData)
            .eq('company_id', id)
            .eq('role', 'admin');
      }
      
      await fetchData();
      showToast('تم تحديث بيانات الشركة', 'success');
      return { success: true, message: 'تم التحديث بنجاح' };
  };

  const renewSubscription = async (companyId: number, days: number) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;
    
    const currentEnd = new Date(company.subscription_end) > new Date() ? new Date(company.subscription_end) : new Date();
    currentEnd.setDate(currentEnd.getDate() + days);
    
    await supabase.from('companies').update({ subscription_end: currentEnd.toISOString() }).eq('id', companyId);
    await fetchData();
    showToast('تم تجديد الاشتراك', 'success');
  };

  const deleteCompany = async (companyId: number) => {
    try {
      // Hard delete sequence
      await supabase.from('transactions').delete().eq('company_id', companyId);
      await supabase.from('merchant_entries').delete().eq('company_id', companyId);
      await supabase.from('merchants').delete().eq('company_id', companyId);
      await supabase.from('e_wallets').delete().eq('company_id', companyId);
      await supabase.from('treasuries').delete().eq('company_id', companyId);
      await supabase.from('exchange_rates').delete().eq('company_id', companyId);
      await supabase.from('users').delete().eq('company_id', companyId);
      await supabase.from('companies').delete().eq('id', companyId);

      await fetchData();
      showToast('تم حذف الشركة وجميع بياناتها نهائياً', 'success');
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ أثناء حذف الشركة', 'error');
    }
  };

  const toggleCompanyStatus = async (companyId: number) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
        await supabase.from('companies').update({ is_active: !company.is_active }).eq('id', companyId);
        await fetchData();
        showToast(company.is_active ? 'تم إيقاف الشركة' : 'تم تنشيط الشركة', 'info');
    }
  };

  const updateExchangeRate = async (companyId: number, rates: Partial<ExchangeRate>) => {
    const existing = exchangeRates.find(r => r.company_id === companyId);
    if (existing) {
        await supabase.from('exchange_rates').update({ ...rates, updated_at: new Date().toISOString() }).eq('company_id', companyId);
    } else {
        await supabase.from('exchange_rates').insert({
            company_id: companyId,
            ...rates,
            updated_at: new Date().toISOString()
        });
    }
    await fetchData();
    showToast('تم تحديث الأسعار', 'success');
  };

  const addEmployee = async (companyId: number, fullName: string, username: string, pass: string, phone: string) => {
    if (isUsernameTaken(username)) {
      return { success: false, message: 'اسم المستخدم مسجل مسبقاً' };
    }

    const payload: any = {
      username,
      password: pass,
      role: 'employee',
      full_name: fullName,
      company_id: companyId,
      is_active: true
    };
    if (phone) payload.phone = phone;

    let { data: user, error } = await supabase.from('users').insert(payload).select().single();

    // Fallback if 'phone' column is missing in 'users' table
    if (error && (error.message.includes("column") || error.code === '42703')) {
        delete payload.phone;
        const retry = await supabase.from('users').insert(payload).select().single();
        user = retry.data;
        error = retry.error;
        if (!error) {
            showToast('تم إضافة الموظف (لم يتم حفظ الهاتف لعدم تحديث قاعدة البيانات)', 'info');
        }
    }

    if (error) {
        return { success: false, message: 'حدث خطأ: ' + error.message };
    }

    if (user) {
        await supabase.from('treasuries').insert({
            company_id: companyId,
            employee_id: user.id,
            egp_balance: 0,
            sdg_balance: 0
        });
        await fetchData();
        showToast('تم إضافة الموظف بنجاح', 'success');
        return { success: true, message: 'تم إضافة الموظف بنجاح' };
    }
    return { success: false, message: 'حدث خطأ غير متوقع' };
  };

  const updateEmployee = async (userId: number, data: { full_name: string; username: string; phone?: string }) => {
      const user = users.find(u => u.id === userId);
      if (!user) return { success: false, message: 'الموظف غير موجود' };

      if (user.username !== data.username && isUsernameTaken(data.username, userId)) {
          return { success: false, message: 'اسم المستخدم مسجل مسبقاً' };
      }

      const payload: any = { ...data };
      let { error } = await supabase.from('users').update(payload).eq('id', userId);

      // Fallback
      if (error && (error.message.includes("column") || error.code === '42703')) {
          if (payload.phone) {
              delete payload.phone;
              const retry = await supabase.from('users').update(payload).eq('id', userId);
              error = retry.error;
              if(!error) showToast('تم التحديث (لم يتم حفظ الهاتف لعدم تحديث قاعدة البيانات)', 'info');
          }
      }

      if (error) {
          return { success: false, message: 'فشل التحديث: ' + error.message };
      }

      await fetchData();
      showToast('تم تحديث بيانات الموظف', 'success');
      return { success: true, message: 'تم التحديث بنجاح' };
  };

  const updateEmployeePassword = async (userId: number, newPass: string) => {
    await supabase.from('users').update({ password: newPass }).eq('id', userId);
    await fetchData();
    showToast('تم تغيير كلمة المرور', 'success');
  };

  const deleteEmployee = async (userId: number) => {
    await supabase.from('users').delete().eq('id', userId);
    await supabase.from('treasuries').delete().eq('employee_id', userId);

    await fetchData();
    showToast('تم حذف الموظف', 'success');
  };

  // --- OPERATIONS ---

  const performExchange = async (
    employeeId: number, 
    companyId: number, 
    fromCurrency: 'EGP' | 'SDG', 
    amount: number, 
    receipt: string
  ) => {
    // Round input amount (>=0.5 -> 1, <0.5 -> 0)
    const rAmount = Math.round(amount);

    if (rAmount <= 0) return { success: false, message: 'المبلغ غير صحيح' };

    // 1. DUPLICATE CHECK
    if (receipt) {
        const duplicate = transactions.find(t => 
            t.company_id === companyId && 
            t.receipt_number === receipt && 
            t.from_amount === rAmount &&
            t.type === 'exchange'
        );
        if (duplicate) {
            return { success: false, message: 'عفواً، العملية مكررة! يوجد إشعار سابق بنفس الرقم والمبلغ.' };
        }
    }

    const rateData = exchangeRates.find(r => r.company_id === companyId);
    if (!rateData) return { success: false, message: 'لم يتم تحديد أسعار الصرف' };

    const empTreasury = treasuries.find(t => t.employee_id === employeeId);
    if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };

    let toCurrency = fromCurrency === 'EGP' ? 'SDG' : 'EGP';
    let exchangeRate = 0;
    let toAmount = 0;
    let isWholesale = false;

    if (fromCurrency === 'SDG') {
        const potentialWholesaleResult = rAmount / rateData.wholesale_rate;
        
        if (potentialWholesaleResult >= rateData.wholesale_threshold) {
            isWholesale = true;
            exchangeRate = rateData.wholesale_rate;
            toAmount = Math.round(potentialWholesaleResult);
        } else {
            isWholesale = false;
            exchangeRate = rateData.sd_to_eg_rate;
            toAmount = Math.round(rAmount / exchangeRate);
        }

       if (empTreasury.egp_balance < toAmount) {
           return { success: false, message: `رصيد المصري غير كافي` };
       }
       
       await supabase.from('treasuries').update({
           sdg_balance: empTreasury.sdg_balance + rAmount,
           egp_balance: empTreasury.egp_balance - toAmount
       }).eq('id', empTreasury.id);

    } else {
        exchangeRate = rateData.eg_to_sd_rate;
        toAmount = Math.round(rAmount * exchangeRate);

        if (empTreasury.sdg_balance < toAmount) {
            return { success: false, message: `رصيد السوداني غير كافي` };
        }

        await supabase.from('treasuries').update({
            egp_balance: empTreasury.egp_balance + rAmount,
            sdg_balance: empTreasury.sdg_balance - toAmount
        }).eq('id', empTreasury.id);
    }

    const { data: newTx, error } = await supabase.from('transactions').insert({
        company_id: companyId,
        employee_id: employeeId,
        type: 'exchange',
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: rAmount,
        to_amount: toAmount,
        rate: exchangeRate,
        receipt_number: receipt,
        created_at: new Date().toISOString(),
        is_wholesale: isWholesale
    }).select().single();

    if (error) return { success: false, message: 'فشل العملية' };

    await fetchData();
    showToast('تمت عملية الصرف بنجاح', 'success');
    return { success: true, message: 'تمت العملية بنجاح', transaction: newTx };
  };

  const addExpense = async (
    employeeId: number,
    currency: 'EGP' | 'SDG',
    amount: number,
    description: string
  ) => {
    // Round input amount
    const rAmount = Math.round(amount);
    if (rAmount <= 0) return { success: false, message: 'المبلغ غير صحيح' };
    if (!description.trim()) return { success: false, message: 'يرجى إدخال وصف للمنصرف' };

    const empTreasury = treasuries.find(t => t.employee_id === employeeId);
    if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };

    const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
    
    if (empTreasury[balanceKey] < rAmount) {
         return { success: false, message: `رصيد ${currency} غير كافي` };
    }

    // Deduct from employee treasury
    await supabase.from('treasuries').update({
        [balanceKey]: empTreasury[balanceKey] - rAmount
    }).eq('id', empTreasury.id);

    const { data: newTx, error } = await supabase.from('transactions').insert({
        company_id: empTreasury.company_id,
        employee_id: employeeId,
        type: 'expense',
        from_currency: currency,
        from_amount: rAmount,
        description: description,
        created_at: new Date().toISOString()
    }).select().single();

    if (error) return { success: false, message: 'فشل تسجيل المنصرف' };

    await fetchData();
    showToast('تم تسجيل المنصرف بنجاح', 'success');
    return { success: true, message: 'تم تسجيل المنصرف', transaction: newTx };
  };

  const deleteTransaction = async (transactionId: number) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return { success: false, message: 'العملية غير موجودة' };

    // --- HANDLE WALLET TRANSACTIONS ---
    if (['wallet_deposit', 'wallet_withdrawal', 'wallet_feed'].includes(transaction.type)) {
        const wallet = eWallets.find(w => w.id === transaction.e_wallet_id);
        
        if (!wallet) return { success: false, message: 'المحفظة المرتبطة غير موجودة' };

        if (transaction.type === 'wallet_feed') {
            // Feed: Main Treasury -> Wallet
            // Reverse: Wallet -> Main Treasury
            const mainTreasury = treasuries.find(t => t.company_id === transaction.company_id && !t.employee_id);
            if (!mainTreasury) return { success: false, message: 'الخزينة الرئيسية غير موجودة' };

            const amount = transaction.from_amount;
            if (wallet.balance < amount) return { success: false, message: 'رصيد المحفظة لا يكفي للاسترداد' };

            await supabase.from('e_wallets').update({ balance: wallet.balance - amount }).eq('id', wallet.id);
            await supabase.from('treasuries').update({ egp_balance: mainTreasury.egp_balance + amount }).eq('id', mainTreasury.id);
        }
        else if (transaction.type === 'wallet_deposit') {
             // Deposit: (Amount + Commission) added to wallet
             // Reverse: Remove from wallet
             const amountToRemove = transaction.to_amount || transaction.from_amount;
             if (wallet.balance < amountToRemove) return { success: false, message: 'رصيد المحفظة لا يكفي للاسترداد' };
             
             await supabase.from('e_wallets').update({ balance: wallet.balance - amountToRemove }).eq('id', wallet.id);
        }
        else if (transaction.type === 'wallet_withdrawal') {
            // Withdraw: Removed from Wallet, Added to Emp Treasury (Amount + Commission)
            // Reverse: Add to Wallet, Remove from Emp Treasury
            const empTreasury = treasuries.find(t => t.employee_id === transaction.employee_id);
            if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };

            const amountToReturnToWallet = transaction.from_amount; // Raw amount
            const amountToTakeFromEmp = transaction.to_amount || transaction.from_amount; // Amount + Commission

            if (empTreasury.egp_balance < amountToTakeFromEmp) return { success: false, message: 'رصيد الموظف لا يكفي للاسترداد' };

            await supabase.from('e_wallets').update({ balance: wallet.balance + amountToReturnToWallet }).eq('id', wallet.id);
            await supabase.from('treasuries').update({ egp_balance: empTreasury.egp_balance - amountToTakeFromEmp }).eq('id', empTreasury.id);
        }

        await supabase.from('transactions').delete().eq('id', transactionId);
        await fetchData();
        showToast('تم حذف عملية المحفظة وعكس الأرصدة', 'success');
        return { success: true, message: 'تم الحذف بنجاح' };
    }

    // --- HANDLE EXCHANGE / EXPENSE ---
    const empTreasury = treasuries.find(t => t.employee_id === transaction.employee_id);
    if (!empTreasury) {
        return { success: false, message: 'خزينة الموظف غير موجودة لاسترداد المبلغ' };
    }

    if (transaction.type === 'exchange') {
        const fromAmount = transaction.from_amount;
        const toAmount = transaction.to_amount || 0;

        if (transaction.from_currency === 'SDG') {
            await supabase.from('treasuries').update({
                sdg_balance: empTreasury.sdg_balance - fromAmount,
                egp_balance: empTreasury.egp_balance + toAmount
            }).eq('id', empTreasury.id);
        } else { 
            await supabase.from('treasuries').update({
                egp_balance: empTreasury.egp_balance - fromAmount,
                sdg_balance: empTreasury.sdg_balance + toAmount
            }).eq('id', empTreasury.id);
        }
    } else if (transaction.type === 'expense') {
        const amount = transaction.from_amount;
        const balanceKey = transaction.from_currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
        await supabase.from('treasuries').update({
             [balanceKey]: empTreasury[balanceKey] + amount
        }).eq('id', empTreasury.id);
    } else {
         return { success: false, message: 'لا يمكن حذف هذا النوع من العمليات حالياً' };
    }

    await supabase.from('transactions').delete().eq('id', transactionId);
    
    await fetchData();
    showToast('تم حذف العملية واسترداد المبلغ', 'info');
    return { success: true, message: 'تم الحذف بنجاح' };
  };

  const addMerchant = async (companyId: number, name: string, phone: string) => {
    await supabase.from('merchants').insert({
        company_id: companyId,
        name,
        phone,
        egp_balance: 0,
        sdg_balance: 0,
        is_active: true
    });
    await fetchData();
    showToast('تم إضافة التاجر', 'success');
  };

  const deleteMerchant = async (merchantId: number) => {
    await supabase.from('merchants').update({ is_active: false }).eq('id', merchantId);
    await fetchData();
    showToast('تم حذف التاجر', 'success');
  };

  const addMerchantEntry = async (merchantId: number, type: 'credit' | 'debit', currency: 'EGP' | 'SDG', amount: number) => {
      // Round amount
      const rAmount = Math.round(amount);
      if (rAmount <= 0) return;

      const merchant = merchants.find(m => m.id === merchantId);
      if (merchant) {
          const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
          const change = type === 'credit' ? rAmount : -rAmount;
          
          await supabase.from('merchants').update({
              [balanceKey]: merchant[balanceKey] + change
          }).eq('id', merchantId);

          await supabase.from('merchant_entries').insert({
              merchant_id: merchantId,
              company_id: merchant.company_id,
              entry_type: type,
              currency,
              amount: rAmount,
              description: `قيد ${type === 'credit' ? 'له' : 'عليه'}`,
              created_at: new Date().toISOString()
          });
          await fetchData();
          showToast('تم تسجيل القيد', 'success');
      }
  };

  const addEWallet = async (companyId: number, employeeId: number, phone: string, provider: string) => {
      await supabase.from('e_wallets').insert({
          company_id: companyId,
          employee_id: employeeId,
          phone_number: phone,
          provider,
          balance: 0,
          is_active: true
      });
      await fetchData();
      showToast('تم إضافة المحفظة', 'success');
  };

  const deleteEWallet = async (id: number) => {
      await supabase.from('e_wallets').update({ is_active: false }).eq('id', id);
      await fetchData();
      showToast('تم حذف المحفظة', 'success');
  };

  const feedEWallet = async (walletId: number, amount: number) => {
    // Round amount
    const rAmount = Math.round(amount);
    if (rAmount <= 0) return { success: false, message: 'المبلغ غير صحيح' };

    const wallet = eWallets.find(w => w.id === walletId);
    if (!wallet) return { success: false, message: 'المحفظة غير موجودة' };

    const mainTreasury = treasuries.find(t => t.company_id === wallet.company_id && !t.employee_id);
    if (!mainTreasury || mainTreasury.egp_balance < rAmount) {
        return { success: false, message: 'رصيد الخزينة الرئيسية غير كافي' };
    }

    await supabase.from('treasuries').update({
        egp_balance: mainTreasury.egp_balance - rAmount
    }).eq('id', mainTreasury.id);

    await supabase.from('e_wallets').update({
        balance: wallet.balance + rAmount
    }).eq('id', walletId);

    await supabase.from('transactions').insert({
        company_id: wallet.company_id,
        type: 'wallet_feed',
        from_amount: rAmount,
        from_currency: 'EGP',
        description: `تغذية محفظة ${wallet.phone_number}`,
        e_wallet_id: walletId,
        created_at: new Date().toISOString()
    });

    await fetchData();
    showToast('تم تغذية المحفظة بنجاح', 'success');
    return { success: true, message: 'تم تغذية المحفظة بنجاح' };
  };

  const performEWalletTransfer = async (
    walletId: number, 
    type: 'deposit' | 'withdraw',
    amount: number, 
    recipientPhone: string, 
    receipt: string
  ) => {
      // Round amount
      const rAmount = Math.round(amount);
      if (rAmount <= 0) return { success: false, message: 'المبلغ غير صحيح' };

      const wallet = eWallets.find(w => w.id === walletId);
      if (!wallet) return { success: false, message: 'Wallet not found' };
      
      const user = users.find(u => u.id === wallet.employee_id);
      if (!user) return { success: false, message: 'User not found' };

      const empTreasury = treasuries.find(t => t.employee_id === user.id);
      if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };

      // 1. DUPLICATE CHECK
      if (receipt) {
        const duplicate = transactions.find(t => 
            t.company_id === user.company_id && 
            t.receipt_number === receipt && 
            t.from_amount === rAmount &&
            (t.type === 'wallet_deposit' || t.type === 'wallet_withdrawal')
        );
        if (duplicate) {
            return { success: false, message: 'عفواً، العملية مكررة! يوجد إشعار سابق بنفس الرقم والمبلغ.' };
        }
      }

      const rates = exchangeRates.find(r => r.company_id === wallet.company_id);
      const commissionRate = rates?.ewallet_commission || 1; 
      
      // Round commission
      const commission = Math.round(rAmount * (commissionRate / 100));

      const transactionType = type === 'withdraw' ? 'wallet_withdrawal' : 'wallet_deposit';

      if (type === 'withdraw') {
          // Withdrawal: 
          if (wallet.balance < rAmount) {
              return { success: false, message: `رصيد المحفظة غير كافي للسحب` };
          }
          
          await supabase.from('e_wallets').update({
            balance: wallet.balance - rAmount
          }).eq('id', walletId);

          const totalToAdd = rAmount + commission;
          await supabase.from('treasuries').update({
            egp_balance: empTreasury.egp_balance + totalToAdd
          }).eq('id', empTreasury.id);

      } else {
          // Deposit:
          const totalToAdd = rAmount + commission;
          await supabase.from('e_wallets').update({
            balance: wallet.balance + totalToAdd
          }).eq('id', walletId);
      }

      const { data: newTx, error } = await supabase.from('transactions').insert({
          company_id: user.company_id!,
          employee_id: wallet.employee_id,
          type: transactionType,
          from_currency: 'EGP',
          to_currency: 'EGP',
          from_amount: rAmount,
          to_amount: rAmount + commission,
          commission: commission,
          receipt_number: receipt,
          description: `${type === 'withdraw' ? 'سحب' : 'إيداع'} - ${recipientPhone} via ${wallet.provider}`,
          created_at: new Date().toISOString(),
          e_wallet_id: walletId
      }).select().single();

      if (error) return { success: false, message: error.message };

      await fetchData();
      showToast('تمت العملية بنجاح', 'success');
      return { success: true, message: 'تمت العملية بنجاح', transaction: newTx };
  };

  const manageTreasury = async (
    type: 'feed' | 'withdraw', 
    target: 'main' | 'employee', 
    companyId: number, 
    currency: 'EGP' | 'SDG', 
    amount: number,
    employeeId?: number
  ) => {
      // Round amount
      const rAmount = Math.round(amount);
      if (rAmount <= 0) return { success: false, message: 'المبلغ غير صحيح' };

      const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
      const mainTreasury = treasuries.find(t => t.company_id === companyId && !t.employee_id);

      if (!mainTreasury) return { success: false, message: 'الخزينة الرئيسية غير موجودة' };

      if (type === 'feed' && target === 'employee') {
          if (mainTreasury[balanceKey] < rAmount) {
              return { success: false, message: 'رصيد الخزينة الرئيسية غير كافي' };
          }
      }

      if (type === 'feed' && target === 'employee') {
          const empT = treasuries.find(t => t.employee_id === employeeId);
          if (empT) {
             await supabase.from('treasuries').update({ [balanceKey]: mainTreasury[balanceKey] - rAmount }).eq('id', mainTreasury.id);
             await supabase.from('treasuries').update({ [balanceKey]: empT[balanceKey] + rAmount }).eq('id', empT.id);
          }
      } 
      else if (type === 'withdraw' && target === 'employee') {
          const empT = treasuries.find(t => t.employee_id === employeeId);
          if (empT) {
              if (empT[balanceKey] < rAmount) return { success: false, message: 'رصيد الموظف غير كافي' };
              await supabase.from('treasuries').update({ [balanceKey]: empT[balanceKey] - rAmount }).eq('id', empT.id);
              await supabase.from('treasuries').update({ [balanceKey]: mainTreasury[balanceKey] + rAmount }).eq('id', mainTreasury.id);
          }
      }
      else if (type === 'feed' && target === 'main') {
          await supabase.from('treasuries').update({ [balanceKey]: mainTreasury[balanceKey] + rAmount }).eq('id', mainTreasury.id);
      }
      else if (type === 'withdraw' && target === 'main') {
          if (mainTreasury[balanceKey] < rAmount) return { success: false, message: 'رصيد الخزينة غير كافي' };
          await supabase.from('treasuries').update({ [balanceKey]: mainTreasury[balanceKey] - rAmount }).eq('id', mainTreasury.id);
      }

      let desc = '';
      if (target === 'employee' && type === 'feed') desc = 'تحويل من الخزينة الرئيسية إلى موظف';
      else if (target === 'employee' && type === 'withdraw') desc = 'استرداد من موظف إلى الخزينة الرئيسية';
      else if (target === 'main' && type === 'feed') desc = 'إيداع خارجي للخزينة الرئيسية';
      else desc = 'سحب خارجي من الخزينة الرئيسية';

      const { data: newTx, error } = await supabase.from('transactions').insert({
          company_id: companyId,
          employee_id: target === 'employee' ? employeeId : undefined,
          type: type === 'feed' ? 'treasury_feed' : 'treasury_withdraw',
          from_amount: rAmount,
          from_currency: currency,
          description: desc,
          created_at: new Date().toISOString()
      }).select().single();

      if (error) return { success: false, message: error.message };

      await fetchData();
      showToast('تم تنفيذ العملية بنجاح', 'success');
      return { success: true, message: 'تم تنفيذ العملية بنجاح', transaction: newTx };
  };

  const exportDatabase = () => {
    const data = {
        companies, users, treasuries, exchangeRates, transactions, merchants, merchantEntries, eWallets
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `exchange_flow_backup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تحميل النسخة الاحتياطية', 'info');
  };

  const importDatabase = async (_jsonString: string) => {
    return { success: false, message: 'الاستيراد غير متاح في وضع السحابة للحفاظ على سلامة البيانات' };
  };

  return (
    <StoreContext.Provider value={{
      currentUser, companies, users, treasuries, exchangeRates, transactions, merchants, merchantEntries, eWallets,
      toast, showToast, hideToast,
      login, logout, addCompany, updateCompany, renewSubscription, deleteCompany, toggleCompanyStatus, updateExchangeRate, 
      addEmployee, updateEmployee, updateEmployeePassword, deleteEmployee,
      performExchange, addExpense, deleteTransaction, addMerchant, deleteMerchant, addMerchantEntry, addEWallet, deleteEWallet, performEWalletTransfer, manageTreasury, feedEWallet,
      exportDatabase, importDatabase
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
