
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Company, Treasury, ExchangeRate, Transaction, 
  Merchant, MerchantEntry, EWallet, DEFAULT_SUPER_ADMIN 
} from '../types';

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
  
  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  addCompany: (name: string, username: string, password: string, days: number, logo?: string) => { success: boolean; message: string };
  updateCompany: (id: number, data: Partial<Company>) => { success: boolean; message: string };
  renewSubscription: (companyId: number, days: number) => void;
  deleteCompany: (companyId: number) => void;
  toggleCompanyStatus: (companyId: number) => void; 
  updateExchangeRate: (companyId: number, rates: Partial<ExchangeRate>) => void;
  addEmployee: (companyId: number, fullName: string, username: string, password: string) => { success: boolean; message: string };
  updateEmployee: (userId: number, data: { full_name: string; username: string }) => { success: boolean; message: string };
  updateEmployeePassword: (userId: number, newPass: string) => void;
  deleteEmployee: (userId: number) => void;
  performExchange: (
    employeeId: number, 
    companyId: number, 
    fromCurrency: 'EGP' | 'SDG', 
    amount: number, 
    receipt: string
  ) => { success: boolean; message: string };
  addMerchant: (companyId: number, name: string, phone: string) => void;
  addMerchantEntry: (merchantId: number, type: 'credit' | 'debit', currency: 'EGP' | 'SDG', amount: number) => void;
  addEWallet: (companyId: number, employeeId: number, phone: string, provider: string) => void;
  deleteEWallet: (id: number) => void;
  feedEWallet: (walletId: number, amount: number) => { success: boolean; message: string };
  performEWalletTransfer: (walletId: number, amount: number, recipientPhone: string, receipt: string) => { success: boolean; message: string };
  manageTreasury: (
    type: 'feed' | 'withdraw', 
    target: 'main' | 'employee', 
    companyId: number, 
    currency: 'EGP' | 'SDG', 
    amount: number,
    employeeId?: number
  ) => { success: boolean; message: string };
}

