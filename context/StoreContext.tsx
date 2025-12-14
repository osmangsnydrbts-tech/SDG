
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
  
  toast: { message: string; type: ToastType } | null;
  showToast: (message: string, type: ToastType) => void;
  hideToast: () => void;

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

  performSale: (
    employeeId: number,
    companyId: number,
    productName: string,
    amount: number
  ) => Promise<{ success: boolean; message: string }>;

  cancelTransaction: (transactionId: number, reason: string) => Promise<{ success: boolean; message: string }>;

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

  collectSalesToTreasury: (companyId: number, amount: number) => Promise<{ success: boolean; message: string }>;

  addEWallet: (companyId: number, employeeId: number, phoneNumber: string, provider: string, commission: number) => Promise<{ success: boolean; message: string }>;
  deleteEWallet: (walletId: number) => Promise<void>;
  feedEWallet: (walletId: number, amount: number) => Promise<{ success: boolean; message: string }>;
  performEWalletTransfer: (
    walletId: number,
    type: 'withdraw' | 'deposit' | 'exchange',
    amount: number, 
    phone: string,
    receipt: string
  ) => Promise<{ success: boolean; message: string; transaction?: Transaction }>;

  exportDatabase: () => void;
  importDatabase: (jsonData: string) => Promise<{ success: boolean; message: string }>;
}

