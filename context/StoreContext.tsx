
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Company, Treasury, ExchangeRate, Transaction, 
  Merchant, MerchantEntry, EWallet, DEFAULT_SUPER_ADMIN
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
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  addCompany: (name: string, username: string, password: string, days: number, phoneNumbers: string, logo?: string, footerMessage?: string) => Promise<{ success: boolean; message: string }>;
  updateCompany: (id: number, data: Partial<Company> & { password?: string }) => Promise<{ success: boolean; message: string }>;
  renewSubscription: (companyId: number, days: number) => Promise<void>;
  deleteCompany: (companyId: number) => Promise<void>;
  toggleCompanyStatus: (companyId: number) => Promise<void>; 
  updateExchangeRate: (companyId: number, rates: Partial<ExchangeRate>) => Promise<void>;
  addEmployee: (companyId: number, fullName: string, username: string, password: string) => Promise<{ success: boolean; message: string }>;
  updateEmployee: (userId: number, data: { full_name: string; username: string }) => Promise<{ success: boolean; message: string }>;
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
  
  recordExpense: (
    employeeId: number,
    companyId: number,
    currency: 'EGP' | 'SDG',
    amount: number,
    description: string
  ) => Promise<{ success: boolean; message: string }>;

  deleteTransaction: (transactionId: number) => Promise<{ success: boolean; message: string }>;

  addMerchant: (companyId: number, name: string, phone: string) => Promise<void>;
  deleteMerchant: (merchantId: number) => Promise<void>;
  addMerchantEntry: (merchantId: number, type: 'credit' | 'debit', currency: 'EGP' | 'SDG', amount: number) => Promise<void>;
  
  manageTreasury: (
    type: 'feed' | 'withdraw', 
    target: 'main' | 'employee', 
    companyId: number, 
    currency: 'EGP' | 'SDG', 
    amount: number,
    employeeId?: number
  ) => Promise<{ success: boolean; message: string; transaction?: Transaction }>;

  // E-Wallets
  addEWallet: (companyId: number, employeeId: number, phoneNumber: string, provider: string) => Promise<{ success: boolean; message: string }>;
  deleteEWallet: (walletId: number) => Promise<void>;
  feedEWallet: (walletId: number, amount: number) => Promise<{ success: boolean; message: string }>;
  performEWalletTransfer: (
    walletId: number,
    type: 'withdraw' | 'deposit' | 'exchange',
    amount: number, // Input amount (could be EGP or SDG depending on type)
    phone: string,
    receipt: string
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
    try {
        const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', pass)
        .eq('is_active', true)
        .maybeSingle();

        if (user) {
            if (user.role !== 'super_admin' && user.company_id) {
                const { data: company } = await supabase.from('companies').select('*').eq('id', user.company_id).single();
                if (!company || !company.is_active || new Date(company.subscription_end) < new Date()) {
                    return null;
                }
            }
            setCurrentUser(user);
            showToast(`مرحباً ${user.full_name}`, 'success');
            return user;
        }
    } catch (error) {
        console.error("Login attempt failed against DB", error);
    }

    // Fallback for default super admin if DB is empty or connection fails
    if (username === DEFAULT_SUPER_ADMIN.username && pass === DEFAULT_SUPER_ADMIN.password) {
        setCurrentUser(DEFAULT_SUPER_ADMIN);
        showToast(`مرحباً ${DEFAULT_SUPER_ADMIN.full_name}`, 'success');
        return DEFAULT_SUPER_ADMIN;
    }

    return null;
  };

  const logout = () => {
      setCurrentUser(null);
      showToast('تم تسجيل الخروج', 'info');
  };

  const addCompany = async (name: string, username: string, pass: string, days: number, phoneNumbers: string, logo?: string, footerMessage?: string) => {
    if (isUsernameTaken(username)) {
      return { success: false, message: 'اسم المستخدم مسجل مسبقاً' };
    }

    const subEnd = new Date();
    subEnd.setDate(subEnd.getDate() + days);

    const { data: company, error: compError } = await supabase.from('companies').insert({
      name,
      username,
      subscription_end: subEnd.toISOString(),
      is_active: true,
      phone_numbers: phoneNumbers,
      logo,
      footer_message: footerMessage
    }).select().single();

    if (compError || !company) return { success: false, message: 'فشل إنشاء الشركة' };

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
      try {
        // Handle Username change collision check
        if (data.username) {
            const currentCompany = companies.find(c => c.id === id);
            if (currentCompany && currentCompany.username !== data.username) {
                if (isUsernameTaken(data.username)) return { success: false, message: 'اسم المستخدم الجديد مسجل مسبقاً' };
            }
        }

        const { password, ...companyData } = data;

        const { error } = await supabase.from('companies').update(companyData).eq('id', id);
        if (error) {
            console.error("Update Company DB Error:", error);
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
        return { success: true, message: 'تم التحديث بنجاح' };
      } catch (err: any) {
        console.error("Update Company Exception:", err);
        return { success: false, message: err.message || 'Unknown error' };
      }
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

  const addEmployee = async (companyId: number, fullName: string, username: string, pass: string) => {
    if (isUsernameTaken(username)) {
      return { success: false, message: 'اسم المستخدم مسجل مسبقاً' };
    }

    try {
      const { data: user, error } = await supabase.from('users').insert({
        username,
        password: pass,
        role: 'employee',
        full_name: fullName,
        company_id: companyId,
        is_active: true
      }).select().single();

      if (error) {
          console.error("Supabase insert error:", error);
          if (error.code === '23505') {
               return { success: false, message: 'اسم المستخدم مسجل مسبقاً (قاعدة البيانات)' };
          }
          return { success: false, message: 'خطأ في قاعدة البيانات: ' + error.message };
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
      
      return { success: false, message: 'لم يتم إنشاء المستخدم، يرجى المحاولة مرة أخرى' };

    } catch (err: any) {
        console.error("Add employee exception:", err);
        return { success: false, message: 'حدث خطأ غير متوقع: ' + (err.message || '') };
    }
  };

  const updateEmployee = async (userId: number, data: { full_name: string; username: string }) => {
      const user = users.find(u => u.id === userId);
      if (!user) return { success: false, message: 'الموظف غير موجود' };

      if (user.username !== data.username && isUsernameTaken(data.username, userId)) {
          return { success: false, message: 'اسم المستخدم مسجل مسبقاً' };
      }

      await supabase.from('users').update(data).eq('id', userId);
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
    await supabase.from('users').update({ is_active: false }).eq('id', userId);
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
    if (receipt) {
        const duplicate = transactions.find(t => 
            t.company_id === companyId && 
            t.receipt_number === receipt && 
            t.from_amount === amount &&
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
       let normalRate = rateData.sd_to_eg_rate;
       let calcAmount = amount / normalRate; 
       
       if (calcAmount >= rateData.wholesale_threshold) {
           isWholesale = true;
           exchangeRate = rateData.wholesale_rate;
           calcAmount = amount / exchangeRate;
       } else {
           exchangeRate = normalRate;
       }
       toAmount = calcAmount;

       if (empTreasury.egp_balance < toAmount) {
           return { success: false, message: `رصيد المصري غير كافي` };
       }
       
       await supabase.from('treasuries').update({
           sdg_balance: empTreasury.sdg_balance + amount,
           egp_balance: empTreasury.egp_balance - toAmount
       }).eq('id', empTreasury.id);

    } else {
        exchangeRate = rateData.eg_to_sd_rate;
        toAmount = amount * exchangeRate;

        if (empTreasury.sdg_balance < toAmount) {
            return { success: false, message: `رصيد السوداني غير كافي` };
        }

        await supabase.from('treasuries').update({
            egp_balance: empTreasury.egp_balance + amount,
            sdg_balance: empTreasury.sdg_balance - toAmount
        }).eq('id', empTreasury.id);
    }

    const { data: newTx, error } = await supabase.from('transactions').insert({
        company_id: companyId,
        employee_id: employeeId,
        type: 'exchange',
        from_currency: fromCurrency,
        to_currency: toCurrency,
        from_amount: amount,
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

  const recordExpense = async (
    employeeId: number,
    companyId: number,
    currency: 'EGP' | 'SDG',
    amount: number,
    description: string
  ) => {
    const empTreasury = treasuries.find(t => t.employee_id === employeeId);
    if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };

    const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
    
    if (empTreasury[balanceKey] < amount) {
        return { success: false, message: `رصيد ${currency} غير كافي لتسجيل المنصرف` };
    }

    // Deduct
    await supabase.from('treasuries').update({
        [balanceKey]: empTreasury[balanceKey] - amount
    }).eq('id', empTreasury.id);

    // Record Transaction
    await supabase.from('transactions').insert({
        company_id: companyId,
        employee_id: employeeId,
        type: 'expense',
        from_currency: currency,
        from_amount: amount,
        description: description || 'منصرفات عامة',
        created_at: new Date().toISOString()
    });

    await fetchData();
    showToast('تم تسجيل المنصرف بنجاح', 'success');
    return { success: true, message: 'تم التسجيل بنجاح' };
  };

  const deleteTransaction = async (transactionId: number) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return { success: false, message: 'العملية غير موجودة' };

    const empTreasury = treasuries.find(t => t.employee_id === transaction.employee_id);

    // Reverse specific transaction logic
    if (transaction.type === 'exchange') {
        if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };
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
        if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };
        const currency = transaction.from_currency as 'EGP' | 'SDG';
        const amount = transaction.from_amount;
        const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
        
        await supabase.from('treasuries').update({
            [balanceKey]: empTreasury[balanceKey] + amount
        }).eq('id', empTreasury.id);
    } else if (transaction.type === 'wallet_transfer') {
        if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };
        const wallet = eWallets.find(w => w.id === transaction.wallet_id);
        if (!wallet) return { success: false, message: 'المحفظة غير موجودة' };
        
        const amount = transaction.from_amount;
        const commission = transaction.commission || 0;
        const walletType = transaction.wallet_type || 'withdraw';

        // Reverse logic based on type
        if (walletType === 'withdraw') {
             // Logic was: Wallet - Amount, Treasury + (Amount + Comm)
             // Reverse: Wallet + Amount, Treasury - (Amount + Comm)
             await supabase.from('e_wallets').update({ balance: wallet.balance + amount }).eq('id', wallet.id);
             await supabase.from('treasuries').update({ 
                 egp_balance: empTreasury.egp_balance - (amount + commission) 
             }).eq('id', empTreasury.id);

        } else if (walletType === 'deposit') {
             // Logic was: Treasury - Amount, Treasury + Comm, Wallet + Amount. Net Treasury = -Amount + Comm.
             // Reverse: Treasury + Amount - Comm, Wallet - Amount.
             await supabase.from('e_wallets').update({ balance: wallet.balance - amount }).eq('id', wallet.id);
             await supabase.from('treasuries').update({
                 egp_balance: empTreasury.egp_balance + amount - commission
             }).eq('id', empTreasury.id);

        } else if (walletType === 'exchange') {
             // Logic was: Wallet - EGP, Treasury + SDG (Cash).
             // Reverse: Wallet + EGP, Treasury - SDG (Cash).
             const rate = transaction.rate || 1;
             const egpValue = amount / rate; // This is the EGP value deducted from wallet
             
             await supabase.from('e_wallets').update({ balance: wallet.balance + egpValue }).eq('id', wallet.id);
             await supabase.from('treasuries').update({
                 sdg_balance: empTreasury.sdg_balance - amount
             }).eq('id', empTreasury.id);
        }
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
      const merchant = merchants.find(m => m.id === merchantId);
      if (merchant) {
          const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
          const change = type === 'credit' ? amount : -amount;
          
          await supabase.from('merchants').update({
              [balanceKey]: merchant[balanceKey] + change
          }).eq('id', merchantId);

          await supabase.from('merchant_entries').insert({
              merchant_id: merchantId,
              company_id: merchant.company_id,
              entry_type: type,
              currency,
              amount,
              description: `قيد ${type === 'credit' ? 'له' : 'عليه'}`,
              created_at: new Date().toISOString()
          });
          await fetchData();
          showToast('تم تسجيل القيد', 'success');
      }
  };

  const manageTreasury = async (
    type: 'feed' | 'withdraw', 
    target: 'main' | 'employee', 
    companyId: number, 
    currency: 'EGP' | 'SDG', 
    amount: number,
    employeeId?: number
  ) => {
      const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
      const mainTreasury = treasuries.find(t => t.company_id === companyId && !t.employee_id);

      if (!mainTreasury) return { success: false, message: 'الخزينة الرئيسية غير موجودة' };

      if (type === 'feed' && target === 'employee') {
          if (mainTreasury[balanceKey] < amount) {
              return { success: false, message: 'رصيد الخزينة الرئيسية غير كافي' };
          }
      }

      if (type === 'feed' && target === 'employee') {
          const empT = treasuries.find(t => t.employee_id === employeeId);
          if (empT) {
             await supabase.from('treasuries').update({ [balanceKey]: mainTreasury[balanceKey] - amount }).eq('id', mainTreasury.id);
             await supabase.from('treasuries').update({ [balanceKey]: empT[balanceKey] + amount }).eq('id', empT.id);
          }
      } 
      else if (type === 'withdraw' && target === 'employee') {
          const empT = treasuries.find(t => t.employee_id === employeeId);
          if (empT) {
              if (empT[balanceKey] < amount) return { success: false, message: 'رصيد الموظف غير كافي' };
              await supabase.from('treasuries').update({ [balanceKey]: empT[balanceKey] - amount }).eq('id', empT.id);
              await supabase.from('treasuries').update({ [balanceKey]: mainTreasury[balanceKey] + amount }).eq('id', mainTreasury.id);
          }
      }
      else if (type === 'feed' && target === 'main') {
          await supabase.from('treasuries').update({ [balanceKey]: mainTreasury[balanceKey] + amount }).eq('id', mainTreasury.id);
      }
      else if (type === 'withdraw' && target === 'main') {
          if (mainTreasury[balanceKey] < amount) return { success: false, message: 'رصيد الخزينة غير كافي' };
          await supabase.from('treasuries').update({ [balanceKey]: mainTreasury[balanceKey] - amount }).eq('id', mainTreasury.id);
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
          from_amount: amount,
          from_currency: currency,
          description: desc,
          created_at: new Date().toISOString()
      }).select().single();

      if (error) return { success: false, message: error.message };

      await fetchData();
      showToast('تم تنفيذ العملية بنجاح', 'success');
      return { success: true, message: 'تم تنفيذ العملية بنجاح', transaction: newTx };
  };

  // --- E-WALLETS ---

  const addEWallet = async (companyId: number, employeeId: number, phoneNumber: string, provider: string) => {
    const exists = eWallets.some(w => w.phone_number === phoneNumber && w.is_active);
    if (exists) return { success: false, message: 'رقم المحفظة مسجل مسبقاً' };

    await supabase.from('e_wallets').insert({
        company_id: companyId,
        employee_id: employeeId,
        phone_number: phoneNumber,
        provider,
        balance: 0,
        is_active: true
    });
    await fetchData();
    return { success: true, message: 'تم إضافة المحفظة' };
  };

  const deleteEWallet = async (walletId: number) => {
    await supabase.from('e_wallets').update({ is_active: false }).eq('id', walletId);
    await fetchData();
    showToast('تم حذف المحفظة', 'success');
  };

  const feedEWallet = async (walletId: number, amount: number) => {
    const wallet = eWallets.find(w => w.id === walletId);
    if (!wallet) return { success: false, message: 'المحفظة غير موجودة' };
    
    const treasury = treasuries.find(t => t.company_id === wallet.company_id && !t.employee_id);
    if (!treasury) return { success: false, message: 'الخزينة الرئيسية غير موجودة' };

    if (treasury.egp_balance < amount) return { success: false, message: 'رصيد الخزينة غير كافي' };

    await supabase.from('treasuries').update({ egp_balance: treasury.egp_balance - amount }).eq('id', treasury.id);
    await supabase.from('e_wallets').update({ balance: wallet.balance + amount }).eq('id', walletId);
    
    await supabase.from('transactions').insert({
        company_id: wallet.company_id,
        type: 'wallet_feed',
        from_amount: amount,
        from_currency: 'EGP',
        wallet_id: walletId,
        description: `تغذية محفظة ${wallet.phone_number}`,
        created_at: new Date().toISOString()
    });

    await fetchData();
    return { success: true, message: 'تمت التغذية بنجاح' };
  };

  const performEWalletTransfer = async (
    walletId: number,
    type: 'withdraw' | 'deposit' | 'exchange',
    amount: number,
    phone: string,
    receipt: string
  ) => {
    const wallet = eWallets.find(w => w.id === walletId);
    if (!wallet) return { success: false, message: 'المحفظة غير موجودة' };

    const rate = exchangeRates.find(r => r.company_id === wallet.company_id);
    if (!rate) return { success: false, message: 'أسعار الصرف غير محددة' };

    const empTreasury = treasuries.find(t => t.employee_id === wallet.employee_id);
    if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };

    const commissionRate = rate.ewallet_commission || 0;
    
    // Logic Implementation based on requirements:
    
    let description = '';
    let commissionAmount = 0;
    let currency = 'EGP';

    try {
        if (type === 'withdraw') {
            // "Lo sa7b (Withdraw)": Deduct from Wallet (Vodafone) -> Add to Employee Treasury (EGP) + Commission
            // Input: Amount (EGP) to be sent from wallet
            commissionAmount = amount * (commissionRate / 100);
            
            if (wallet.balance < amount) return { success: false, message: 'رصيد المحفظة غير كافي' };
            
            await supabase.from('e_wallets').update({ balance: wallet.balance - amount }).eq('id', walletId);
            await supabase.from('treasuries').update({ 
                egp_balance: empTreasury.egp_balance + amount + commissionAmount 
            }).eq('id', empTreasury.id);

            description = `سحب ${wallet.provider} (إرسال) للرقم ${phone}`;
            currency = 'EGP';

        } else if (type === 'deposit') {
            // "Lo Edaa (Deposit)": Deduct from Employee Treasury (EGP) -> Add Commission -> Add to Wallet
            // Input: Amount (EGP) to be added to wallet
            
            commissionAmount = amount * (commissionRate / 100);
            
            if (empTreasury.egp_balance < amount) return { success: false, message: 'رصيد الخزينة (النقدية) غير كافي' };

            await supabase.from('treasuries').update({
                egp_balance: empTreasury.egp_balance - amount + commissionAmount
            }).eq('id', empTreasury.id);
            
            await supabase.from('e_wallets').update({ balance: wallet.balance + amount }).eq('id', walletId);

            description = `إيداع ${wallet.provider} (استلام) من ${phone}`;
            currency = 'EGP';

        } else if (type === 'exchange') {
            // "Lo Sarf (Exchange)": SDG to EGP / Rate.
            // Wallet: Deduct EGP (because we send EGP to customer)
            // Treasury: Add SDG (because customer gives cash SDG)
            // Input: Amount (SDG)
            
            const egpRate = rate.sd_to_eg_rate;
            const egpValue = amount / egpRate;
            commissionAmount = egpValue * (commissionRate / 100);

            if (wallet.balance < egpValue) return { success: false, message: 'رصيد المحفظة (EGP) غير كافي للصرف' };

            await supabase.from('e_wallets').update({ balance: wallet.balance - egpValue }).eq('id', walletId);
            await supabase.from('treasuries').update({
                sdg_balance: empTreasury.sdg_balance + amount
            }).eq('id', empTreasury.id);

            description = `صرف ${amount} سوداني عبر ${wallet.provider}`;
            currency = 'SDG';
        }

        const { data: tx, error } = await supabase.from('transactions').insert({
            company_id: wallet.company_id,
            employee_id: wallet.employee_id,
            type: 'wallet_transfer',
            from_amount: amount,
            from_currency: currency,
            wallet_id: walletId,
            wallet_type: type,
            rate: type === 'exchange' ? rate.sd_to_eg_rate : undefined,
            commission: commissionAmount,
            receipt_number: receipt,
            description,
            created_at: new Date().toISOString()
        }).select().single();

        if (error) {
            console.error("Wallet Transfer Error:", error);
            // Check for specific schema error
            if (error.message.includes('Could not find') && error.message.includes('wallet_id')) {
                 return { 
                     success: false, 
                     message: 'نظام خطأ: قاعدة البيانات غير محدثة. يرجى إبلاغ المدير لتشغيل كود الإصلاح من الإعدادات.' 
                 };
            }
            return { success: false, message: `فشل تسجيل العملية: ${error.message}` };
        }

        await fetchData();
        return { success: true, message: 'تمت العملية بنجاح', transaction: tx };

    } catch (err: any) {
        console.error(err);
        return { success: false, message: `حدث خطأ أثناء التنفيذ: ${err.message || ''}` };
    }
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
      performExchange, recordExpense, deleteTransaction, addMerchant, deleteMerchant, addMerchantEntry, manageTreasury,
      addEWallet, deleteEWallet, feedEWallet, performEWalletTransfer,
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
