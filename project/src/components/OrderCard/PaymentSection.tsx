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
  return (
    <div className="mb-6 border p-4 rounded bg-white shadow-sm text-gray-700">
      <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2 text-blue-700">Payment Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input
          label="Payment Estimate:"
          value={formData.paymentEstimate}
          name="paymentEstimate"
          onChange={handleNumericInputChange}
          type="text"
        />
        <Input
          label="*Sch Amt:"
          value={formData.schAmt}
          name="schAmt"
          onChange={handleNumericInputChange}
          type="text"
        />
        <Input
          label="Advance Cash:"
          value={formData.cashAdv1}
          name="cashAdv1"
          onChange={handleNumericInputChange}
          type="text"
        />
        <Input
          label="Advance Cheque:"
          value={formData.chequeAdv}
          name="chequeAdv"
          onChange={handleNumericInputChange}
          type="text"
        />
        <Input
          label="Advance Card:"
          value={formData.ccUpiAdv}
          name="ccUpiAdv"
          onChange={handleNumericInputChange}
          type="text"
        />
        <Input
          label="Advance GPay:"
          value={formData.advance}
          name="advance"
          onChange={handleNumericInputChange}
          type="text"
        />
        <Input
          label="Advance Paytm:"
          value={formData.advance}
          name="advance"
          onChange={handleNumericInputChange}
          type="text"
        />
        <Input
          label="Advance Other:"
          value={formData.advance}
          name="advance"
          onChange={handleNumericInputChange}
          type="text"
        />
        <Input
          label="Balance:"
          value={formData.balance}
          name="balance"
          readOnly
          type="text"
          className="bg-blue-100"
        />
      </div>
    </div>
  );
};

export default PaymentSection; 