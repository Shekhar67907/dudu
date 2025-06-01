-- SQL script to add missing columns to contact_lens_prescriptions table

-- #1 - Update contact_lens_prescriptions table
-- Add Reference Number column
ALTER TABLE contact_lens_prescriptions ADD COLUMN IF NOT EXISTS reference_no TEXT;

-- Add Customer Code column
ALTER TABLE contact_lens_prescriptions ADD COLUMN IF NOT EXISTS customer_code TEXT;

-- Add Birthday column
ALTER TABLE contact_lens_prescriptions ADD COLUMN IF NOT EXISTS birth_day DATE;

-- Add Marriage Anniversary column
ALTER TABLE contact_lens_prescriptions ADD COLUMN IF NOT EXISTS marriage_anniversary DATE;

-- Add PIN column
ALTER TABLE contact_lens_prescriptions ADD COLUMN IF NOT EXISTS pin TEXT;

-- Add Phone Landline column
ALTER TABLE contact_lens_prescriptions ADD COLUMN IF NOT EXISTS phone_landline TEXT;

-- Add Prescribed By column
ALTER TABLE contact_lens_prescriptions ADD COLUMN IF NOT EXISTS prescribed_by TEXT;

-- Create index for reference_no for faster lookups
CREATE INDEX IF NOT EXISTS idx_contact_lens_prescriptions_reference_no 
  ON contact_lens_prescriptions(reference_no);

-- Create index for customer_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_contact_lens_prescriptions_customer_code 
  ON contact_lens_prescriptions(customer_code);

-- #2 - Update contact_lens_eyes table
-- Add IPD column to contact_lens_eyes table
ALTER TABLE contact_lens_eyes ADD COLUMN IF NOT EXISTS ipd TEXT;

-- #3 - Update contact_lens_items table
-- Add item_index column to contact_lens_items table for ordering items
ALTER TABLE contact_lens_items ADD COLUMN IF NOT EXISTS item_index INTEGER;

-- #4 - Fix issues in contact_lens_payments table
-- Fix comma issue after payment_total and ensure all columns exist
ALTER TABLE contact_lens_payments ADD COLUMN IF NOT EXISTS payment_total NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE contact_lens_payments ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'Cash';
ALTER TABLE contact_lens_payments ADD COLUMN IF NOT EXISTS cash_advance NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE contact_lens_payments ADD COLUMN IF NOT EXISTS card_upi_advance NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE contact_lens_payments ADD COLUMN IF NOT EXISTS cheque_advance NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE contact_lens_payments ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE contact_lens_payments ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE contact_lens_payments ADD COLUMN IF NOT EXISTS scheme_discount BOOLEAN DEFAULT FALSE;
ALTER TABLE contact_lens_payments ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE;

-- Make sure payment_mode constraint exists with correct values
ALTER TABLE contact_lens_payments DROP CONSTRAINT IF EXISTS check_payment_mode;
ALTER TABLE contact_lens_payments ADD CONSTRAINT check_payment_mode 
  CHECK (payment_mode IN ('Cash', 'Card', 'UPI', 'Cheque'));

-- Make sure the payments table has the correct foreign key constraint
ALTER TABLE contact_lens_payments DROP CONSTRAINT IF EXISTS fk_contact_lens_payment;
ALTER TABLE contact_lens_payments ADD CONSTRAINT fk_contact_lens_payment
  FOREIGN KEY (contact_lens_prescription_id) 
  REFERENCES contact_lens_prescriptions(id) 
  ON DELETE CASCADE;
