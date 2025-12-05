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
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  addCompany: (name: string, username: string, password: string, days: number, logo?: string) => Promise<{ success: boolean; message: string }>;
  updateCompany: (id: number, data: Partial<Company> & { password?: string }) => Promise<{ success: boolean; message: string }>;
  renewSubscription: (companyId: number, days: number) => Promise<void>;
  deleteCompany: (companyId: number, permanentDelete?: boolean) => Promise<{ success: boolean; message: string }>;
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
  
  deleteTransaction: (transactionId: number) => Promise<{ success: boolean; message: string }>;

  addMerchant: (companyId: number, name: string, phone: string) => Promise<void>;
  deleteMerchant: (merchantId: number) => Promise<void>;
  addMerchantEntry: (merchantId: number, type: 'credit' | 'debit', currency: 'EGP' | 'SDG', amount: number) => Promise<void>;
  addEWallet: (companyId: number, employeeId: number, phone: string, provider: string) => Promise<void>;
  deleteEWallet: (id: number) => Promise<void>;
  feedEWallet: (walletId: number, amount: number) => Promise<{ success: boolean; message: string }>;
  
  performEWalletTransfer: (
      walletId: number, 
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
      const { data: companiesData } = await supabase.from('companies').select('*').order('id', { ascending: false });
      if (companiesData) setCompanies(companiesData);

      const { data: usersData } = await supabase.from('users').select('*').order('id', { ascending: false });
      if (usersData) setUsers(usersData);

      const { data: treasuriesData } = await supabase.from('treasuries').select('*');
      if (treasuriesData) setTreasuries(treasuriesData);

      const { data: ratesData } = await supabase.from('exchange_rates').select('*');
      if (ratesData) setExchangeRates(ratesData);

      const { data: txData } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (txData) setTransactions(txData);

      const { data: merchData } = await supabase.from('merchants').select('*').order('id', { ascending: false });
      if (merchData) setMerchants(merchData);

      const { data: entriesData } = await supabase.from('merchant_entries').select('*').order('created_at', { ascending: false });
      if (entriesData) setMerchantEntries(entriesData);

      const { data: walletsData } = await supabase.from('e_wallets').select('*').order('id', { ascending: false });
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
          return false;
        }
      }
      setCurrentUser(user);
      showToast(`مرحباً ${user.full_name}`, 'success');
      return true;
    }
    return false;
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

    const { data: company, error: compError } = await supabase.from('companies').insert({
      name,
      username,
      subscription_end: subEnd.toISOString(),
      is_active: true,
      logo
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
      // Handle Username change collision check
      if (data.username) {
        const currentCompany = companies.find(c => c.id === id);
        if (currentCompany && currentCompany.username !== data.username) {
             if (isUsernameTaken(data.username)) return { success: false, message: 'اسم المستخدم الجديد مسجل مسبقاً' };
        }
      }

      const { password, ...companyData } = data;

      const { error } = await supabase.from('companies').update(companyData).eq('id', id);
      if (error) return { success: false, message: error.message };
      
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

  const deleteCompany = async (companyId: number, permanentDelete: boolean = false) => {
    // إذا كان الخيار للحذف النهائي
    if (permanentDelete) {
      try {
        // 1. حذف جميع العمليات المرتبطة بالشركة
        await supabase.from('transactions').delete().eq('company_id', companyId);
        
        // 2. حذف جميع قيود التجار المرتبطة بالشركة
        await supabase.from('merchant_entries').delete().eq('company_id', companyId);
        
        // 3. حذف جميع التجار المرتبطين بالشركة
        await supabase.from('merchants').delete().eq('company_id', companyId);
        
        // 4. حذف جميع المحافظ الإلكترونية المرتبطة بالشركة
        await supabase.from('e_wallets').delete().eq('company_id', companyId);
        
        // 5. حذف أسعار الصرف المرتبطة بالشركة
        await supabase.from('exchange_rates').delete().eq('company_id', companyId);
        
        // 6. حذف جميع الخزائن المرتبطة بالشركة
        await supabase.from('treasuries').delete().eq('company_id', companyId);
        
        // 7. حذف جميع المستخدمين المرتبطين بالشركة
        await supabase.from('users').delete().eq('company_id', companyId);
        
        // 8. أخيراً، حذف الشركة نفسها
        await supabase.from('companies').delete().eq('id', companyId);
        
        await fetchData();
        showToast('تم حذف الشركة نهائياً من النظام', 'success');
        return { success: true, message: 'تم حذف الشركة نهائياً من النظام' };
      } catch (error) {
        console.error('Error during permanent company deletion:', error);
        showToast('حدث خطأ أثناء حذف الشركة', 'error');
        return { success: false, message: 'حدث خطأ أثناء حذف الشركة' };
      }
    } else {
      // الحذف المؤقت (تعطيل فقط)
      await supabase.from('companies').update({ is_active: false }).eq('id', companyId);
      await supabase.from('users').update({ is_active: false }).eq('company_id', companyId);
      await fetchData();
      showToast('تم تعطيل الشركة بنجاح', 'success');
      return { success: true, message: 'تم تعطيل الشركة بنجاح' };
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

    const { data: user, error } = await supabase.from('users').insert({
      username,
      password: pass,
      role: 'employee',
      full_name: fullName,
      company_id: companyId,
      is_active: true
    }).select().single();

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
    return { success: false, message: 'حدث خطأ: ' + (error?.message || '') };
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
    // 1. DUPLICATE CHECK
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

  const deleteTransaction = async (transactionId: number) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.type !== 'exchange') {
        return { success: false, message: 'لا يمكن حذف هذه العملية' };
    }

    const empTreasury = treasuries.find(t => t.employee_id === transaction.employee_id);
    if (!empTreasury) {
        return { success: false, message: 'خزينة الموظف غير موجودة لاسترداد المبلغ' };
    }

    // Reverse logic
    const fromAmount = transaction.from_amount;
    const toAmount = transaction.to_amount || 0;

    if (transaction.from_currency === 'SDG') {
        // Was: Employee got SDG, Gave EGP
        // Reverse: Remove SDG, Add EGP back
        await supabase.from('treasuries').update({
            sdg_balance: empTreasury.sdg_balance - fromAmount,
            egp_balance: empTreasury.egp_balance + toAmount
        }).eq('id', empTreasury.id);
    } else { // EGP -> SDG
        // Was: Employee got EGP, Gave SDG
        // Reverse: Remove EGP, Add SDG back
        await supabase.from('treasuries').update({
            egp_balance: empTreasury.egp_balance - fromAmount,
            sdg_balance: empTreasury.sdg_balance + toAmount
        }).eq('id', empTreasury.id);
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
    const wallet = eWallets.find(w => w.id === walletId);
    if (!wallet) return { success: false, message: 'المحفظة غير موجودة' };

    const mainTreasury = treasuries.find(t => t.company_id === wallet.company_id && !t.employee_id);
    if (!mainTreasury || mainTreasury.egp_balance < amount) {
        return { success: false, message: 'رصيد الخزينة الرئيسية غير كافي' };
    }

    await supabase.from('treasuries').update({
        egp_balance: mainTreasury.egp_balance - amount
    }).eq('id', mainTreasury.id);

    await supabase.from('e_wallets').update({
        balance: wallet.balance + amount
    }).eq('id', walletId);

    await supabase.from('transactions').insert({
        company_id: wallet.company_id,
        type: 'wallet_feed',
        from_amount: amount,
        from_currency: 'EGP',
        description: `تغذية محفظة ${wallet.phone_number}`,
        e_wallet_id: walletId,
        created_at: new Date().toISOString()
    });

    await fetchData();
    showToast('تم تغذية المحفظة بنجاح', 'success');
    return { success: true, message: 'تم تغذية المحفظة بنجاح' };
  };

  const performEWalletTransfer = async (walletId: number, amount: number, recipientPhone: string, receipt: string) => {
      const wallet = eWallets.find(w => w.id === walletId);
      if (!wallet) return { success: false, message: 'Wallet not found' };
      
      const user = users.find(u => u.id === wallet.employee_id);
      if (!user) return { success: false, message: 'User not found' };

      // 1. DUPLICATE CHECK
      if (receipt) {
        const duplicate = transactions.find(t => 
            t.company_id === user.company_id && 
            t.receipt_number === receipt && 
            t.from_amount === amount &&
            t.type === 'e_wallet'
        );
        if (duplicate) {
            return { success: false, message: 'عفواً، العملية مكررة! يوجد إشعار سابق بنفس الرقم والمبلغ.' };
        }
      }

      const rates = exchangeRates.find(r => r.company_id === wallet.company_id);
      const commissionRate = rates?.ewallet_commission || 1; 
      const commission = amount * (commissionRate / 100);

      if (wallet.balance < amount) {
          return { success: false, message: `رصيد المحفظة غير كافي` };
      }

      await supabase.from('e_wallets').update({
          balance: wallet.balance - amount
      }).eq('id', walletId);

      const { data: newTx, error } = await supabase.from('transactions').insert({
          company_id: user.company_id!,
          employee_id: wallet.employee_id,
          type: 'e_wallet',
          from_currency: 'E_WALLET',
          to_currency: 'EGP',
          from_amount: amount,
          to_amount: amount,
          commission: commission,
          receipt_number: receipt,
          description: `To: ${recipientPhone} via ${wallet.provider}`,
          created_at: new Date().toISOString(),
          e_wallet_id: walletId
      }).select().single();

      if (error) return { success: false, message: error.message };

      await fetchData();
      showToast('تم التحويل بنجاح', 'success');
      return { success: true, message: 'تم التحويل بنجاح', transaction: newTx };
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
      performExchange, deleteTransaction, addMerchant, deleteMerchant, addMerchantEntry, addEWallet, deleteEWallet, performEWalletTransfer, manageTreasury, feedEWallet,
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