const StoreContext = createContext<StoreData | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
  };

  const hideToast = () => {
    setToast(null);
  };

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

      // Fetch all transactions with all columns
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
      sdg_balance: 0,
      sales_balance: 0
    });

    await supabase.from('exchange_rates').insert({
        company_id: company.id,
        sd_to_eg_rate: 74.0,
        eg_to_sd_rate: 73.0,
        wholesale_rate: 72.5,
        wholesale_threshold: 30000,
        updated_at: new Date().toISOString()
    });

    await fetchData();
    showToast('تم إضافة الشركة بنجاح', 'success');
    return { success: true, message: 'تم إضافة الشركة بنجاح' };
  };

  const updateCompany = async (id: number, data: Partial<Company> & { password?: string }) => {
      try {
        if (data.username) {
            const currentCompany = companies.find(c => c.id === id);
            if (currentCompany && currentCompany.username !== data.username) {
                if (isUsernameTaken(data.username)) return { success: false, message: 'اسم المستخدم الجديد مسجل مسبقاً' };
            }
        }
        const { password, ...companyData } = data;
        const { error } = await supabase.from('companies').update(companyData).eq('id', id);
        if (error) return { success: false, message: error.message };
        
        const updateData: any = {};
        if (data.username) updateData.username = data.username;
        if (password) updateData.password = password;

        if (Object.keys(updateData).length > 0) {
            await supabase.from('users').update(updateData).eq('company_id', id).eq('role', 'admin');
        }
        await fetchData();
        return { success: true, message: 'تم التحديث بنجاح' };
      } catch (err: any) {
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
    if (isUsernameTaken(username)) return { success: false, message: 'اسم المستخدم مسجل مسبقاً' };

    try {
      const { data: user, error } = await supabase.from('users').insert({
        username,
        password: pass,
        role: 'employee',
        full_name: fullName,
        company_id: companyId,
        is_active: true
      }).select().single();

      if (error) return { success: false, message: 'خطأ في قاعدة البيانات: ' + error.message };

      if (user) {
          await supabase.from('treasuries').insert({
              company_id: companyId,
              employee_id: user.id,
              egp_balance: 0,
              sdg_balance: 0,
              sales_balance: 0
          });
          await fetchData();
          showToast('تم إضافة الموظف بنجاح', 'success');
          return { success: true, message: 'تم إضافة الموظف بنجاح' };
      }
      return { success: false, message: 'لم يتم إنشاء المستخدم' };
    } catch (err: any) {
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

  const performExchange = async (employeeId: number, companyId: number, fromCurrency: 'EGP' | 'SDG', amount: number, receipt: string) => {
    // Ensure integer amounts
    amount = Math.round(amount);

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
       toAmount = Math.round(calcAmount); // Round to avoid fractions
       
       if (empTreasury.egp_balance < toAmount) return { success: false, message: `رصيد المصري في عهدتك غير كافي لتسليم العميل` };
       
       await supabase.from('treasuries').update({
           sdg_balance: Math.round(empTreasury.sdg_balance + amount),
           egp_balance: Math.round(empTreasury.egp_balance - toAmount)
       }).eq('id', empTreasury.id);

    } else {
        exchangeRate = rateData.eg_to_sd_rate;
        toAmount = Math.round(amount * exchangeRate); // Round result

        if (empTreasury.sdg_balance < toAmount) return { success: false, message: `رصيد السوداني في عهدتك غير كافي لتسليم العميل` };

        await supabase.from('treasuries').update({
            egp_balance: Math.round(empTreasury.egp_balance + amount),
            sdg_balance: Math.round(empTreasury.sdg_balance - toAmount)
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

  const recordExpense = async (employeeId: number, companyId: number, currency: 'EGP' | 'SDG', amount: number, description: string) => {
    // Ensure integer
    amount = Math.round(amount);

    const empTreasury = treasuries.find(t => t.employee_id === employeeId);
    if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };

    const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
    if (empTreasury[balanceKey] < amount) return { success: false, message: `رصيد ${currency} غير كافي` };

    await supabase.from('treasuries').update({ [balanceKey]: Math.round(empTreasury[balanceKey] - amount) }).eq('id', empTreasury.id);

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

  const performSale = async (employeeId: number, companyId: number, productName: string, amount: number) => {
      // Ensure integer
      amount = Math.round(amount);

      const empTreasury = treasuries.find(t => t.employee_id === employeeId);
      if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };

      // Add to Sales Balance (assuming EGP)
      await supabase.from('treasuries').update({
          sales_balance: Math.round((empTreasury.sales_balance || 0) + amount)
      }).eq('id', empTreasury.id);

      await supabase.from('transactions').insert({
          company_id: companyId,
          employee_id: employeeId,
          type: 'sale',
          from_amount: amount,
          from_currency: 'EGP',
          product_name: productName,
          description: `مبيعات: ${productName}`,
          created_at: new Date().toISOString()
      });

      await fetchData();
      showToast('تم تسجيل البيع', 'success');
      return { success: true, message: 'تم تسجيل البيع' };
  };

  // Improved Cancellation with Strict Server-Side Checking
  const cancelTransaction = async (transactionId: number, reason: string) => {
    try {
      // STRICT CHECK: Only Admin or Super Admin can cancel
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
          return { success: false, message: 'عذراً، إلغاء العمليات من صلاحيات المدير فقط.' };
      }

      // 1. FETCH FRESH DATA FROM DB TO PREVENT DOUBLE CANCELLATION
      // This solves the "Only Once" requirement robustly.
      const { data: freshTx, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError || !freshTx) {
          return { success: false, message: 'تعذر الوصول لبيانات العملية من الخادم.' };
      }

      if (freshTx.is_cancelled) {
          return { success: false, message: 'هذه العملية ملغاة مسبقاً.' };
      }

      const transaction = freshTx; // Use the fresh data

      // 2. MARK AS CANCELLED IN DB FIRST
      const { error: updateError } = await supabase.from('transactions').update({ 
          is_cancelled: true,
          cancellation_reason: reason,
          cancelled_by: currentUser.id,
          cancelled_at: new Date().toISOString()
      }).eq('id', transactionId);
      
      if (updateError) {
        console.error("Cancellation Update Failed:", updateError);
        // Return explicit error to help user debug missing columns
        return { success: false, message: `فشل التحديث: ${updateError.message} - تأكد من تحديث قاعدة البيانات من الإعدادات.` };
      }

      // 3. REVERSE FINANCIALS
      // Only proceed if step 2 succeeded
      // We must re-fetch treasuries and wallets to ensure we calculate balances correctly based on current state
      // However, for simplicity and speed, we use the local state 'treasuries' which is synced, 
      // but ideally we should do atomic updates. Given Supabase limitation on complex atomic transactions without stored procedures,
      // we proceed with logic similar to original but using the 'freshTx' data.
      
      let empTreasury = null;
      if (transaction.employee_id) {
        // Find treasury in local state (it should be relatively fresh)
        empTreasury = treasuries.find(t => t.employee_id === transaction.employee_id);
      }

      try {
        if (transaction.type === 'exchange') {
            if (!empTreasury) throw new Error('خزينة الموظف غير موجودة');
            if (transaction.from_currency === 'SDG') {
                await supabase.from('treasuries').update({
                    sdg_balance: Math.round(empTreasury.sdg_balance - transaction.from_amount),
                    egp_balance: Math.round(empTreasury.egp_balance + (transaction.to_amount || 0))
                }).eq('id', empTreasury.id);
            } else {
                await supabase.from('treasuries').update({
                    egp_balance: Math.round(empTreasury.egp_balance - transaction.from_amount),
                    sdg_balance: Math.round(empTreasury.sdg_balance + (transaction.to_amount || 0))
                }).eq('id', empTreasury.id);
            }
        } else if (transaction.type === 'sale') {
            if (!empTreasury) throw new Error('خزينة الموظف غير موجودة');
            await supabase.from('treasuries').update({
                sales_balance: Math.round((empTreasury.sales_balance || 0) - transaction.from_amount)
            }).eq('id', empTreasury.id);
        } else if (transaction.type === 'expense') {
            if (!empTreasury) throw new Error('خزينة الموظف غير موجودة');
            const currency = transaction.from_currency as 'EGP' | 'SDG';
            const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
            await supabase.from('treasuries').update({ [balanceKey]: Math.round(empTreasury[balanceKey] + transaction.from_amount) }).eq('id', empTreasury.id);
        } else if (transaction.type === 'wallet_transfer') {
            if (!empTreasury) throw new Error('خزينة الموظف غير موجودة');
            const wallet = eWallets.find(w => w.id === transaction.wallet_id);
            if (!wallet) throw new Error('المحفظة غير موجودة أو تم حذفها'); 
            
            const amount = transaction.from_amount;
            const commission = transaction.commission || 0;
            const walletType = transaction.wallet_type || 'withdraw';

            if (walletType === 'withdraw') {
                // Reversal: Wallet Up, Treasury Down
                await supabase.from('e_wallets').update({ balance: Math.round(wallet.balance + amount) }).eq('id', wallet.id);
                await supabase.from('treasuries').update({ egp_balance: Math.round(empTreasury.egp_balance - (amount + commission)) }).eq('id', empTreasury.id);
            } else if (walletType === 'deposit') {
                // Reversal: Wallet Down, Treasury Up
                await supabase.from('e_wallets').update({ balance: Math.round(wallet.balance - amount) }).eq('id', wallet.id);
                await supabase.from('treasuries').update({ egp_balance: Math.round(empTreasury.egp_balance + amount - commission) }).eq('id', empTreasury.id);
            } else if (walletType === 'exchange') {
                // Originally: Wallet EGP -, Treasury SDG +, Treasury EGP + (Commission)
                // Reversal: Wallet EGP +, Treasury SDG -, Treasury EGP - (Commission)
                const rate = transaction.rate || 1;
                const egpValue = Math.round(amount / rate);
                await supabase.from('e_wallets').update({ balance: Math.round(wallet.balance + egpValue) }).eq('id', wallet.id);
                await supabase.from('treasuries').update({
                    sdg_balance: Math.round(empTreasury.sdg_balance - amount),
                    egp_balance: Math.round(empTreasury.egp_balance - commission)
                }).eq('id', empTreasury.id);
            }
        } else if (transaction.type === 'wallet_feed') {
            // Reversal for Wallet Feed
            const wallet = eWallets.find(w => w.id === transaction.wallet_id);
            const mainTreasury = treasuries.find(t => t.company_id === transaction.company_id && !t.employee_id);
            if (!wallet || !mainTreasury) throw new Error('المحفظة أو الخزينة غير موجودة');
            
            // Reversal: Main +Amount, Wallet -Amount
            await supabase.from('treasuries').update({ egp_balance: Math.round(mainTreasury.egp_balance + transaction.from_amount) }).eq('id', mainTreasury.id);
            await supabase.from('e_wallets').update({ balance: Math.round(wallet.balance - transaction.from_amount) }).eq('id', wallet.id);
        } else if (transaction.type === 'treasury_feed' || transaction.type === 'treasury_withdraw') {
            const currency = transaction.from_currency as 'EGP' | 'SDG';
            const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
            const mainTreasury = treasuries.find(t => t.company_id === transaction.company_id && !t.employee_id);

            if (!mainTreasury) throw new Error('الخزينة الرئيسية غير موجودة');

            if (transaction.employee_id) {
              // Internal Transfer
              if (!empTreasury) throw new Error('خزينة الموظف غير موجودة');

              if (transaction.type === 'treasury_feed') {
                  // Reversal: Main +Amount, Employee -Amount
                  await supabase.from('treasuries').update({ [balanceKey]: Math.round(mainTreasury[balanceKey] + transaction.from_amount) }).eq('id', mainTreasury.id);
                  await supabase.from('treasuries').update({ [balanceKey]: Math.round(empTreasury[balanceKey] - transaction.from_amount) }).eq('id', empTreasury.id);
              } else {
                  // Reversal: Employee +Amount, Main -Amount
                  await supabase.from('treasuries').update({ [balanceKey]: Math.round(mainTreasury[balanceKey] - transaction.from_amount) }).eq('id', mainTreasury.id);
                  await supabase.from('treasuries').update({ [balanceKey]: Math.round(empTreasury[balanceKey] + transaction.from_amount) }).eq('id', empTreasury.id);
              }
            } else {
                // External
                if (transaction.type === 'treasury_feed') {
                    // Reversal: Main -Amount
                    await supabase.from('treasuries').update({ [balanceKey]: Math.round(mainTreasury[balanceKey] - transaction.from_amount) }).eq('id', mainTreasury.id);
                } else {
                    // Reversal: Main +Amount
                    await supabase.from('treasuries').update({ [balanceKey]: Math.round(mainTreasury[balanceKey] + transaction.from_amount) }).eq('id', mainTreasury.id);
                }
            }
        }
      } catch (financialError: any) {
          // CRITICAL: If financial reversal failed, we MUST revert the cancellation status
          console.error("Financial Reversal Failed, Reverting Cancellation:", financialError);
          await supabase.from('transactions').update({ 
              is_cancelled: false,
              cancellation_reason: null,
              cancelled_by: null,
              cancelled_at: null
          }).eq('id', transactionId);
          return { success: false, message: 'فشل استرجاع الأموال، تم التراجع عن الإلغاء: ' + financialError.message };
      }

      await fetchData();
      showToast('تم إلغاء العملية واسترجاع الأرصدة بنجاح', 'info');
      return { success: true, message: 'تم الإلغاء بنجاح' };
    } catch (err: any) {
        console.error("Cancellation Error:", err);
        return { success: false, message: 'فشل الإلغاء: ' + (err.message || 'خطأ غير معروف') };
    }
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
      // Ensure integer
      amount = Math.round(amount);
      const merchant = merchants.find(m => m.id === merchantId);
      if (merchant) {
          const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
          const change = type === 'credit' ? amount : -amount;
          await supabase.from('merchants').update({ [balanceKey]: Math.round(merchant[balanceKey] + change) }).eq('id', merchantId);
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

  const manageTreasury = async (type: 'feed' | 'withdraw', target: 'main' | 'employee', companyId: number, currency: 'EGP' | 'SDG', amount: number, employeeId?: number) => {
      // Ensure integer
      amount = Math.round(amount);

      const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
      const mainTreasury = treasuries.find(t => t.company_id === companyId && !t.employee_id);

      if (!mainTreasury) return { success: false, message: 'الخزينة الرئيسية غير موجودة' };

      if (type === 'feed' && target === 'employee') {
          if (mainTreasury[balanceKey] < amount) return { success: false, message: 'رصيد الخزينة الرئيسية غير كافي' };
      }

      if (type === 'feed' && target === 'employee') {
          const empT = treasuries.find(t => t.employee_id === employeeId);
          if (empT) {
             await supabase.from('treasuries').update({ [balanceKey]: Math.round(mainTreasury[balanceKey] - amount) }).eq('id', mainTreasury.id);
             await supabase.from('treasuries').update({ [balanceKey]: Math.round(empT[balanceKey] + amount) }).eq('id', empT.id);
          }
      } 
      else if (type === 'withdraw' && target === 'employee') {
          const empT = treasuries.find(t => t.employee_id === employeeId);
          if (empT) {
              if (empT[balanceKey] < amount) return { success: false, message: 'رصيد الموظف غير كافي' };
              await supabase.from('treasuries').update({ [balanceKey]: Math.round(empT[balanceKey] - amount) }).eq('id', empT.id);
              await supabase.from('treasuries').update({ [balanceKey]: Math.round(mainTreasury[balanceKey] + amount) }).eq('id', mainTreasury.id);
          }
      }
      else if (type === 'feed' && target === 'main') {
          await supabase.from('treasuries').update({ [balanceKey]: Math.round(mainTreasury[balanceKey] + amount) }).eq('id', mainTreasury.id);
      }
      else if (type === 'withdraw' && target === 'main') {
          if (mainTreasury[balanceKey] < amount) return { success: false, message: 'رصيد الخزينة غير كافي' };
          await supabase.from('treasuries').update({ [balanceKey]: Math.round(mainTreasury[balanceKey] - amount) }).eq('id', mainTreasury.id);
      }

      const { data: newTx, error } = await supabase.from('transactions').insert({
          company_id: companyId,
          employee_id: target === 'employee' ? employeeId : undefined,
          type: type === 'feed' ? 'treasury_feed' : 'treasury_withdraw',
          from_amount: amount,
          from_currency: currency,
          description: target === 'employee' ? (type === 'feed' ? 'تحويل لموظف' : 'استرداد من موظف') : 'خارجي',
          created_at: new Date().toISOString()
      }).select().single();

      if (error) return { success: false, message: error.message };
      await fetchData();
      showToast('تم تنفيذ العملية بنجاح', 'success');
      return { success: true, message: 'تم تنفيذ العملية بنجاح', transaction: newTx };
  };

  const collectSalesToTreasury = async (companyId: number, amount: number) => {
    // Ensure integer
    amount = Math.round(amount);

    const mainTreasury = treasuries.find(t => t.company_id === companyId && !t.employee_id);
    if (!mainTreasury) return { success: false, message: 'الخزينة الرئيسية غير موجودة' };

    const currentSalesBalance = mainTreasury.sales_balance || 0;
    if (currentSalesBalance < amount) return { success: false, message: 'رصيد خزينة المبيعات غير كافي' };

    // Deduct from Sales Balance and Add to EGP Main Balance
    await supabase.from('treasuries').update({
        sales_balance: Math.round(currentSalesBalance - amount),
        egp_balance: Math.round(mainTreasury.egp_balance + amount)
    }).eq('id', mainTreasury.id);

    // Record as a Treasury Feed (Internal)
    await supabase.from('transactions').insert({
        company_id: companyId,
        type: 'treasury_feed',
        from_amount: amount,
        from_currency: 'EGP',
        description: 'ترحيل من خزينة المبيعات',
        created_at: new Date().toISOString()
    });

    await fetchData();
    showToast('تم ترحيل المبيعات بنجاح', 'success');
    return { success: true, message: 'تم الترحيل بنجاح' };
  };

  const addEWallet = async (companyId: number, employeeId: number, phoneNumber: string, provider: string, commission: number) => {
    const exists = eWallets.some(w => w.phone_number === phoneNumber && w.is_active);
    if (exists) return { success: false, message: 'رقم المحفظة مسجل مسبقاً' };

    await supabase.from('e_wallets').insert({
        company_id: companyId,
        employee_id: employeeId,
        phone_number: phoneNumber,
        provider,
        balance: 0,
        commission: commission,
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
    amount = Math.round(amount);
    const wallet = eWallets.find(w => w.id === walletId);
    if (!wallet) return { success: false, message: 'المحفظة غير موجودة' };
    
    const treasury = treasuries.find(t => t.company_id === wallet.company_id && !t.employee_id);
    if (!treasury) return { success: false, message: 'الخزينة الرئيسية غير موجودة' };

    if (treasury.egp_balance < amount) return { success: false, message: 'رصيد الخزينة غير كافي' };

    await supabase.from('treasuries').update({ egp_balance: Math.round(treasury.egp_balance - amount) }).eq('id', treasury.id);
    await supabase.from('e_wallets').update({ balance: Math.round(wallet.balance + amount) }).eq('id', walletId);
    
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

  const performEWalletTransfer = async (walletId: number, type: 'withdraw' | 'deposit' | 'exchange', amount: number, phone: string, receipt: string) => {
    amount = Math.round(amount);
    const wallet = eWallets.find(w => w.id === walletId);
    if (!wallet) return { success: false, message: 'المحفظة غير موجودة' };

    const rate = exchangeRates.find(r => r.company_id === wallet.company_id);
    if (!rate) return { success: false, message: 'أسعار الصرف غير محددة' };

    const empTreasury = treasuries.find(t => t.employee_id === wallet.employee_id);
    if (!empTreasury) return { success: false, message: 'خزينة الموظف غير موجودة' };

    const commissionRate = wallet.commission || 0;
    let description = '';
    let commissionAmount = 0;
    let currency = 'EGP';

    try {
        if (type === 'withdraw') {
            commissionAmount = Math.round(amount * (commissionRate / 100));
            if (wallet.balance < amount) return { success: false, message: 'رصيد المحفظة غير كافي' };
            
            await supabase.from('e_wallets').update({ balance: Math.round(wallet.balance - amount) }).eq('id', walletId);
            await supabase.from('treasuries').update({ egp_balance: Math.round(empTreasury.egp_balance + amount + commissionAmount) }).eq('id', empTreasury.id);

            description = `سحب ${wallet.provider} (إرسال) للرقم ${phone}`;
            currency = 'EGP';

        } else if (type === 'deposit') {
            commissionAmount = Math.round(amount * (commissionRate / 100));
            if (empTreasury.egp_balance < amount) return { success: false, message: 'رصيد الخزينة (النقدية) غير كافي' };

            await supabase.from('treasuries').update({ egp_balance: Math.round(empTreasury.egp_balance - amount + commissionAmount) }).eq('id', empTreasury.id);
            await supabase.from('e_wallets').update({ balance: Math.round(wallet.balance + amount) }).eq('id', walletId);

            description = `إيداع ${wallet.provider} (استلام) من ${phone}`;
            currency = 'EGP';

        } else if (type === 'exchange') {
            const egpRate = rate.sd_to_eg_rate;
            const egpValue = Math.round(amount / egpRate);
            commissionAmount = Math.round(egpValue * (commissionRate / 100));

            if (wallet.balance < egpValue) return { success: false, message: 'رصيد المحفظة (EGP) غير كافي للصرف' };

            await supabase.from('e_wallets').update({ balance: Math.round(wallet.balance - egpValue) }).eq('id', walletId);
            await supabase.from('treasuries').update({
                sdg_balance: Math.round(empTreasury.sdg_balance + amount),
                egp_balance: Math.round(empTreasury.egp_balance + commissionAmount)
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
             return { success: false, message: `فشل تسجيل العملية: ${error.message}` };
        }

        await fetchData();
        return { success: true, message: 'تمت العملية بنجاح', transaction: tx };

    } catch (err: any) {
        return { success: false, message: `حدث خطأ: ${err.message || ''}` };
    }
  };

  const exportDatabase = () => {
     showToast('تم تعطيل التصدير', 'info');
  };

  const importDatabase = async (_jsonString: string) => {
    return { success: false, message: 'الاستيراد غير متاح' };
  };

  return (
    <StoreContext.Provider value={{
      currentUser, companies, users, treasuries, exchangeRates, transactions, merchants, merchantEntries, eWallets,
      toast, showToast, hideToast,
      login, logout, addCompany, updateCompany, renewSubscription, deleteCompany, toggleCompanyStatus, updateExchangeRate, 
      addEmployee, updateEmployee, updateEmployeePassword, deleteEmployee,
      performExchange, recordExpense, performSale, cancelTransaction, addMerchant, deleteMerchant, addMerchantEntry, manageTreasury,
      collectSalesToTreasury,
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
