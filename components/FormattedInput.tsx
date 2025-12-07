
import React from 'react';

interface FormattedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

const FormattedInput: React.FC<FormattedInputProps> = ({ value, onChange, className, placeholder, ...props }) => {
  // Format the value for display (add commas)
  const formatDisplayValue = (val: string) => {
    if (!val) return '';
    
    // Split integer and decimal parts
    const parts = val.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
    
    // Add commas to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    return formattedInteger + decimalPart;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove commas to get raw value
    const rawValue = e.target.value.replace(/,/g, '');
    
    // Validate: Allow only numbers and a single decimal point
    if (/^\d*\.?\d*$/.test(rawValue)) {
      onChange(rawValue);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={formatDisplayValue(value)}
      onChange={handleChange}
      className={className}
      placeholder={placeholder}
      dir="ltr" // Force LTR for numbers to align correctly with commas
      autoComplete="off"
      {...props}
    />
  );
};

export default FormattedInput;