const StoreContext = createContext<StoreData | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State Initialization
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([DEFAULT_SUPER_ADMIN]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [merchantEntries, setMerchantEntries] = useState<MerchantEntry[]>([]);
  const [eWallets, setEWallets] = useState<EWallet[]>([]);

  // Load from LocalStorage
  useEffect(() => {
    const load = (key: string, setter: any, def: any) => {
      const saved = localStorage.getItem(key);
      if (saved) setter(JSON.parse(saved));
      else setter(def);
    };

    load('companies', setCompanies, []);
    load('users', setUsers, [DEFAULT_SUPER_ADMIN]);
    load('treasuries', setTreasuries, []);
    load('exchangeRates', setExchangeRates, []);
    load('transactions', setTransactions, []);
    load('merchants', setMerchants, []);
    load('merchantEntries', setMerchantEntries, []);
    load('eWallets', setEWallets, []);
  }, []);

  // Save to LocalStorage
  useEffect(() => localStorage.setItem('currentUser', JSON.stringify(currentUser)), [currentUser]);
  useEffect(() => localStorage.setItem('companies', JSON.stringify(companies)), [companies]);
  useEffect(() => localStorage.setItem('users', JSON.stringify(users)), [users]);
  useEffect(() => localStorage.setItem('treasuries', JSON.stringify(treasuries)), [treasuries]);
  useEffect(() => localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates)), [exchangeRates]);
  useEffect(() => localStorage.setItem('transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('merchants', JSON.stringify(merchants)), [merchants]);
  useEffect(() => localStorage.setItem('merchantEntries', JSON.stringify(merchantEntries)), [merchantEntries]);
  useEffect(() => localStorage.setItem('eWallets', JSON.stringify(eWallets)), [eWallets]);

  // Check unique username
  const isUsernameTaken = (username: string, excludeId?: number) => {
      return users.some(u => u.username.toLowerCase() === username.toLowerCase() && u.is_active && u.id !== excludeId);
  };

  // Actions
  const login = async (username: string, pass: string) => {
    const user = users.find(u => u.username === username && u.password === pass && u.is_active);
    if (user) {
      if (user.role !== 'super_admin' && user.company_id) {
        const company = companies.find(c => c.id === user.company_id);
        if (!company || !company.is_active || new Date(company.subscription_end) < new Date()) {
          return false;
        }
      }
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const addCompany = (name: string, username: string, pass: string, days: number, logo?: string) => {
    if (isUsernameTaken(username)) {
      return { success: false, message: 'اسم المستخدم مسجل مسبقاً' };
    }

    const newId = companies.length + 1;
    const subEnd = new Date();
    subEnd.setDate(subEnd.getDate() + days);

    const newCompany: Company = {
      id: newId,
      name,
      username,
      subscription_end: subEnd.toISOString(),
      is_active: true,
      logo
    };

    const newAdmin: User = {
      id: users.length + 1,
      username,
      password: pass,
      role: 'admin',
      full_name: `مدير ${name}`,
      company_id: newId,
      is_active: true
    };

    const newTreasury: Treasury = {
      id: treasuries.length + 1,
      company_id: newId,
      egp_balance: 0,
      sdg_balance: 0
    };
    
    const newRates: ExchangeRate = {
        id: exchangeRates.length + 1,
        company_id: newId,
        sd_to_eg_rate: 74.0,
        eg_to_sd_rate: 73.0,
        wholesale_rate: 72.5,
        wholesale_threshold: 30000,
        ewallet_commission: 1.0, // Default 1%
        updated_at: new Date().toISOString()
    };

    setCompanies([...companies, newCompany]);
    setUsers([...users, newAdmin]);
    setTreasuries([...treasuries, newTreasury]);
    setExchangeRates([...exchangeRates, newRates]);
    return { success: true, message: 'تم إضافة الشركة بنجاح' };
  };

  const updateCompany = (id: number, data: Partial<Company>) => {
      // If username is changing, check uniqueness and update the Admin User
      if (data.username) {
          const currentCompany = companies.find(c => c.id === id);
          if (currentCompany && currentCompany.username !== data.username) {
              if (isUsernameTaken(data.username)) {
                  return { success: false, message: 'اسم المستخدم الجديد مسجل مسبقاً' };
              }
              // Update Admin User
              setUsers(prev => prev.map(u => 
                  u.company_id === id && u.role === 'admin' 
                  ? { ...u, username: data.username! } 
                  : u
              ));
          }
      }

      setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      return { success: true, message: 'تم تحديث بيانات الشركة بنجاح' };
  };

  const renewSubscription = (companyId: number, days: number) => {
    setCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        const currentEnd = new Date(c.subscription_end) > new Date() ? new Date(c.subscription_end) : new Date();
        currentEnd.setDate(currentEnd.getDate() + days);
        return { ...c, subscription_end: currentEnd.toISOString() };
      }
      return c;
    }));
  };

  const deleteCompany = (companyId: number) => {
    // Soft delete company and its users
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, is_active: false } : c));
    setUsers(prev => prev.map(u => u.company_id === companyId ? { ...u, is_active: false } : u));
  };

  const toggleCompanyStatus = (companyId: number) => {
    setCompanies(prev => prev.map(c => 
      c.id === companyId ? { ...c, is_active: !c.is_active } : c
    ));
  };

  const updateExchangeRate = (companyId: number, rates: Partial<ExchangeRate>) => {
    setExchangeRates(prev => {
        const existing = prev.find(r => r.company_id === companyId);
        if (existing) {
            return prev.map(r => r.company_id === companyId ? { ...r, ...rates, updated_at: new Date().toISOString() } : r);
        } else {
             return [...prev, {
                id: prev.length + 1,
                company_id: companyId,
                sd_to_eg_rate: 74,
                eg_to_sd_rate: 73,
                wholesale_rate: 72.5,
                wholesale_threshold: 30000,
                ewallet_commission: 1.0,
                updated_at: new Date().toISOString(),
                ...rates
             }];
        }
    });
  };

  const addEmployee = (companyId: number, fullName: string, username: string, pass: string) => {
    if (isUsernameTaken(username)) {
      return { success: false, message: 'اسم المستخدم مسجل مسبقاً' };
    }

    const newUser: User = {
      id: users.length + 1,
      username,
      password: pass,
      role: 'employee',
      full_name: fullName,
      company_id: companyId,
      is_active: true
    };
    
    const newTreasury: Treasury = {
        id: treasuries.length + 1,
        company_id: companyId,
        employee_id: newUser.id,
        egp_balance: 0,
        sdg_balance: 0
    };

    setUsers([...users, newUser]);
    setTreasuries([...treasuries, newTreasury]);
    return { success: true, message: 'تم إضافة الموظف بنجاح' };
  };

  const updateEmployee = (userId: number, data: { full_name: string; username: string }) => {
      const user = users.find(u => u.id === userId);
      if (!user) return { success: false, message: 'الموظف غير موجود' };

      if (user.username !== data.username) {
          if (isUsernameTaken(data.username, userId)) {
              return { success: false, message: 'اسم المستخدم مسجل مسبقاً' };
          }
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
      return { success: true, message: 'تم تحديث بيانات الموظف بنجاح' };
  };

  const updateEmployeePassword = (userId: number, newPass: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPass } : u));
  };

  const deleteEmployee = (userId: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: false } : u));
  };

  const performExchange = (
    employeeId: number, 
    companyId: number, 
    fromCurrency: 'EGP' | 'SDG', 
    amount: number, 
    receipt: string
  ) => {
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
           return { success: false, message: `رصيد المصري (EGP) لديك غير كافي لإعطاء العميل. المطلوب: ${toAmount.toFixed(2)}` };
       }
       
       setTreasuries(prev => prev.map(t => {
           if (t.employee_id === employeeId) {
               return {
                   ...t,
                   sdg_balance: t.sdg_balance + amount,
                   egp_balance: t.egp_balance - toAmount
               };
           }
           return t;
       }));

    } else {
        exchangeRate = rateData.eg_to_sd_rate;
        toAmount = amount * exchangeRate;

        if (empTreasury.sdg_balance < toAmount) {
            return { success: false, message: `رصيد السوداني (SDG) لديك غير كافي لإعطاء العميل. المطلوب: ${toAmount.toFixed(2)}` };
        }

        setTreasuries(prev => prev.map(t => {
            if (t.employee_id === employeeId) {
                return {
                    ...t,
                    egp_balance: t.egp_balance + amount,
                    sdg_balance: t.sdg_balance - toAmount
                };
            }
            return t;
        }));
    }

    const newTx: Transaction = {
        id: transactions.length + 1,
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
    };
    setTransactions(prev => [...prev, newTx]);

    return { success: true, message: 'تمت العملية بنجاح' };
  };

  const addMerchant = (companyId: number, name: string, phone: string) => {
    setMerchants([...merchants, {
        id: merchants.length + 1,
        company_id: companyId,
        name,
        phone,
        egp_balance: 0,
        sdg_balance: 0,
        is_active: true
    }]);
  };

  const addMerchantEntry = (merchantId: number, type: 'credit' | 'debit', currency: 'EGP' | 'SDG', amount: number) => {
      setMerchants(prev => prev.map(m => {
          if (m.id === merchantId) {
              const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
              const change = type === 'credit' ? amount : -amount;
              return { ...m, [balanceKey]: m[balanceKey] + change };
          }
          return m;
      }));

      const merchant = merchants.find(m => m.id === merchantId);
      if(merchant) {
          setMerchantEntries([...merchantEntries, {
              id: merchantEntries.length + 1,
              merchant_id: merchantId,
              company_id: merchant.company_id,
              entry_type: type,
              currency,
              amount,
              description: `قيد ${type === 'credit' ? 'له' : 'عليه'}`,
              created_at: new Date().toISOString()
          }]);
      }
  };

  const addEWallet = (companyId: number, employeeId: number, phone: string, provider: string) => {
      setEWallets([...eWallets, {
          id: eWallets.length + 1,
          company_id: companyId,
          employee_id: employeeId,
          phone_number: phone,
          provider,
          balance: 0,
          is_active: true
      }]);
  };

  const deleteEWallet = (id: number) => {
      setEWallets(prev => prev.map(w => w.id === id ? { ...w, is_active: false } : w));
  };

  const feedEWallet = (walletId: number, amount: number) => {
    const wallet = eWallets.find(w => w.id === walletId);
    if (!wallet) return { success: false, message: 'المحفظة غير موجودة' };

    const mainTreasury = treasuries.find(t => t.company_id === wallet.company_id && !t.employee_id);
    if (!mainTreasury || mainTreasury.egp_balance < amount) {
        return { success: false, message: 'رصيد الخزينة الرئيسية (EGP) غير كافي' };
    }

    // Deduct from Main Treasury
    setTreasuries(prev => prev.map(t => {
        if (t.id === mainTreasury.id) {
            return { ...t, egp_balance: t.egp_balance - amount };
        }
        return t;
    }));

    // Add to Wallet
    setEWallets(prev => prev.map(w => {
        if (w.id === walletId) {
            return { ...w, balance: w.balance + amount };
        }
        return w;
    }));

    setTransactions(prev => [...prev, {
        id: prev.length + 1,
        company_id: wallet.company_id,
        type: 'wallet_feed',
        from_amount: amount,
        from_currency: 'EGP',
        description: `تغذية محفظة ${wallet.phone_number}`,
        e_wallet_id: walletId,
        created_at: new Date().toISOString()
    }]);

    return { success: true, message: 'تم تغذية المحفظة بنجاح' };
  };

  const performEWalletTransfer = (walletId: number, amount: number, recipientPhone: string, receipt: string) => {
      const wallet = eWallets.find(w => w.id === walletId);
      if (!wallet) return { success: false, message: 'Wallet not found' };
      
      const user = users.find(u => u.id === wallet.employee_id);
      if (!user) return { success: false, message: 'User not found' };

      const rates = exchangeRates.find(r => r.company_id === wallet.company_id);
      const commissionRate = rates?.ewallet_commission || 1; // Default to 1% if missing
      const commission = amount * (commissionRate / 100);

      // Check Wallet Balance
      if (wallet.balance < amount) {
          return { success: false, message: `رصيد المحفظة (${wallet.balance} EGP) غير كافي` };
      }

      setEWallets(prev => prev.map(w => {
          if (w.id === walletId) {
              return { ...w, balance: w.balance - amount };
          }
          return w;
      }));

      setTransactions(prev => [...prev, {
          id: prev.length + 1,
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
      }]);

      return { success: true, message: 'تم التحويل بنجاح' };
  };

  const manageTreasury = (
    type: 'feed' | 'withdraw', 
    target: 'main' | 'employee', 
    companyId: number, 
    currency: 'EGP' | 'SDG', 
    amount: number,
    employeeId?: number
  ) => {
      const balanceKey = currency === 'EGP' ? 'egp_balance' : 'sdg_balance';
      const mainTreasury = treasuries.find(t => t.company_id === companyId && !t.employee_id);

      // Validation for feeding Employee from Main Treasury
      if (type === 'feed' && target === 'employee') {
          if (!mainTreasury) {
            return { success: false, message: 'الخزينة الرئيسية غير موجودة' };
          }
          if (mainTreasury[balanceKey] < amount) {
              return { success: false, message: `رصيد الخزينة الرئيسية (${mainTreasury[balanceKey].toLocaleString()} ${currency}) غير كافي.` };
          }
      }

      setTreasuries(prev => prev.map(t => {
          const isMain = t.company_id === companyId && !t.employee_id;
          const isTargetEmployee = target === 'employee' && t.employee_id === employeeId;

          // Logic:
          // Feed Employee = Withdraw from Main -> Add to Employee
          // Withdraw Employee = Withdraw from Employee -> Add to Main
          // Feed Main = External -> Add to Main
          // Withdraw Main = Withdraw from Main -> External

          if (type === 'feed' && target === 'employee') {
              if (isMain) return { ...t, [balanceKey]: t[balanceKey] - amount };
              if (isTargetEmployee) return { ...t, [balanceKey]: t[balanceKey] + amount };
          }
          else if (type === 'withdraw' && target === 'employee') {
             if (isTargetEmployee) return { ...t, [balanceKey]: t[balanceKey] - amount };
             if (isMain) return { ...t, [balanceKey]: t[balanceKey] + amount };
          }
          else if (type === 'feed' && target === 'main' && isMain) {
               return { ...t, [balanceKey]: t[balanceKey] + amount };
          }
          else if (type === 'withdraw' && target === 'main' && isMain) {
              if (t[balanceKey] < amount) return t; // Validation handled in UI but safety check
              return { ...t, [balanceKey]: t[balanceKey] - amount };
          }

          return t;
      }));
      
      let desc = '';
      if (target === 'employee' && type === 'feed') desc = 'تحويل من الخزينة الرئيسية إلى موظف';
      else if (target === 'employee' && type === 'withdraw') desc = 'استرداد من موظف إلى الخزينة الرئيسية';
      else if (target === 'main' && type === 'feed') desc = 'إيداع خارجي للخزينة الرئيسية';
      else desc = 'سحب خارجي من الخزينة الرئيسية';

      setTransactions(prev => [...prev, {
          id: prev.length + 1,
          company_id: companyId,
          employee_id: target === 'employee' ? employeeId : undefined,
          type: type === 'feed' ? 'treasury_feed' : 'treasury_withdraw',
          from_amount: amount,
          from_currency: currency,
          description: desc,
          created_at: new Date().toISOString()
      }]);

      return { success: true, message: 'تم تنفيذ العملية بنجاح' };
  };

  return (
    <StoreContext.Provider value={{
      currentUser, companies, users, treasuries, exchangeRates, transactions, merchants, merchantEntries, eWallets,
      login, logout, addCompany, updateCompany, renewSubscription, deleteCompany, toggleCompanyStatus, updateExchangeRate, 
      addEmployee, updateEmployee, updateEmployeePassword, deleteEmployee,
      performExchange, addMerchant, addMerchantEntry, addEWallet, deleteEWallet, performEWalletTransfer, manageTreasury, feedEWallet
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
