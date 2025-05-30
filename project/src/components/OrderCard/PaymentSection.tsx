import React from 'react';
import Input from '../ui/Input';
import { PrescriptionFormData } from '../types';

interface PaymentSectionProps {
  formData: PrescriptionFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleNumericInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
  formData,
  handleChange,
  handleNumericInputChange,
}) => {
  // Calculate total amounts from items
  const totalBaseAmount = formData.selectedItems.reduce((sum, item) => {
    const rate = parseFloat(item.rate?.toString() || '0');
    const qty = parseFloat(item.qty?.toString() || '1');
    return sum + (rate * qty);
  }, 0);

  // Calculate total tax amount
  const totalTaxAmount = parseFloat(formData.chequeAdv || '0');
  
  // Calculate total discount amount
  const totalDiscountAmount = parseFloat(formData.schAmt || '0');
  
  // Calculate total advance (directly from input fields)
  const cashAdv1 = parseFloat(formData.cashAdv1 || '0') || 0;
  const ccUpiAdv = parseFloat(formData.ccUpiAdv || '0') || 0;
  const advanceOther = parseFloat(formData.advance || '0') || 0;
  const totalAdvance = (cashAdv1 + ccUpiAdv + advanceOther).toFixed(2);
  
  // Calculate final balance correctly including tax and discount
  const finalAmount = totalBaseAmount + totalTaxAmount - totalDiscountAmount;
  const correctBalance = Math.max(0, finalAmount - (cashAdv1 + ccUpiAdv + advanceOther)).toFixed(2);

  return (
    <div className="mb-6 border p-4 rounded bg-white shadow-sm text-gray-700">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2 text-blue-700">Payment Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded border">
          <div className="text-sm font-medium text-gray-500">Payment Estimate</div>
          <div className="text-lg font-semibold">₹{formData.paymentEstimate || '0.00'}</div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded border">
          <div className="text-sm font-medium text-gray-500">Tax Added</div>
          <div className="text-lg">₹{formData.chequeAdv || '0.00'}</div>
        </div>
        
        <div className="bg-blue-50 p-3 rounded border border-blue-100">
          <div className="text-sm font-medium text-blue-600">Total Advance</div>
          <div className="text-lg font-semibold text-blue-700">₹{totalAdvance}</div>
        </div>
        
        <div className="bg-green-50 p-3 rounded border border-green-100">
          <div className="text-sm font-medium text-green-600">Balance</div>
          <div className="text-lg font-semibold text-green-700">₹{correctBalance}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t">
        <Input
          label="Advance Cash"
          value={formData.cashAdv1}
          name="cashAdv1"
          onChange={handleNumericInputChange}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          className="bg-white"
        />
        
        <Input
          label="Advance Card/UPI"
          value={formData.ccUpiAdv}
          name="ccUpiAdv"
          onChange={handleNumericInputChange}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          className="bg-white"
        />
        
        <Input
          label="Advance Other"
          value={formData.advance}
          name="advance"
          onChange={handleNumericInputChange}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          className="bg-white"
        />
        
        <Input
          label="Sch. Amt"
          value={formData.schAmt}
          name="schAmt"
          onChange={handleNumericInputChange}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          className="bg-white"
        />
      </div>
    </div>
  );
};

export default PaymentSection; 