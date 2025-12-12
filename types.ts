
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
  footer_message?: string;
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
  updated_at: string;
}

export interface Treasury {
  id: number;
  company_id: number;
  employee_id?: number;
  egp_balance: number;
  sdg_balance: number;
  sales_balance: number; // New separate treasury for sales
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
  provider: string; // Vodafone, InstaPay, etc.
  balance: number;
  commission: number; // Commission percentage per wallet
  is_active: boolean;
}

export interface Transaction {
  id: number;
  company_id: number;
  employee_id?: number;
  type: 'exchange' | 'treasury_feed' | 'treasury_withdraw' | 'merchant_entry' | 'expense' | 'wallet_feed' | 'wallet_transfer' | 'sale';
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
  wallet_id?: number;
  wallet_type?: 'withdraw' | 'deposit' | 'exchange';
  product_name?: string; // For sales
  is_cancelled?: boolean; // New flag for cancellation
  cancellation_reason?: string;
  cancelled_by?: number;
  cancelled_at?: string;
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
