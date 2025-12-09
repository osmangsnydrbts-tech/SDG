
export type Role = 'super_admin' | 'admin' | 'employee';
export type Currency = 'EGP' | 'SDG';

export interface Company {
  id: number;
  name: string;
  username: string;
  subscription_end: string;
  is_active: boolean;
  logo?: string; // Base64 string
  phone_numbers?: string;
  footer_message?: string; // New field for shared message footer (address, emails, etc)
}

export interface User {
  id: number;
  username: string;
  password?: string;
  role: Role;
  full_name: string;
  company_id: number | null;
  is_active: boolean;
}

export interface ExchangeRate {
  id: number;
  company_id: number;
  sd_to_eg_rate: number;
  eg_to_sd_rate: number;
  wholesale_rate: number;
  wholesale_threshold: number;
  ewallet_commission: number; // Percentage (e.g., 1 for 1%)
  updated_at: string;
}

export interface Treasury {
  id: number;
  company_id: number;
  employee_id?: number;
  egp_balance: number;
  sdg_balance: number;
}

export interface Merchant {
  id: number;
  company_id: number;
  name: string;
  phone: string;
  egp_balance: number;
  sdg_balance: number;
  is_active: boolean;
}

export interface MerchantEntry {
  id: number;
  merchant_id: number;
  company_id: number;
  entry_type: 'credit' | 'debit';
  currency: Currency;
  amount: number;
  description: string;
  created_at: string;
}

export interface EWallet {
  id: number;
  company_id: number;
  employee_id: number;
  phone_number: string;
  provider: string;
  balance: number; // Current balance in the wallet
  is_active: boolean;
}

export interface Transaction {
  id: number;
  company_id: number;
  employee_id?: number;
  type: 'exchange' | 'e_wallet' | 'treasury_feed' | 'treasury_withdraw' | 'merchant_entry' | 'wallet_feed' | 'wallet_deposit' | 'wallet_withdrawal' | 'expense';
  from_currency?: string;
  to_currency?: string;
  from_amount: number;
  to_amount?: number;
  rate?: number;
  commission?: number;
  receipt_number?: string;
  description?: string;
  created_at: string;
  is_wholesale?: boolean;
  e_wallet_id?: number;
}

export const DEFAULT_SUPER_ADMIN: User = {
  id: 1,
  username: 'Osman',
  password: '2580',
  role: 'super_admin',
  full_name: 'المدير العام',
  company_id: null,
  is_active: true
};
