import React, { useState, useEffect, useRef } from 'react';
import * as orderService from '../../Services/orderService';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import RadioGroup from '../ui/RadioGroup';
import Button from "../ui/Button";
// Assuming helper functions like getTodayDate, getNextMonthDate, etc. exist in utils
import { getTodayDate, getNextMonthDate, titleOptions, classOptions, prescribedByOptions, formatNumericInput } from '../../utils/helpers';
import CustomerInfoSection from './CustomerInfoSection';
import PrescriptionSection from './PrescriptionSection';
import RemarksAndStatusSection from './RemarksAndStatusSection';
import PaymentSection from './PaymentSection';
import { PrescriptionFormData, PrescriptionData, SelectedItem } from '../types';
import ToastNotification from '../ui/ToastNotification';
// Import Supabase client
import { supabase } from '../../Services/supabaseService';

// Interface for the structure of a search suggestion (based on API response which is a full Prescription object)
interface SearchSuggestion extends PrescriptionFormData {
  id: string; // Assuming an ID field exists in your DB schema and API response
  status: string; // Make status required to match PrescriptionFormData
}

// Helper function to generate a unique prescription number
const generateUniquePrescriptionNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear().toString().substring(2); // Get last 2 digits of year
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `P${year}${month}-${day}${random}`;
};

// Helper function to generate a unique reference number
// If prescriptionNumber is provided, use it as the reference number
const generateUniqueReferenceNumber = (prescriptionNumber?: string): string => {
  // If a prescription number is provided, use it as the reference number
  if (prescriptionNumber) {
    return prescriptionNumber;
  }
  
  // Otherwise generate a new unique reference number
  const now = new Date();
  const year = now.getFullYear().toString().substring(2); // Get last 2 digits of year
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  return `REF${year}${month}-${random}`;
};

// Helper function to format date for input fields
const formatDateForInput = (date: string | null | undefined, format: 'date' | 'datetime-local' = 'date'): string => {
  if (!date) return '';
  // Ensure date is a string before proceeding
  if (typeof date !== 'string') return '';
  
  // Extract just the date part if there's a time component
  const datePart = date.includes('T') ? date.split('T')[0] : date;
  
  // Return appropriate format based on the format parameter
  if (format === 'datetime-local') {
    // For datetime-local inputs, append time if not already present
    return date.includes('T') ? date : `${datePart}T00:00`;
  } else {
    // For date inputs, return just the date part
    return datePart;
  }
};

// Initial form state with proper nested structure and default datetime-local format
// Generate a unique prescription number for initial state
const initialPrescriptionNumber = generateUniquePrescriptionNumber();

// Initial state for the form using PrescriptionFormData type
const initialFormState: PrescriptionFormData = {
  // Common/Customer fields
  prescriptionNo: initialPrescriptionNumber,
  referenceNo: generateUniqueReferenceNumber(initialPrescriptionNumber), // Use prescription number as reference number by default
  currentDateTime: formatDateForInput(getTodayDate(), 'datetime-local'),
  deliveryDateTime: formatDateForInput(getNextMonthDate(), 'datetime-local'),
  date: formatDateForInput(getTodayDate()), // Using date format
  class: '',
  bookingBy: '',
  namePrefix: 'Mr.',
  name: '',
  gender: 'Male',
  age: '',
  customerCode: '',
  birthDay: '',
  marriageAnniversary: '',
  address: '',
  city: '',
  state: '',
  pinCode: '',
  phoneLandline: '',
  mobileNo: '',
  email: '',
  ipd: '',
  prescribedBy: '',
  billed: false,
  rightEye: {
    dv: { sph: '', cyl: '', ax: '', add: '', vn: '6/', rpd: '' },
    nv: { sph: '', cyl: '', ax: '', add: '', vn: 'N' }
  },
  leftEye: {
    dv: { sph: '', cyl: '', ax: '', add: '', vn: '6/', lpd: '' },
    nv: { sph: '', cyl: '', ax: '', add: '', vn: 'N' }
  },
  balanceLens: false,
  selectedItems: [],
  remarks: { // Initialize remarks as an object with boolean flags based on PrescriptionForm.tsx
    forConstantUse: false,
    forDistanceVisionOnly: false,
    forNearVisionOnly: false,
    separateGlasses: false,
    biFocalLenses: false,
    progressiveLenses: false,
    antiReflectionLenses: false,
    antiRadiationLenses: false,
    underCorrected: false
  },
  orderStatus: 'Processing',
  orderStatusDate: formatDateForInput(getTodayDate(), 'datetime-local'),
  retestAfter: '',
  billNo: '',
  paymentEstimate: '0.00',
  schAmt: '0.00',
  advance: '0.00',
  balance: '0.00',
  // Added missing payment fields based on linter error and likely PaymentSection requirements
  cashAdv1: '0.00',
  ccUpiAdv: '0.00',
  chequeAdv: '0.00',
  advanceOther: '0.00',
  taxAmount: '0.00',
  cashAdv2: '0.00',
  cashAdv2Date: formatDateForInput(getTodayDate(), 'datetime-local'),

  // Keep discount fields, although their usage needs confirmation
  applyDiscount: '',
  discountType: 'percentage',
  discountValue: '', // Value for the discount (either % or fixed amount)
  discountReason: '',

  // Manual entry fields
  manualEntryType: 'Frames',
  manualEntryItemName: '',
  manualEntryRate: '',
  manualEntryQty: 1,
  manualEntryItemAmount: 0,

  // Assuming these are also part of PrescriptionFormData based on your initial state
  others: '',
  status: '', // Required field in PrescriptionFormData interface
  title: 'Mr.' // Required field separate from namePrefix
};

const OrderCardForm: React.FC = () => {
  // Use the imported PrescriptionFormData type for state
  const [formData, setFormData] = useState<PrescriptionFormData>(initialFormState);

  const [showManualEntryPopup, setShowManualEntryPopup] = useState(false);
  const [showLensEntryPopup, setShowLensEntryPopup] = useState(false);
  const [lensEntry, setLensEntry] = useState({ brandName: '', itemName: '', index: '', coating: '', rate: '', qty: '', itemAmount: '' });
  const [retestAfterChecked, setRetestAfterChecked] = useState(false);
  const [showItemSelectionPopup, setShowItemSelectionPopup] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<'Frames' | 'Sun Glasses'>('Frames');
  // Ensure notification type aligns with ToastNotification props
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({ message: '', type: 'success', visible: false });

  // States for search suggestions
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle click outside suggestions to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the clicked element is within the suggestions dropdown or the input field
      const clickedInsideSuggestions = suggestionsRef.current && suggestionsRef.current.contains(event.target as Node);
      const clickedOnInput = activeField && (event.target as Element).closest(`input[name='${activeField}']`);

      if (!clickedInsideSuggestions && !clickedOnInput) {
        setActiveField(null);
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeField]); // Add activeField to dependency array

  // Effect to calculate Item Amount in manual entry popup
  useEffect(() => {
    const rate = parseFloat(formData.manualEntryRate || '0');
    const qty = formData.manualEntryQty || 0;
    setFormData(prev => ({ ...prev, manualEntryItemAmount: rate * qty }));
  }, [formData.manualEntryRate, formData.manualEntryQty]);

  // Effect to calculate taxes, total advance, and balance in Payment Section
  useEffect(() => {
    try {
      // Calculate total base amount (rate * qty) for all items
      const totalBaseAmount = formData.selectedItems.reduce((sum, item) => {
        const rate = parseFloat(item.rate?.toString() || '0');
        const qty = parseFloat(item.qty?.toString() || '1');
        return sum + (rate * qty);
      }, 0);

      // Calculate total taxes from all items
      const totalTaxAmount = formData.selectedItems.reduce((sum, item) => {
        const rate = parseFloat(item.rate?.toString() || '0');
        const qty = parseFloat(item.qty?.toString() || '1');
        const baseTotal = rate * qty;
        const taxPercent = parseFloat(item.taxPercent?.toString() || '0');
        const taxAmount = (baseTotal * taxPercent) / 100;
        return sum + taxAmount;
      }, 0);
      
      // Calculate total discount amount
      const totalDiscountAmount = formData.selectedItems.reduce((sum, item) => {
        return sum + (parseFloat(item.discountAmount?.toString() || '0'));
      }, 0);

      // Payment estimate = base amount + tax (before discount)
      const paymentEstimate = totalBaseAmount + totalTaxAmount;
      
      // Calculate total advance payments (directly from form inputs, not derived values)
      const cashAdv1 = parseFloat(formData.cashAdv1?.toString() || '0') || 0;
      const ccUpiAdv = parseFloat(formData.ccUpiAdv?.toString() || '0') || 0;
      const advanceOther = parseFloat(formData.advance?.toString() || '0') || 0;
      
      // Do not set the advance field in state - this was causing the recursive loop
      const totalAdvance = cashAdv1 + ccUpiAdv + advanceOther;

      // Calculate final amount after discount (base + tax - discount)
      const finalAmount = paymentEstimate - totalDiscountAmount;
      
      // Balance = final amount - total advance (ensuring it's not negative)
      const balance = Math.max(0, finalAmount - totalAdvance);
      
      console.log('Payment Calculation Debug:', {
        totalBaseAmount,
        totalTaxAmount,
        totalDiscountAmount,
        paymentEstimate,
        cashAdv1,
        ccUpiAdv,
        advanceOther,
        totalAdvance,
        finalAmount,
        balance
      });
      
      // Update state, but DON'T update the advance field itself to avoid recursion
      setFormData(prev => ({
        ...prev,
        paymentEstimate: paymentEstimate.toFixed(2),
        balance: balance.toFixed(2),
        chequeAdv: totalTaxAmount.toFixed(2),
        schAmt: totalDiscountAmount.toFixed(2)
        // Removed advance: totalAdvance.toFixed(2) to prevent the loop
      }));
    } catch (error) {
      console.error('Error in payment calculation:', error);
    }
  }, [
    formData.selectedItems,
    formData.cashAdv1,
    formData.ccUpiAdv,
    formData.cashAdv2,
    formData.paymentEstimate,
    formData.balance,
    formData.chequeAdv,
    formData.schAmt,
    formData.advance
  ]);

  // Effect to handle prescription logic (IPD calculation)
  useEffect(() => {
    // Calculate IPD from RPD and LPD
    const rpdValue = parseFloat(formData.rightEye.dv.rpd || '0');
    const lpdValue = parseFloat(formData.leftEye.dv.lpd || '0');

    if (!isNaN(rpdValue) && !isNaN(lpdValue) && (rpdValue > 0 || lpdValue > 0)) {
        const calculatedIPD = (rpdValue + lpdValue).toFixed(1);
        setFormData(prev => ({ ...prev, ipd: calculatedIPD }));
    } else {
         setFormData(prev => ({ ...prev, ipd: '' }));
      }
  }, [formData.rightEye.dv.rpd, formData.leftEye.dv.lpd]);

  // Payment Section: Auto-calculate Payment Estimate, Tax Amount, and Sch Amt from selectedItems
  useEffect(() => {
    // Calculate base amount: sum of (rate * qty) for all items
    const baseAmount = formData.selectedItems.reduce((sum, item) => sum + (item.rate * item.qty), 0);
    
    // Calculate total tax amount from all items
    const totalTaxAmount = formData.selectedItems.reduce((sum, item) => {
      const itemBaseAmount = item.rate * item.qty;
      const taxAmount = (itemBaseAmount * (item.taxPercent || 0)) / 100;
      return sum + taxAmount;
    }, 0);
    
    // Payment Estimate: base amount + tax amount
    const paymentEstimate = baseAmount + totalTaxAmount;
    
    // Sch Amt: sum of all discountAmount fields
    const schAmt = formData.selectedItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    
    // Advance: user input, default to 0 if empty
    const advance = formData.advance === '' ? 0 : parseFloat(formData.advance);
    
    // Balance: Payment Estimate - Sch Amt - Advance
    const balance = paymentEstimate - schAmt - advance;
    
    setFormData(prev => ({
      ...prev,
      paymentEstimate: paymentEstimate.toFixed(2),
      taxAmount: totalTaxAmount.toFixed(2),
      schAmt: schAmt.toFixed(2),
      balance: balance.toFixed(2)
    }));
  }, [formData.selectedItems, formData.advance]);

  // Auto-suggestion search function
  const searchPrescriptions = (query: string, field: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    // Clear previous timeout if it exists
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Define the column to search based on the field
        let column = '';
        switch (field) {
          case 'prescriptionNo': column = 'prescription_no'; break;
          case 'referenceNo': column = 'reference_no'; break;
          case 'name': column = 'name'; break;
          case 'mobileNo': column = 'mobile_no'; break;
          default: return; // Don't search for other fields
        }

        console.log(`Searching for ${column} containing: ${query}`);
        
        // Use Supabase to query the database with join to eye_prescriptions, prescription_remarks, orders, order_items, and order_payments
        console.log(`Executing query for ${column}=${query}`);
        let { data, error } = await supabase
          .from('prescriptions')
          .select(`
            *,
            eye_prescriptions(id, prescription_id, eye_type, vision_type, sph, cyl, ax, add_power, vn, rpd, lpd),
            prescription_remarks(*),
            orders(*, order_items(*), order_payments(*))
          `)
          .eq(column, query) // For exact match
          .limit(5);
          
        // If no exact matches, try partial match for name/mobile
        if ((!data || data.length === 0) && (column === 'name' || column === 'mobile_no')) {
          const result = await supabase
            .from('prescriptions')
            .select(`
              *,
              eye_prescriptions(id, prescription_id, eye_type, vision_type, sph, cyl, ax, add_power, vn, rpd, lpd),
              prescription_remarks(*),
              orders(*, order_items(*), order_payments(*))
            `)
            .ilike(column, `%${query}%`) // For partial match
            .limit(5);
            
          data = result.data;
          error = result.error;
        }
          
        if (error) {
          console.error('Supabase search error:', error);
          setNotification({
            message: `Search failed: ${error.message}`,
            type: 'error',
            visible: true
          });
          setSuggestions([]);
          return;
        }
        
        if (!data || data.length === 0) {
          console.log('No search results found');
          setSuggestions([]);
          return;
        }
          
        console.log('Search results:', data);
        console.log('Raw data with eye_prescriptions:', data);
      
      // Transformation of database results to match your interface including eye prescriptions
      const transformedData: SearchSuggestion[] = data.map((item: any) => {
        // When we select this suggestion, we want to preserve the original prescription number and reference number
        // rather than generating new ones
        // Check if eye_prescriptions, prescription_remarks, and orders arrays exist
        const eyePrescriptions = item.eye_prescriptions || [];
        const prescriptionRemarks = item.prescription_remarks || [];
        const orders = item.orders || [];
        
        // Get the most recent order (if any)
        const latestOrder = orders.length > 0 ? orders[0] : null;
        
        // Get order items and payments from the latest order
        const orderItems = latestOrder?.order_items || [];
        const orderPayment = latestOrder?.order_payments?.[0] || null;
        
        // Log the raw order payment object to inspect all available fields
        console.log('RAW ORDER PAYMENT OBJECT WITH ALL FIELDS:', {
          orderPayment,
          allKeys: orderPayment ? Object.keys(orderPayment) : [],
          allValues: orderPayment ? Object.values(orderPayment) : []
        });
        
        console.log('RAW ORDER PAYMENT DATA FROM DB:', orderPayment);
        
        // Extract payment values for easier access
        const paymentEstimate = orderPayment?.payment_estimate || 0;
        const taxAmount = orderPayment?.tax_amount || 0;
        const scheduleAmount = orderPayment?.schedule_amount || 0;
        const advanceCash = orderPayment?.advance_cash || 0;
        const advanceCardUpi = orderPayment?.advance_card_upi || 0;
        const advanceOther = orderPayment?.advance_other || 0;
        
        // Use stored database values for total_advance and balance instead of recalculating
        const totalAdvance = orderPayment?.total_advance || 0;
        const balance = orderPayment?.balance || 0;
        
        // Log the order payment data to identify the issue
        console.log('DETAILED ORDER PAYMENT VALUES FROM DATABASE:', {
          raw: orderPayment,
          rawFields: {
            payment_estimate: orderPayment?.payment_estimate,
            tax_amount: orderPayment?.tax_amount,
            schedule_amount: orderPayment?.schedule_amount,
            advance_cash: orderPayment?.advance_cash,
            advance_card_upi: orderPayment?.advance_card_upi,
            advance_other: orderPayment?.advance_other,
            total_advance: orderPayment?.total_advance,  // This should be 100.00 based on your screenshot
            balance: orderPayment?.balance,  // This should be 1000.00 based on your screenshot
          },
          
          // Extracted values
          extractedValues: {
            paymentEstimate,
            taxAmount,
            scheduleAmount,
            advanceCash,
            advanceCardUpi,
            advanceOther,
            totalAdvance,
            balance
          }
        });
        
        // Add these payment values to the suggestion object so they can be used when populating the form
        item = {
          ...item,
          paymentEstimate: paymentEstimate.toString(),
          taxAmount: taxAmount.toString(),
          schAmt: scheduleAmount.toString(),
          cashAdv1: advanceCash.toString(),
          ccUpiAdv: advanceCardUpi.toString(),
          advanceOther: advanceOther.toString(), // Map to the new field
          chequeAdv: '0', // Set to 0 for backward compatibility
          advance: totalAdvance.toString(),
          balance: balance.toString()
        };
        
        // Log the full structure of the payment data for debugging
        console.log('Found order data:', { 
          latestOrder, 
          orderItems, 
          orderPayment,
          paymentDetails: {
            paymentEstimate,
            scheduleAmount,
            advanceCash,
            advanceCardUpi,
            advanceOther,
            totalAdvance,
            balance
          }
        });
        
        // Helper function to find eye prescription data
        const findEyeData = (eyeType: string, visionType: string, field: string, defaultValue: string = '') => {
          // Log the eyePrescriptions array for debugging
          if (eyeType === 'right' && visionType === 'distance' && field === 'sph') {
            console.log('Eye Prescriptions array:', eyePrescriptions);
            console.log('Looking for records with eye_type:', eyeType, 'vision_type:', visionType);
            
            // Detailed inspection of the first record to see field names
            if (eyePrescriptions.length > 0) {
              console.log('First record field names:', Object.keys(eyePrescriptions[0]));
              console.log('First record eye_type value:', eyePrescriptions[0].eye_type);
              console.log('First record vision_type value:', eyePrescriptions[0].vision_type);
            }
          }
          
          // Convert to lowercase and handle potential differences in field naming
          const prescription = eyePrescriptions.find((ep: any) => {
            // Check for various field name possibilities
            const recordEyeType = ep.eye_type || ep.eyeType || ep.eye;
            const recordVisionType = ep.vision_type || ep.visionType || ep.type;
            
            // Log each record for debugging
            if (eyeType === 'right' && visionType === 'distance' && field === 'sph') {
              console.log(`Checking record:`, ep);
              console.log(`Record eye type: ${recordEyeType}, Record vision type: ${recordVisionType}`);
              console.log(`Comparing with: ${eyeType}, ${visionType}`);
            }
            
            // Map vision types from UI format to database format
            const visionTypeMap: {[key: string]: string[]} = {
              'distance': ['distance', 'dv', 'distance_vision'],
              'near': ['near', 'nv', 'near_vision']
            };
            
            // Check if eye type matches
            const eyeTypeMatches = String(recordEyeType).toLowerCase() === eyeType.toLowerCase();
            
            // Check if vision type matches any of the possible formats
            let visionTypeMatches = false;
            if (visionType in visionTypeMap) {
              visionTypeMatches = visionTypeMap[visionType].includes(String(recordVisionType).toLowerCase());
            } else {
              visionTypeMatches = String(recordVisionType).toLowerCase() === visionType.toLowerCase();
            }
            
            return eyeTypeMatches && visionTypeMatches;
          });
          
          // Log the found prescription for debugging
          if (eyeType === 'right' && visionType === 'distance' && field === 'sph') {
            console.log(`Found prescription for ${eyeType} eye, ${visionType} vision:`, prescription);
          }
          
          // If we found a matching prescription, extract the requested field
          if (prescription) {
            // Handle field name variations
            let fieldValue = null;
            
            // Map UI field names to possible database field names
            const fieldMappings: {[key: string]: string[]} = {
              'sph': ['sph', 'sphere'],
              'cyl': ['cyl', 'cylinder'],
              'ax': ['ax', 'axis'],
              'add_power': ['add_power', 'add', 'addition'],
              'vn': ['vn', 'visual_acuity', 'va'],
              'rpd': ['rpd', 'right_pd', 'pupillary_distance_right'],
              'lpd': ['lpd', 'left_pd', 'pupillary_distance_left']
            };
            
            // Try all possible field name variations
            if (field in fieldMappings) {
              for (const possibleField of fieldMappings[field]) {
                if (prescription[possibleField] !== undefined) {
                  fieldValue = prescription[possibleField];
                  break;
                }
              }
            } else {
              // If not in our mappings, try direct access
              fieldValue = prescription[field];
            }
            
            // Special case for add_power
            if (field === 'add_power') {
              console.log(`Found possible add values:`, {
                add_power: prescription.add_power,
                add: prescription.add,
                addition: prescription.addition
              });
            }
            
            return fieldValue || defaultValue;
          }
          
          return defaultValue;
        };
        
        // Helper function to check if a remark type exists
        const hasRemarkType = (remarkType: string) => {
          // Ensure prescriptionRemarks is an array before calling some()
          return Array.isArray(prescriptionRemarks) && 
                 prescriptionRemarks.some((r: any) => r.remark_type === remarkType);
        };
        
        return {
          id: item.id,
          prescriptionNo: item.prescription_no || '',
          referenceNo: item.reference_no || '',
          name: item.name || '',
          title: item.title || 'Mr.',
          age: item.age ? String(item.age) : '',
          gender: item.gender || 'Male',
          customerCode: item.customer_code || '',
          mobileNo: item.mobile_no || '',
          // Basic prescription fields
          status: item.status || '',
          date: item.date || '',
          class: item.class || '',
          prescribedBy: item.prescribed_by || '',
          birthDay: item.birth_day ? formatDateForInput(item.birth_day) : '',
          marriageAnniversary: item.marriage_anniversary ? formatDateForInput(item.marriage_anniversary) : '',
          address: item.address || '',
          city: item.city || '',
          state: item.state || '',
          pinCode: item.pin_code || '',
          phoneLandline: item.phone_landline || '',
          email: item.email || '',
          ipd: item.ipd || '',
          bookingBy: '',
          namePrefix: item.title || 'Mr.',
          billed: false,
          balanceLens: item.balance_lens || false,
          // Extract eye prescription data using helper function
          rightEye: {
            dv: {
              sph: findEyeData('right', 'distance', 'sph'),
              cyl: findEyeData('right', 'distance', 'cyl'),
              ax: findEyeData('right', 'distance', 'ax'),
              add: findEyeData('right', 'distance', 'add_power'), // Database field is add_power, maps to add in our interface
              vn: findEyeData('right', 'distance', 'vn', '6/'),
              rpd: findEyeData('right', 'distance', 'rpd')
            },
            nv: {
              sph: findEyeData('right', 'near', 'sph'),
              cyl: findEyeData('right', 'near', 'cyl'),
              ax: findEyeData('right', 'near', 'ax'),
              add: findEyeData('right', 'near', 'add_power'), // Database field is add_power, maps to add in our interface
              vn: findEyeData('right', 'near', 'vn', 'N')
            }
          },
          leftEye: {
            dv: {
              sph: findEyeData('left', 'distance', 'sph'),
              cyl: findEyeData('left', 'distance', 'cyl'),
              ax: findEyeData('left', 'distance', 'ax'),
              add: findEyeData('left', 'distance', 'add_power'), // Database field is add_power, maps to add in our interface
              vn: findEyeData('left', 'distance', 'vn', '6/'),
              lpd: findEyeData('left', 'distance', 'lpd')
            },
            nv: {
              sph: findEyeData('left', 'near', 'sph'),
              cyl: findEyeData('left', 'near', 'cyl'),
              ax: findEyeData('left', 'near', 'ax'),
              add: findEyeData('left', 'near', 'add_power'), // Database field is add_power, maps to add in our interface
              vn: findEyeData('left', 'near', 'vn', 'N')
            }
          },
          remarks: {
            forConstantUse: hasRemarkType('for_constant_use'),
            forDistanceVisionOnly: hasRemarkType('for_distance_vision_only'),
            forNearVisionOnly: hasRemarkType('for_near_vision_only'),
            separateGlasses: hasRemarkType('separate_glasses'),
            biFocalLenses: hasRemarkType('bifocal_lenses'),
            progressiveLenses: hasRemarkType('progressive_lenses'),
            antiReflectionLenses: hasRemarkType('anti_reflection_lenses'),
            antiRadiationLenses: hasRemarkType('anti_radiation_lenses'),
            underCorrected: hasRemarkType('under_corrected')
          },
          // Map the order items from the latest order (if any)
          selectedItems: orderItems.map((item: any) => ({
            si: item.si || 0,
            itemCode: item.item_code || '',
            itemName: item.item_name || '',
            unit: 'PCS', // Default unit
            taxPercent: item.tax_percent || 0,
            rate: item.rate || 0,
            qty: item.qty || 1,
            amount: item.amount || 0,
            discountAmount: item.discount_amount || 0,
            discountPercent: item.discount_percent || 0,
            brandName: item.brand_name || '',
            index: item.index || '',
            coating: item.coating || ''
          })) || [],
          
          // Order status fields
          orderStatus: latestOrder?.status || 'Processing',
          orderStatusDate: latestOrder?.order_date || '',
          retestAfter: item.retest_after || '',
          billNo: latestOrder?.bill_no || '',
          
          // Payment related fields - populate from orderPayment if available
          paymentEstimate: orderPayment?.payment_estimate?.toString() || '0.00',
          schAmt: orderPayment?.schedule_amount?.toString() || '0.00',
          // Use total_advance directly from the database instead of recalculating
          advance: orderPayment?.total_advance?.toString() || '0.00',
          // Use balance directly from the database instead of recalculating
          balance: orderPayment?.balance?.toString() || '0.00',
          cashAdv1: orderPayment?.advance_cash?.toString() || '0.00',
          ccUpiAdv: orderPayment?.advance_card_upi?.toString() || '0.00',
          chequeAdv: orderPayment?.advance_other?.toString() || '0.00',
          cashAdv2: '0.00', // Not stored in database?
          cashAdv2Date: '',
          // Discount fields
          applyDiscount: '',
          discountType: 'percentage',
          discountValue: '',
          discountReason: '',
          // Manual entry fields
          manualEntryType: 'Frames',
          manualEntryItemName: '',
          manualEntryRate: '',
          manualEntryQty: 1,
          manualEntryItemAmount: 0,
          others: '',
          currentDateTime: '',
          deliveryDateTime: '',
          // Add the missing required properties
          advanceOther: orderPayment?.advance_other?.toString() || '0.00',
          taxAmount: orderItems.reduce((total: number, item: any) => {
            // Calculate tax amount based on items
            const itemTaxAmount = (item.amount || 0) * (item.tax_percent || 0) / 100;
            return total + itemTaxAmount;
          }, 0).toString() || '0.00'
        };
      });
          
        setSuggestions(transformedData);
      } catch (error) {
        console.error('Search error:', error);
        setNotification({
          message: error instanceof Error ? `Search error: ${error.message}` : 'An unknown error occurred during search',
          type: 'error',
          visible: true
        });
        setSuggestions([]);
      }
    }, 300);
  };

  // Handle input change for search fields
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Update the form data immediately
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Set the active field and trigger search
    setActiveField(name);
    searchPrescriptions(value, name);
  };
  
  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    let prescriptionNumber = suggestion.prescriptionNo;
    let referenceNumber = suggestion.referenceNo;
    
    try {
      // Determine if this is a new order or loading an existing prescription
      const isNewOrder = !suggestion.id; // If no ID, it's a new order
      
      // For prescription number and reference number:
      // 1. If it's an existing prescription (has ID), use the original values
      // 2. If it's a new order, generate new unique numbers
      prescriptionNumber = isNewOrder ? generateUniquePrescriptionNumber() : suggestion.prescriptionNo;
      
      // By default, use prescription number as reference number unless an explicit reference number exists
      if (isNewOrder) {
        // For new orders, default to using prescription number as reference
        referenceNumber = prescriptionNumber;
      } else if (suggestion.referenceNo && suggestion.referenceNo !== suggestion.prescriptionNo) {
        // If there's an existing reference number that's different from prescription number, use it
        referenceNumber = suggestion.referenceNo;
      } else {
        // Otherwise default to using prescription number
        referenceNumber = prescriptionNumber;
      }
      
      // Log selected items and payment details for debugging
      console.log('Populating form with order data:', {
        selectedItems: suggestion.selectedItems || [],
        paymentData: {
          paymentEstimate: suggestion.paymentEstimate,
          schAmt: suggestion.schAmt,
          advance: suggestion.advance,
          cashAdv1: suggestion.cashAdv1,
          ccUpiAdv: suggestion.ccUpiAdv,
          chequeAdv: suggestion.chequeAdv
        }
      });
      
      console.log('Order details:', {
        isNewOrder,
        prescriptionNumber,
        referenceNumber,
        suggestionId: suggestion.id
      });
    } catch (error) {
      console.error('Error in handleSuggestionSelect:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Populate form data with the selected suggestion's data
    setFormData(prevData => {
      // Get order items from the suggestion (if any)
      const orderItems = suggestion.selectedItems || [];
      
      // Create a new object with all the essential data
      const updatedData = {
        ...prevData,
        // Override with the generated prescription number and reference number
        prescriptionNo: prescriptionNumber,
        referenceNo: referenceNumber,
        // Personal Info
        name: suggestion.name || '',
        // Ensure age is treated as string for the input value
        age: suggestion.age?.toString() || '',
        mobileNo: suggestion.mobileNo || '',
        email: suggestion.email || '',
        address: suggestion.address || '',
        // Format dates for datetime-local input if necessary
        birthDay: formatDateForInput(suggestion.birthDay), // Assuming birthDay is a date string
        marriageAnniversary: formatDateForInput(suggestion.marriageAnniversary), // Assuming marriageAnniversary is a date string
        city: suggestion.city || '',
        state: suggestion.state || '',
        pinCode: suggestion.pinCode || '',
        phoneLandline: suggestion.phoneLandline || '',
        ipd: suggestion.ipd || '',
        prescribedBy: suggestion.prescribedBy || '', // Assuming prescribedBy is on the Prescription object
        
        // Populate the order items (frames/sun glasses)
        selectedItems: orderItems,
        
        // Populate payment details from the extracted values from database
        paymentEstimate: parseFloat(suggestion.paymentEstimate || '0').toFixed(2) || '0.00',
        schAmt: parseFloat(suggestion.schAmt || '0').toFixed(2) || '0.00',
        // Set individual advance payments
        cashAdv1: parseFloat(suggestion.cashAdv1 || '0').toFixed(2) || '0.00',
        ccUpiAdv: parseFloat(suggestion.ccUpiAdv || '0').toFixed(2) || '0.00',
        chequeAdv: parseFloat(suggestion.chequeAdv || '0').toFixed(2) || '0.00',
        // Set the total advance
        advance: (parseFloat(suggestion.cashAdv1 || '0') + 
                 parseFloat(suggestion.ccUpiAdv || '0') + 
                 parseFloat(suggestion.chequeAdv || '0')).toFixed(2),
        // Calculate and set the balance
        balance: (parseFloat(suggestion.paymentEstimate || '0') - 
                (parseFloat(suggestion.cashAdv1 || '0') + 
                 parseFloat(suggestion.ccUpiAdv || '0') + 
                 parseFloat(suggestion.chequeAdv || '0'))).toFixed(2),
        
        // Note: currentDateTime and deliveryDateTime are not part of the search result typically,
        // so we keep the existing values or generate new ones as per initial state logic.
        currentDateTime: prevData.currentDateTime, // Keep existing
        deliveryDateTime: prevData.deliveryDateTime, // Keep existing
        class: suggestion.class || '', // Assuming class is on the Prescription object
        bookingBy: suggestion.bookingBy || '', // Assuming bookingBy is on the Prescription object
        billed: suggestion.billed || false, // Assuming billed is on the Prescription object

        // Prescription Data (Ensure nested structure is handled)
        rightEye: {
          ...prevData.rightEye, // Preserve other rightEye properties if any
          dv: {
            ...prevData.rightEye.dv, // Preserve other rightEye DV properties if any
            sph: suggestion.rightEye?.dv?.sph || '',
            cyl: suggestion.rightEye?.dv?.cyl || '',
            ax: suggestion.rightEye?.dv?.ax || '',
            add: suggestion.rightEye?.dv?.add || '', // maps to add_power in the database
            vn: suggestion.rightEye?.dv?.vn || '6/', // Default if empty
            rpd: suggestion.rightEye?.dv?.rpd || ''
          },
          nv: {
            ...prevData.rightEye.nv, // Preserve other rightEye NV properties if any
            sph: suggestion.rightEye?.nv?.sph || '',
            cyl: suggestion.rightEye?.nv?.cyl || '',
            ax: suggestion.rightEye?.nv?.ax || '',
            add: suggestion.rightEye?.nv?.add || '', // maps to add_power in the database
            vn: suggestion.rightEye?.nv?.vn || 'N' // Default if empty
          }
        },
        leftEye: {
          ...prevData.leftEye, // Preserve other leftEye properties if any
          dv: {
            ...prevData.leftEye.dv, // Preserve other leftEye DV properties if any
            sph: suggestion.leftEye?.dv?.sph || '',
            cyl: suggestion.leftEye?.dv?.cyl || '',
            ax: suggestion.leftEye?.dv?.ax || '',
            add: suggestion.leftEye?.dv?.add || '', // maps to add_power in the database
            vn: suggestion.leftEye?.dv?.vn || '6/', // Default if empty
            lpd: suggestion.leftEye?.dv?.lpd || ''
          },
          nv: {
            ...prevData.leftEye.nv, // Preserve other leftEye NV properties if any
            sph: suggestion.leftEye?.nv?.sph || '',
            cyl: suggestion.leftEye?.nv?.cyl || '',
            ax: suggestion.leftEye?.nv?.ax || '',
            add: suggestion.leftEye?.nv?.add || '', // maps to add_power in the database
            vn: suggestion.leftEye?.nv?.vn || 'N' // Default if empty
          }
        },
        balanceLens: suggestion.balanceLens || false, // Assuming balanceLens is on the Prescription object
        remarks: {
          ...prevData.remarks, // Preserve other remark properties if any
          // Map remarks from the suggestion or use existing values
          forConstantUse: suggestion.remarks?.forConstantUse || prevData.remarks.forConstantUse || false,
          forDistanceVisionOnly: suggestion.remarks?.forDistanceVisionOnly || prevData.remarks.forDistanceVisionOnly || false,
          forNearVisionOnly: suggestion.remarks?.forNearVisionOnly || prevData.remarks.forNearVisionOnly || false,
          separateGlasses: suggestion.remarks?.separateGlasses || prevData.remarks.separateGlasses || false,
          biFocalLenses: suggestion.remarks?.biFocalLenses || prevData.remarks.biFocalLenses || false,
          progressiveLenses: suggestion.remarks?.progressiveLenses || prevData.remarks.progressiveLenses || false,
          antiReflectionLenses: suggestion.remarks?.antiReflectionLenses || prevData.remarks.antiReflectionLenses || false,
          antiRadiationLenses: suggestion.remarks?.antiRadiationLenses || prevData.remarks.antiRadiationLenses || false,
          underCorrected: suggestion.remarks?.underCorrected || prevData.remarks.underCorrected || false
        },
        
        // For form elements that are not directly populated from the API, preserve existing values
        orderStatus: suggestion.orderStatus || prevData.orderStatus,
        orderStatusDate: suggestion.orderStatusDate || prevData.orderStatusDate,
        retestAfter: suggestion.retestAfter || prevData.retestAfter,
        billNo: suggestion.billNo || prevData.billNo,
        // Discount fields
        applyDiscount: prevData.applyDiscount,
        discountType: prevData.discountType, // Corrected field name
        discountReason: prevData.discountReason,
        manualEntryType: prevData.manualEntryType,
        manualEntryItemName: prevData.manualEntryItemName,
        manualEntryRate: prevData.manualEntryRate,
        manualEntryQty: prevData.manualEntryQty,
        manualEntryItemAmount: prevData.manualEntryItemAmount,
        others: suggestion.others || '', // Assuming others is on the Prescription object
        status: suggestion.status || '' // Assuming status is on the Prescription object
      };
      
      return updatedData;
    });
    setActiveField(null);
    setSuggestions([]);
     setNotification({
       message: 'Prescription data loaded from search',
       type: 'success',
       visible: true
     });
  };

  // Keep existing handleChange for non-search fields and nested updates
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;

    // If the changed field is one of the search fields, use the dedicated handler
    if (['prescriptionNo', 'referenceNo', 'name', 'mobileNo'].includes(name)) {
        // Ensure value is a string before passing to handleSearchInputChange
        handleSearchInputChange(e as React.ChangeEvent<HTMLInputElement>);
        return;
    }

    // Handle date inputs to ensure datetime-local format
    if (name === 'currentDateTime' || name === 'deliveryDateTime' ||
        name === 'orderStatusDate' || name === 'retestAfter' ||
        name === 'cashAdv2Date') {
      setFormData(prev => ({
        ...prev,
        [name]: formatDateForInput(value)
      }));
      return;
    }

    // Handle nested properties (e.g., "rightEye.dv.sph")
    if (name.includes('.')) {
      const parts = name.split('.');
      setFormData(prev => {
        const newData: any = { ...prev }; // Use any temporarily for nested updates
        let current = newData;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
             current[parts[i]] = {}; // Initialize if undefined
          }
          current[parts[i]] = { ...current[parts[i]] };
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        return newData as PrescriptionFormData; // Cast back to the correct type
      });
    } else {
      // Handle top-level properties
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Keep existing handleCheckboxChange
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested checkbox properties
      const parts = name.split('.');
      setFormData(prev => {
        const newData: any = { ...prev }; // Use any temporarily
        let current = newData;
        for (let i = 0; i < parts.length - 1; i++) {
           if (!current[parts[i]]) {
             current[parts[i]] = {}; // Initialize if undefined
          }
          current[parts[i]] = { ...current[parts[i]] };
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = checked;
        return newData as PrescriptionFormData; // Cast back
      });
    } else {
      // Handle top-level checkbox properties
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    }
  };

  // Keep existing handleNumericInputChange
  const handleNumericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Skip processing if name is undefined
    if (!name) {
      console.error('Input name is undefined in handleNumericInputChange');
      return;
    }

    let processedValue = value;

    // For RPD and LPD fields, allow direct input without formatting
    if (name.includes('rpd') || name.includes('lpd')) {
      processedValue = value;
    } else if (name.includes('ax')) {
      // For axial, ensure integer between 0-180
      processedValue = value.replace(/[^0-9]/g, '');
      const numValue = parseInt(processedValue, 10);
      if (!isNaN(numValue)) {
         if (numValue > 180) {
           processedValue = '180';
         } else if (numValue < 0) {
            processedValue = '0';
         }
      } else {
        processedValue = '';
      }
    } else {
      // For other numeric fields, allow numbers, decimal point, and negative sign
      processedValue = value.replace(/[^0-9.-]/g, '');
    }

    // Create a synthetic event with the processed value
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        name: name,
        value: processedValue,
      }
    } as React.ChangeEvent<HTMLInputElement>;

    // Call the main handleChange with the synthetic event (this will now route back to handleSearchInputChange for search fields if applicable)
    handleChange(syntheticEvent);
    
    // After handling the change, check if this is a payment field and recalculate balance if needed
    if (['paymentEstimate', 'cashAdv1', 'ccUpiAdv', 'chequeAdv'].includes(name)) {
      updateBalanceAfterPaymentChange();
    }
  };
  
  // Function to recalculate advance and balance whenever payment fields change
  const updateBalanceAfterPaymentChange = () => {
    setFormData(prev => {
      // Get current payment values - ensure empty strings are treated as 0
      const paymentEstimate = prev.paymentEstimate === '' ? 0 : parseFloat(prev.paymentEstimate || '0');
      const cashAdv1 = prev.cashAdv1 === '' ? 0 : parseFloat(prev.cashAdv1 || '0');
      const ccUpiAdv = prev.ccUpiAdv === '' ? 0 : parseFloat(prev.ccUpiAdv || '0');
      const chequeAdv = prev.chequeAdv === '' ? 0 : parseFloat(prev.chequeAdv || '0');
      
      // Calculate total advance
      const totalAdvance = cashAdv1 + ccUpiAdv + chequeAdv;
      
      // Calculate balance - payment estimate minus total advance
      const balance = paymentEstimate - totalAdvance;
      
      console.log('Recalculating payment values:', {
        paymentEstimate,
        cashAdv1,
        ccUpiAdv,
        chequeAdv,
        totalAdvance,
        balance
      });
      
      // Return updated form data with new advance and balance values
      return {
        ...prev,
        advance: totalAdvance.toFixed(2),
        balance: balance.toFixed(2)
      };
    });
  };

   // Helper functions for manual entry (Keep these)
  const handleManualEntryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    const processedValue = (name === 'manualEntryQty') ? parseInt(value) || 0 : (name === 'manualEntryRate' || name === 'manualEntryItemAmount') ? parseFloat(value) || 0 : value;

    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleAddManualEntry = (type: 'Frames' | 'Sun Glasses') => {
    setSelectedItemType(type);
    setShowItemSelectionPopup(true);
  };

  const handleAddItemClick = (type: 'Frames' | 'Sun Glasses') => {
    setFormData(prev => ({
      ...prev,
      manualEntryType: type,
      manualEntryItemName: '',
      manualEntryRate: '',
      manualEntryQty: 1,
      manualEntryItemAmount: 0.00
    }));
    setShowItemSelectionPopup(false);
    setShowManualEntryPopup(true);
  };

  const handleAddManualEntryItem = () => {
    if (!formData.manualEntryItemName || !formData.manualEntryRate) {
      setNotification({
        message: 'Please enter both item name and rate',
        type: 'error',
        visible: true,
      });
      return;
    }

    const newItem: SelectedItem = {
      si: formData.selectedItems.length + 1,
      itemCode: generateItemCode(formData.manualEntryType), // Assuming generateItemCode exists
      itemName: formData.manualEntryItemName,
      unit: 'PCS',
      taxPercent: 0,
      rate: parseFloat(formData.manualEntryRate),
      qty: formData.manualEntryQty || 1,
      amount: parseFloat(formData.manualEntryRate) * (formData.manualEntryQty || 1),
      discountAmount: 0,
      discountPercent: 0
    };

    setFormData(prev => ({
      ...prev,
      selectedItems: [...prev.selectedItems, newItem],
      manualEntryItemName: '',
      manualEntryRate: '',
      manualEntryQty: 1,
      manualEntryItemAmount: 0
    }));
    setShowManualEntryPopup(false);
     setNotification({
       message: 'Manual item added',
       type: 'success',
       visible: true
     });
  };

  const handleDeleteItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      selectedItems: prev.selectedItems.filter((_, i) => i !== index)
    }));
    setNotification({
      message: 'Item deleted',
      type: 'success',
      visible: true
    });
  };
  
  // Form submission handler
  const handleOrderCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Recalculate advance and balance before submitting to ensure they're up-to-date
    updateBalanceAfterPaymentChange();
    
    // Add a small delay to ensure the state update completes before submission
    setTimeout(() => {
      console.log('Order Card Form Submitted:', formData);
      
      // Call the function to save the order to the database
      saveOrderToDatabase();
    }, 100);
  };
  
  // Function to save order data to the database
  const saveOrderToDatabase = async () => {
    try {
      console.log('Saving order to database...');
      
      // First, get the prescription ID from the prescription number
      let prescriptionId: string;
      try {
        // Add proper headers to avoid 406 errors
        const { data: prescriptions, error: prescError } = await supabase
          .from('prescriptions')
          .select('id')
          .eq('prescription_no', formData.prescriptionNo)
          .single();
      
        if (prescError || !prescriptions) {
          console.error('Error finding prescription:', prescError ? prescError.message : 'Unknown error');
          
          // If prescription not found, let's create it instead
          if (prescError && prescError.code === 'PGRST116') {
            console.log('Prescription not found, will create a new one');
            // Create a new prescription record
            try {
              // Create new prescription with only the required fields from the schema
              const { data: newPrescription, error: createError } = await supabase
                .from('prescriptions')
                .insert({
                  prescription_no: formData.prescriptionNo,
                  name: formData.name || 'Unnamed', // Required field
                  prescribed_by: formData.prescribedBy || 'Unknown', // Required field
                  date: formData.date || new Date().toISOString().split('T')[0] // Required field
                  // No status field in the schema
                })
                .select('id')
                .single();
                
              if (createError || !newPrescription) {
                throw new Error(`Failed to create prescription: ${createError?.message || 'Unknown error'}`);
              }
              
              prescriptionId = newPrescription.id;
              console.log('Created new prescription:', newPrescription);
            } catch (createPrescErr) {
              console.error('Error creating prescription:', createPrescErr);
              setNotification({
                message: `Failed to create a new prescription: ${createPrescErr instanceof Error ? createPrescErr.message : 'Unknown error'}`,
                type: 'error',
                visible: true
              });
              return;
            }
          } else {
            setNotification({
              message: `Error: Could not find prescription with number ${formData.prescriptionNo}. ${prescError ? prescError.message : ''}`,
              type: 'error',
              visible: true
            });
            return;
          }
        } else {
          // Prescription found, set the ID
          prescriptionId = prescriptions.id;
          console.log('Found prescription:', prescriptions);
        }
      } catch (lookupError) {
        console.error('Exception during prescription lookup:', lookupError);
        setNotification({
          message: `Error looking up prescription: ${lookupError instanceof Error ? lookupError.message : 'Unknown error'}`,
          type: 'error',
          visible: true
        });
        return;
      }
      
      // prescriptionId is now set either from found prescription or newly created one
      
      // Use the existing order number or generate a new one
      const orderNumber = formData.referenceNo || `ORD-${Date.now()}`;
      
      // First check if an order with this order number already exists
      const { data: existingOrder, error: orderCheckError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_no', orderNumber)
        .single();
      
      console.log('Existing order check:', existingOrder, orderCheckError ? `Error: ${orderCheckError.message}` : '');
      
      // Prepare order data
      const orderData = {
        prescriptionId,
        orderNo: orderNumber,
        billNo: formData.billNo || '',
        orderDate: formData.date,
        deliveryDate: formData.deliveryDateTime?.split('T')[0] || new Date().toISOString().split('T')[0], // Added fallback
        status: formData.orderStatus || 'Processing',
        remarks: 'General notes for the order',
        
        // Map the items
        items: formData.selectedItems.map((item, index) => {
          // Determine the item type based on itemCode or itemName
          let itemType = 'Other';
          
          // Check if item code has prefixes that indicate type
          if (item.itemCode) {
            if (item.itemCode.startsWith('FRM')) {
              itemType = 'Frames';
            } else if (item.itemCode.startsWith('SUN')) {
              itemType = 'Sun Glasses';
            } else if (item.itemCode.startsWith('LEN')) {
              itemType = 'Lens';
            }
          }
          
          // Or check if item name contains type indicators
          if (itemType === 'Other' && item.itemName) {
            const nameLower = item.itemName.toLowerCase();
            if (nameLower.includes('frame')) {
              itemType = 'Frames';
            } else if (nameLower.includes('sun') || nameLower.includes('glass')) {
              itemType = 'Sun Glasses';
            } else if (nameLower.includes('lens')) {
              itemType = 'Lens';
            }
          }
          
          return {
            si: index + 1,
            itemType,
            itemCode: item.itemCode || '',
            itemName: item.itemName || '',
            rate: typeof item.rate === 'string' ? parseFloat(item.rate) : Number(item.rate),
            qty: item.qty,
            amount: typeof item.amount === 'string' ? parseFloat(item.amount) : Number(item.amount),
            taxPercent: item.taxPercent || 0,
            discountPercent: item.discountPercent || 0,
            discountAmount: item.discountAmount ? 
              (typeof item.discountAmount === 'string' ? parseFloat(item.discountAmount) : Number(item.discountAmount)) : 0,
            brandName: item.brandName || '',
            index: item.index || '',
            coating: item.coating || ''
          };
        }),
        
        // Map payment details - ensure empty strings are treated as 0
        payment: {
          paymentEstimate: formData.paymentEstimate === '' ? 0 : parseFloat(formData.paymentEstimate || '0'),
          taxAmount: formData.taxAmount === '' ? 0 : parseFloat(formData.taxAmount || '0'), // Use the new taxAmount field
          discountAmount: formData.schAmt === '' ? 0 : parseFloat(formData.schAmt || '0'), // Total discount
          // CRITICAL FIX: finalAmount must equal paymentEstimate
          // The database uses finalAmount to calculate the balance
          // This must be correctly set for the balance to update
          finalAmount: (formData.paymentEstimate === '' ? 0 : parseFloat(formData.paymentEstimate || '0')),
          advanceCash: formData.cashAdv1 === '' ? 0 : parseFloat(formData.cashAdv1 || '0'),
          advanceCardUpi: formData.ccUpiAdv === '' ? 0 : parseFloat(formData.ccUpiAdv || '0'),
          advanceOther: formData.advanceOther === '' ? 0 : parseFloat(formData.advanceOther || '0'), // Use advanceOther instead of chequeAdv
          scheduleAmount: formData.schAmt === '' ? 0 : parseFloat(formData.schAmt || '0'),
          
          // EXPLICITLY calculate and include total_advance and balance
          // This ensures the database gets the correct values when you update an order
          total_advance: (
            (formData.cashAdv1 === '' ? 0 : parseFloat(formData.cashAdv1 || '0')) +
            (formData.ccUpiAdv === '' ? 0 : parseFloat(formData.ccUpiAdv || '0')) +
            (formData.advanceOther === '' ? 0 : parseFloat(formData.advanceOther || '0'))
          ),
          // Calculate balance as paymentEstimate minus total advance
          balance: (
            (formData.paymentEstimate === '' ? 0 : parseFloat(formData.paymentEstimate || '0')) -
            (
              (formData.cashAdv1 === '' ? 0 : parseFloat(formData.cashAdv1 || '0')) +
              (formData.ccUpiAdv === '' ? 0 : parseFloat(formData.ccUpiAdv || '0')) +
              (formData.advanceOther === '' ? 0 : parseFloat(formData.advanceOther || '0'))
            )
          )
        }
      };
      
      console.log('Prepared order data:', orderData);
      
      let result;
      if (existingOrder) {
        // If order exists, update it instead of recreating it
        console.log('Updating existing order:', existingOrder.id);
        
        try {
          // 1. Update the main order record
          const { error: orderUpdateError } = await supabase
            .from('orders')
            .update({
              bill_no: orderData.billNo,
              order_date: orderData.orderDate,
              delivery_date: orderData.deliveryDate,
              status: orderData.status,
              remarks: orderData.remarks
            })
            .eq('id', existingOrder.id);
            
          if (orderUpdateError) {
            console.error('Error updating order:', orderUpdateError);
            throw new Error(`Failed to update order: ${orderUpdateError.message}`);
          }
          
          // 2. Delete existing order items for this order
          const { error: itemsDeleteError } = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', existingOrder.id);
            
          if (itemsDeleteError) {
            console.error('Error deleting order items:', itemsDeleteError);
            throw new Error(`Failed to delete order items: ${itemsDeleteError.message}`);
          }
          
          // 3. Insert new order items
          const orderItems = orderData.items.map(item => {
            // The itemType field has already been determined in the orderData preparation stage
            return {
              order_id: existingOrder.id,
              si: item.si,
              item_type: item.itemType, // Already contains 'Frames', 'Sun Glasses', 'Lens', or 'Other'
              item_code: item.itemCode,
              item_name: item.itemName,
              rate: item.rate,
              qty: item.qty,
              amount: item.amount,
              tax_percent: item.taxPercent,
              discount_percent: item.discountPercent,
              discount_amount: item.discountAmount,
              brand_name: item.brandName,
              index: item.index,
              coating: item.coating
            };
          });
          
          const { error: itemsInsertError } = await supabase
            .from('order_items')
            .insert(orderItems);
            
          if (itemsInsertError) {
            console.error('Error inserting order items:', itemsInsertError);
            throw new Error(`Failed to insert order items: ${itemsInsertError.message}`);
          }
          
          // Get current payment values from database
          const { data: currentPayment, error: fetchPaymentError } = await supabase
            .from('order_payments')
            .select('*')
            .eq('order_id', existingOrder.id)
            .single();

          if (fetchPaymentError) {
            console.error('Error fetching current payment:', fetchPaymentError);
            throw new Error(`Failed to fetch current payment: ${fetchPaymentError.message}`);
          }

          // Convert form values to numbers
          const newAdvanceCash = parseFloat(formData.cashAdv1 || '0');
          const newAdvanceCardUpi = parseFloat(formData.ccUpiAdv || '0');
          const newAdvanceOther = parseFloat(formData.advanceOther || '0');
          const finalAmount = parseFloat(formData.paymentEstimate || '0');
          
          // Calculate new values by adding to existing values
          const currentAdvanceCash = parseFloat(currentPayment.advance_cash) || 0;
          const currentAdvanceCardUpi = parseFloat(currentPayment.advance_card_upi) || 0;
          const currentAdvanceOther = parseFloat(currentPayment.advance_other) || 0;
          
          const advanceCash = currentAdvanceCash + newAdvanceCash;
          const advanceCardUpi = currentAdvanceCardUpi + newAdvanceCardUpi;
          const advanceOther = currentAdvanceOther + newAdvanceOther;
          
          // Log the exact values being sent to the database
          console.log('UPDATING PAYMENT VALUES:', {
            current: {
              advance_cash: currentAdvanceCash,
              advance_card_upi: currentAdvanceCardUpi,
              advance_other: currentAdvanceOther
            },
            new: {
              advance_cash: newAdvanceCash,
              advance_card_upi: newAdvanceCardUpi,
              advance_other: newAdvanceOther
            },
            updated: {
              advance_cash: advanceCash,
              advance_card_upi: advanceCardUpi,
              advance_other: advanceOther
            }
          });
          
          try {
            // Update payment record - only update base fields, let database handle generated columns
            const { error: paymentUpdateError } = await supabase
              .from('order_payments')
              .update({
                payment_estimate: finalAmount,
                tax_amount: parseFloat(formData.taxAmount || '0'),
                discount_amount: parseFloat(formData.schAmt || '0'),
                final_amount: finalAmount,
                advance_cash: advanceCash,
                advance_card_upi: advanceCardUpi,
                advance_other: advanceOther,
                schedule_amount: parseFloat(formData.schAmt || '0'),
                updated_at: new Date().toISOString()
              })
              .eq('order_id', existingOrder.id)
              .select('*');
              
            if (paymentUpdateError) {
              console.error('Error updating payment:', paymentUpdateError);
              throw new Error(`Failed to update payment: ${paymentUpdateError.message}`);
            }
            
            console.log('Payment update successful. Verifying database values...');
            
            // Verify the update was successful
            const { data: currentPayment, error: fetchError } = await supabase
              .from('order_payments')
              .select('*')
              .eq('order_id', existingOrder.id)
              .single();
              
            if (fetchError) throw fetchError;
            
            console.log('CURRENT DATABASE VALUES:', currentPayment);
            
            // If the values don't match what we just tried to save, try a direct SQL update
            if (currentPayment.advance_cash !== advanceCash || 
                currentPayment.advance_card_upi !== advanceCardUpi || 
                currentPayment.advance_other !== advanceOther) {
                  
              console.log('Mismatch detected. Attempting direct SQL update...');
              
              try {
                // Use a direct SQL query to force update the values
                const { data: updateResult, error: sqlError } = await supabase.rpc('update_order_payment_values', {
                  p_order_id: existingOrder.id,
                  p_advance_cash: advanceCash,
                  p_advance_card_upi: advanceCardUpi,
                  p_advance_other: advanceOther,
                  p_final_amount: finalAmount
                });
                
                if (sqlError) {
                  console.error('SQL update error:', sqlError);
                } else {
                  console.log('Direct SQL update successful:', updateResult);
                }
              } catch (rpcError) {
                console.error('RPC call failed:', rpcError);
              }
            }
            
            result = { 
              success: true, 
              message: 'Order updated successfully', 
              orderId: existingOrder.id 
            };
            
          } catch (error) {
            console.error('Error during order update process:', error);
            result = { 
              success: false, 
              message: error instanceof Error ? error.message : 'Unknown error during update' 
            };
          }
      } else {
        // If no existing order, create a new one
        console.log('Creating new order');
        result = await orderService.saveOrder(orderData);
      }
      
      if (result && result.success) {
        setNotification({
          message: `Order saved successfully! Order ID: ${result.orderId}`,
          type: 'success',
          visible: true
        });
      } else {
        setNotification({
          message: `Error: ${result && result.message ? result.message : 'Unknown error'}`,
          type: 'error',
          visible: true
        });
      }
    } catch (error) {
      console.error('Error in saveOrderToDatabase:', error);
      setNotification({
        message: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        visible: true,
      });
    }
  };

  const handleClear = () => {
    setFormData(initialFormState);
    setRetestAfterChecked(false);
    setNotification({
      message: 'Form cleared',
      type: 'success',
      visible: true
    });
  };

  const handleApplyDiscount = () => {
    const discountValue = parseFloat(formData.applyDiscount || '0');
    if (discountValue <= 0) {
      setNotification({
        message: 'Please enter a valid discount value (greater than 0)',
        type: 'error',
        visible: true
      });
      return;
    }
    
    // Calculate total base amount and tax amount
    let totalBaseAmount = 0;
    let totalTaxAmount = 0;
    
    formData.selectedItems.forEach(item => {
      const rate = parseFloat(item.rate?.toString() || '0');
      const qty = parseFloat(item.qty?.toString() || '1');
      const baseTotal = rate * qty;
      totalBaseAmount += baseTotal;
      
      const taxPercent = parseFloat(item.taxPercent?.toString() || '0');
      const taxAmount = (baseTotal * taxPercent) / 100;
      totalTaxAmount += taxAmount;
    });
    
    // Total including tax
    const totalWithTax = totalBaseAmount + totalTaxAmount;
    
    if (totalWithTax <= 0) {
      setNotification({
        message: 'No items to apply discount to',
        type: 'error',
        visible: true
      });
      return;
    }
    
    const discountType = formData.discountType || 'percentage';
    const discountAmount = discountType === 'percentage'
      ? (totalWithTax * discountValue) / 100
      : Math.min(discountValue, totalWithTax);
    
    console.log('Discount calculation:', {
      totalBaseAmount,
      totalTaxAmount,
      totalWithTax,
      discountValue,
      discountType,
      discountAmount
    });
    
    // Apply discount proportionally to each item
    const updatedItems = formData.selectedItems.map(item => {
      const rate = parseFloat(item.rate?.toString() || '0');
      const qty = parseFloat(item.qty?.toString() || '1');
      const baseTotal = rate * qty;
      
      const taxPercent = parseFloat(item.taxPercent?.toString() || '0');
      const taxAmount = (baseTotal * taxPercent) / 100;
      
      const itemTotalWithTax = baseTotal + taxAmount;
      
      // Calculate this item's share of the total discount
      const ratio = itemTotalWithTax === 0 ? 0 : itemTotalWithTax / totalWithTax;
      const itemDiscount = discountAmount * ratio;
      
      // Apply the discount to the base amount (for display purposes only)
      const discountedBaseTotal = baseTotal - (itemDiscount * (baseTotal / itemTotalWithTax));
      
      return {
        ...item,
        amount: parseFloat(discountedBaseTotal.toFixed(2)),
        discountAmount: parseFloat(itemDiscount.toFixed(2)),
        discountPercent: itemTotalWithTax === 0 ? 0 : parseFloat(((itemDiscount / itemTotalWithTax) * 100).toFixed(2))
      };
    });
    
    setFormData(prev => ({
      ...prev,
      selectedItems: updatedItems,
      applyDiscount: '',
    }));
    
    setNotification({
      message: `Discount applied successfully!`,
      type: 'success',
      visible: true
    });
  };

  const handleItemDiscountChange = (index: number, type: 'percentage' | 'fixed', value: string) => {
    const numericValue = parseFloat(value) || 0;

    setFormData(prev => {
      const updatedItems = [...prev.selectedItems];
      const item = { ...updatedItems[index] };
      
      // Get base amount for the item
      const rate = parseFloat(item.rate?.toString() || '0');
      const qty = parseFloat(item.qty?.toString() || '1');
      const baseTotal = rate * qty;
      
      // Calculate tax for this item
      const taxPercent = parseFloat(item.taxPercent?.toString() || '0');
      const taxAmount = (baseTotal * taxPercent) / 100;
      
      // Total with tax
      const itemTotalWithTax = baseTotal + taxAmount;

      if (baseTotal === 0) return prev; // Prevent changes if item amount is 0
      
      console.log('Item discount calculation:', {
        item, baseTotal, taxAmount, itemTotalWithTax, numericValue, type
      });

      if (type === 'percentage') {
        const percentage = Math.min(100, Math.max(0, numericValue));
        
        // Apply discount to the total with tax
        const discountAmount = (itemTotalWithTax * percentage) / 100;
        
        item.discountPercent = percentage;
        item.discountAmount = parseFloat(discountAmount.toFixed(2));
        
        // The amount shown is the base price after discount (for display only)
        const discountedBaseAmount = baseTotal - (discountAmount * (baseTotal / itemTotalWithTax));
        item.amount = parseFloat(discountedBaseAmount.toFixed(2));
      } else { // type === 'fixed'
        // Cap the fixed discount at the total amount with tax
        const discountAmount = Math.min(itemTotalWithTax, Math.max(0, numericValue));
        const discountPercentage = (discountAmount / itemTotalWithTax) * 100;
        
        item.discountAmount = parseFloat(discountAmount.toFixed(2));
        item.discountPercent = parseFloat(discountPercentage.toFixed(2));
        
        // The amount shown is the base price after discount (for display only)
        const discountedBaseAmount = baseTotal - (discountAmount * (baseTotal / itemTotalWithTax));
        item.amount = parseFloat(discountedBaseAmount.toFixed(2));
      }
      
      updatedItems[index] = item;

      // Calculate totals
      const baseAmount = updatedItems.reduce((sum, i) => {
        const itemRate = parseFloat(i.rate?.toString() || '0');
        const itemQty = parseFloat(i.qty?.toString() || '1');
        return sum + (itemRate * itemQty);
      }, 0);
      
      const taxTotal = updatedItems.reduce((sum, i) => {
        const itemRate = parseFloat(i.rate?.toString() || '0');
        const itemQty = parseFloat(i.qty?.toString() || '1');
        const itemBaseTotal = itemRate * itemQty;
        const itemTaxPercent = parseFloat(i.taxPercent?.toString() || '0');
        return sum + ((itemBaseTotal * itemTaxPercent) / 100);
      }, 0);
      
      const discountTotal = updatedItems.reduce((sum, i) => {
        return sum + (parseFloat(i.discountAmount?.toString() || '0'));
      }, 0);
      
      // Total = base + tax - discount
      const paymentEstimate = baseAmount + taxTotal;
      const finalAmount = paymentEstimate - discountTotal;
      
      // Calculate total advance
      const cashAdv1 = parseFloat(prev.cashAdv1?.toString() || '0') || 0;
      const ccUpiAdv = parseFloat(prev.ccUpiAdv?.toString() || '0') || 0;
      const advance = parseFloat(prev.advance?.toString() || '0') || 0;
      const totalAdvance = cashAdv1 + ccUpiAdv + advance;
      
      // Balance = finalAmount - totalAdvance
      const balance = Math.max(0, finalAmount - totalAdvance);
      
      console.log('Updated payment calculation:', {
        baseAmount, taxTotal, discountTotal, paymentEstimate, finalAmount, totalAdvance, balance
      });

      return {
        ...prev,
        selectedItems: updatedItems,
        paymentEstimate: paymentEstimate.toFixed(2),
        chequeAdv: taxTotal.toFixed(2),
        schAmt: discountTotal.toFixed(2),
        balance: balance.toFixed(2)
      };
    });
  };

  // Function to generate item code
  function generateItemCode(type: string): string {
    // Generate item code based on type
    const prefix = type === 'Frames' ? 'FRM' : (type === 'Sun Glasses' ? 'SUN' : 'LEN');
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }

  return (
    <form onSubmit={handleOrderCardSubmit} className="w-full max-w-screen-xl mx-auto p-4 bg-gray-100 font-sans text-sm">
      <Card className="mb-4 p-4 shadow-lg rounded-md bg-white border border-gray-200">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 border-b pb-3 bg-blue-100 rounded-t-md px-4 py-2">
          <div className="flex space-x-1 mb-2 sm:mb-0">
            {/* Navigation Buttons - Keep these for now */} 
            <Button type="button" variant="outline" size="sm" className="text-xs">&#60;&#60; First</Button>
            <Button type="button" variant="outline" size="sm" className="text-xs">&#60; Prev</Button>
            <Button type="button" variant="outline" size="sm" className="text-xs">Next &#62;</Button>
            <Button type="button" variant="outline" size="sm" className="text-xs">Last &#62;&#62;</Button>
          </div>
          <Button type="button" variant="outline" size="sm" className="text-xs">&#60;&#60; Display Prescription History &#62;&#62;</Button>
        </div>

        {/* Order and Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Order Info */}
          <div className="grid grid-cols-1 gap-3 text-gray-700 border p-4 rounded bg-blue-50 shadow-sm">
            {/* Prescription No. with Autocomplete */}
            <div className="relative">
              <Input
                label="Prescription No.:"
                name="prescriptionNo"
                value={formData.prescriptionNo}
                onChange={handleChange} // Use the main handleChange
                onFocus={() => setActiveField('prescriptionNo')}
                autoComplete="off" // Prevent browser autocomplete
              />
              {activeField === 'prescriptionNo' && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto"
                >
                  <ul className="divide-y divide-gray-200">
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion.id} // Use unique ID from API
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        {suggestion.prescriptionNo} - {suggestion.name} ({suggestion.mobileNo || suggestion.phoneLandline})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Reference No. with Autocomplete */}
            <div className="relative">
              <Input
                label="Reference No.:"
                name="referenceNo"
                value={formData.referenceNo}
                onChange={handleChange} // Use the main handleChange
                onFocus={() => setActiveField('referenceNo')}
                 autoComplete="off"
              />
               {activeField === 'referenceNo' && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto"
                >
                  <ul className="divide-y divide-gray-200">
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                         {suggestion.referenceNo} - {suggestion.name} ({suggestion.mobileNo || suggestion.phoneLandline})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Input label="Current Date/Time:" value={formData.currentDateTime} name="currentDateTime" onChange={handleChange} type="datetime-local" readOnly />
            <Input label="Delivery Date/Time:" value={formData.deliveryDateTime} name="deliveryDateTime" onChange={handleChange} type="datetime-local"/>
            <Select label="Class:" options={classOptions} value={formData.class} name="class" onChange={handleChange} />
            <Input label="Booking By" value={formData.bookingBy} name="bookingBy" onChange={handleChange} />
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 gap-3 text-gray-700 border p-4 rounded bg-blue-50 shadow-sm">
            {/* Name with Autocomplete */}
            <div className="relative">
              <Input
                label="Name"
                value={formData.name}
                onChange={handleChange} // Use the main handleChange
                name="name"
                required
                onFocus={() => setActiveField('name')}
                 autoComplete="off"
              />
               {activeField === 'name' && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto"
                >
                  <ul className="divide-y divide-gray-200">
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                         {suggestion.name} - {suggestion.mobileNo || suggestion.phoneLandline} ({suggestion.prescriptionNo || suggestion.referenceNo})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
             <Select
                label="Title"
                options={titleOptions}
                value={formData.title}
                onChange={handleChange}
                name="title"
                className="w-24"
                fullWidth={false}
              />
               {/* Reverted Gender to RadioGroup as per original code */} 
              <RadioGroup
                label="Gender"
                name="gender"
                options={[
                  { label: 'Male', value: 'Male' },
                  { label: 'Female', value: 'Female' }
                ]}
                value={formData.gender}
                onChange={handleChange}
              />
            <Input
              label="Age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              name="age"
            />
             <Input
                label="Customer Code:"
                value={formData.customerCode}
                onChange={handleChange}
                name="customerCode"
              />
              <Input
                label="Birth Day:"
                type="date"
                value={formData.birthDay}
                onChange={handleChange}
                name="birthDay"
              />
              <Input
                label="Marr Anniv:"
                type="date"
                value={formData.marriageAnniversary}
                onChange={handleChange}
                name="marriageAnniversary"
              />
               <Input
                label="Address"
                value={formData.address}
                onChange={handleChange}
                name="address"
              />
              <Input
                label="City"
                value={formData.city}
                onChange={handleChange}
                name="city"
              />
              <Input
                label="State"
                value={formData.state}
                onChange={handleChange}
                name="state"
              />
              <Input
                label="Pin"
                value={formData.pinCode}
                onChange={handleChange}
                name="pinCode"
              />
            {/* Phone No. with Autocomplete */}
            <div className="relative">
              <Input
                label="Mobile No.:"
                value={formData.mobileNo}
                onChange={handleChange} // Use the main handleChange
                name="mobileNo"
                required
                onFocus={() => setActiveField('mobileNo')}
                 autoComplete="off"
              />
               {activeField === 'mobileNo' && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto"
                >
                  <ul className="divide-y divide-gray-200">
                    {suggestions.map((suggestion) => (
                      <li
                        key={suggestion.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                         {suggestion.mobileNo || suggestion.phoneLandline} - {suggestion.name} ({suggestion.prescriptionNo || suggestion.referenceNo})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
             <Input
                label="Phone (L.L.)"
                value={formData.phoneLandline}
                onChange={handleChange}
                name="phoneLandline"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                name="email"
              />
            </div>
             <Input label="IPD:" value={formData.ipd} name="ipd" onChange={handleNumericInputChange} className="text-center" readOnly /> 
            <Input label="Prescribed By" value={formData.prescribedBy} name="prescribedBy" onChange={handleChange} />
            <Checkbox label="Billed" checked={formData.billed} onChange={handleCheckboxChange} name="billed" />
        </div>

        {/* Prescription Section */}
        {/* Re-using your existing PrescriptionSection component */} 
        <PrescriptionSection
          formData={{
            rightEye: formData.rightEye,
            leftEye: formData.leftEye,
            balanceLens: formData.balanceLens,
            age: parseInt(formData.age) || 0 // Ensure age is a number
          }}
          handleChange={handleChange}
          handleNumericInputChange={handleNumericInputChange}
          handleCheckboxChange={handleCheckboxChange}
        />

        {/* Spectacles Section */}
         {/* Re-integrating the Spectacles Section structure */} 
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="flex flex-col space-y-2">
                 <Button type="button" variant="action" className="text-xs">&#60;&#60; Add Spectacle &#62;&#62;</Button>
                 <Button 
                   type="button" 
                   variant="action" 
                   className="text-xs" 
                   onClick={() => handleAddManualEntry('Frames')}
                 >
                   &#60;&#60; Add Frame / Sun Glasses &#62;&#62;
                 </Button>
                 <Button type="button" variant="action" className="text-xs" onClick={() => setShowLensEntryPopup(true)}>&#60;&#60; Add Lenses &#62;&#62;</Button>
             </div>
             <div className="md:col-span-3 border p-4 rounded bg-white shadow-sm">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 border-b pb-1 text-blue-700">Selected Frames / Sun Glasses Details</h4>
                  {/* Add global style for number input arrows */}
                  <style dangerouslySetInnerHTML={{
                    __html: `
                      /* Hide arrows for number inputs */
                      input[type=number]::-webkit-inner-spin-button, 
                      input[type=number]::-webkit-outer-spin-button { 
                        -webkit-appearance: none; 
                        margin: 0; 
                      }
                      input[type=number] {
                        -moz-appearance: textfield;
                      }
                      
                      /* Ensure table cells show full content */
                      .full-content-cell input {
                        width: 100% !important;
                        min-width: 60px;
                        box-sizing: border-box;
                      }
                      
                      /* Ensure content is fully visible in cells */
                      .full-width-table td, .full-width-table th {
                        white-space: nowrap;
                        overflow: visible;
                      }
                    `
                  }} />
                  <table className="w-full border-collapse text-sm text-gray-700 full-width-table" style={{ tableLayout: 'fixed' }}>
                      <thead>
                          <tr className="bg-blue-50">
                              <th className="border border-gray-300 px-1 py-1 text-left text-xs" style={{ width: '40px' }}>S.I.</th>
                              <th className="border border-gray-300 px-1 py-1 text-left text-xs" style={{ width: '90px' }}>Item Code</th>
                              <th className="border border-gray-300 px-1 py-1 text-left text-xs" style={{ width: '150px' }}>Item Name</th>
                              <th className="border border-gray-300 px-1 py-1 text-right text-xs" style={{ width: '70px' }}>Tax (%)</th>
                              <th className="border border-gray-300 px-1 py-1 text-right text-xs" style={{ width: '80px' }}>Rate</th>
                              <th className="border border-gray-300 px-1 py-1 text-right text-xs" style={{ width: '90px' }}>Amount</th>
                              <th className="border border-gray-300 px-1 py-1 text-right text-xs" style={{ width: '60px' }}>Qty</th>
                              <th className="border border-gray-300 px-1 py-1 text-right text-xs" style={{ width: '90px' }}>Discount Amt</th>
                              <th className="border border-gray-300 px-1 py-1 text-right text-xs" style={{ width: '90px' }}>Discount %</th>
                              <th className="border border-gray-300 px-1 py-1 text-xs" style={{ width: '70px' }}>Action</th>
                          </tr>
                      </thead>
                      <tbody>
                          {formData.selectedItems.length === 0 ? (
                               <tr>
                                   <td colSpan={10} className="text-center border border-gray-300 py-4 text-gray-500">No items added yet.</td>
                               </tr>
                          ) : (
                              formData.selectedItems.map((item, index) => (
                                  <tr key={index}>
                                      <td className="border border-gray-300 px-1 py-1 text-xs text-left">{item.si}</td>
                                      <td className="border border-gray-300 px-1 py-1 text-xs text-left">{item.itemCode}</td>
                                      <td className="border border-gray-300 px-1 py-1 text-xs text-left">{item.itemName}</td>
                                      <td className="border border-gray-300 px-1 py-1 text-xs text-right">
                                        <Input
                                          value={item.taxPercent}
                                          name={`selectedItems.${index}.taxPercent`}
                                          onChange={e => {
                                            const value = parseFloat(e.target.value) || 0;
                                            setFormData(prev => {
                                              const updatedItems = [...prev.selectedItems];
                                              updatedItems[index].taxPercent = value;
                                              
                                              // Calculate base price (before tax)
                                              const baseRate = updatedItems[index].rate;
                                              const qty = updatedItems[index].qty;
                                              const baseTotal = baseRate * qty;
                                              
                                              // Calculate tax amount
                                              const taxAmount = (baseTotal * value) / 100;
                                              
                                              // Calculate total amount with tax
                                              const totalWithTax = baseTotal + taxAmount;
                                              
                                              // Apply any existing discount
                                              const discountAmount = updatedItems[index].discountAmount || 0;
                                              updatedItems[index].amount = parseFloat((totalWithTax - discountAmount).toFixed(2));
                                              
                                              // Update discount percentage if there's a discount
                                              if (discountAmount > 0) {
                                                updatedItems[index].discountPercent = totalWithTax === 0 ? 0 : 
                                                  parseFloat(((discountAmount / totalWithTax) * 100).toFixed(2));
                                              }
                                              
                                              return { ...prev, selectedItems: updatedItems };
                                            });
                                          }}
                                          type="number"
                                          step="0.01"
                                          className="w-12 text-right text-xs px-1 py-0.5"
                                          placeholder="0.00"
                                        />
                                      </td>
                                      <td className="border border-gray-300 px-1 py-1 text-xs text-right">
                                        <Input
                                          value={item.rate}
                                          name={`selectedItems.${index}.rate`}
                                          onChange={e => {
                                            const value = parseFloat(e.target.value) || 0;
                                            setFormData(prev => {
                                              const updatedItems = [...prev.selectedItems];
                                              updatedItems[index].rate = value;
                                              
                                              // Get quantity and tax percentage
                                              const qty = updatedItems[index].qty;
                                              const taxPercent = updatedItems[index].taxPercent || 0;
                                              
                                              // Calculate base total (without tax)
                                              const baseTotal = value * qty;
                                              
                                              // Calculate tax amount
                                              const taxAmount = (baseTotal * taxPercent) / 100;
                                              
                                              // Calculate total with tax
                                              const totalWithTax = baseTotal + taxAmount;
                                              
                                              // Apply any existing discount
                                              const discountAmount = updatedItems[index].discountAmount || 0;
                                              updatedItems[index].amount = parseFloat((totalWithTax - discountAmount).toFixed(2));
                                              
                                              // Recalculate discount % based on new rate and fixed discount amount
                                              updatedItems[index].discountPercent = totalWithTax === 0 ? 0 : 
                                                parseFloat(((discountAmount / totalWithTax) * 100).toFixed(2));

                                              return { ...prev, selectedItems: updatedItems };
                                            });
                                          }}
                                          type="number"
                                          step="0.01"
                                          className="w-14 text-right text-xs px-1 py-0.5"
                                          placeholder="0.00"
                                        />
                                      </td>
                                      <td className="border border-gray-300 px-1 py-1 text-xs text-right">
                                        {(() => {
                                          // Calculate base amount (rate * qty)
                                          const baseAmount = item.rate * item.qty;
                                          // Calculate tax amount if tax percent is set
                                          const taxAmount = item.taxPercent ? (baseAmount * item.taxPercent) / 100 : 0;
                                          // Calculate total with tax
                                          const totalWithTax = baseAmount + taxAmount;
                                          // Apply discount if any
                                          const finalAmount = totalWithTax - (item.discountAmount || 0);
                                          // Update the item's amount in state
                                          if (Math.abs(item.amount - finalAmount) > 0.01) { // Only update if there's a significant difference
                                            setTimeout(() => {
                                              setFormData(prev => {
                                                const updatedItems = [...prev.selectedItems];
                                                updatedItems[index].amount = parseFloat(finalAmount.toFixed(2));
                                                return { ...prev, selectedItems: updatedItems };
                                              });
                                            }, 0);
                                          }
                                          return finalAmount.toFixed(2);
                                        })()}
                                      </td>
                                      <td className="border border-gray-300 px-1 py-1 text-xs text-right">
                                        <Input
                                          value={item.qty}
                                          name={`selectedItems.${index}.qty`}
                                          onChange={e => {
                                            const value = parseInt(e.target.value) || 1;
                                            setFormData(prev => {
                                              const updatedItems = [...prev.selectedItems];
                                              updatedItems[index].qty = value;
                                              
                                              // Get rate and tax percentage
                                              const rate = updatedItems[index].rate;
                                              const taxPercent = updatedItems[index].taxPercent || 0;
                                              
                                              // Calculate base total (without tax)
                                              const baseTotal = rate * value;
                                              
                                              // Calculate tax amount
                                              const taxAmount = (baseTotal * taxPercent) / 100;
                                              
                                              // Calculate total with tax
                                              const totalWithTax = baseTotal + taxAmount;
                                              
                                              // Apply any existing discount
                                              const discountAmount = updatedItems[index].discountAmount || 0;
                                              updatedItems[index].amount = parseFloat((totalWithTax - discountAmount).toFixed(2));
                                              
                                              // Recalculate discount % based on new qty and fixed discount amount
                                              updatedItems[index].discountPercent = totalWithTax === 0 ? 0 : 
                                                parseFloat(((discountAmount / totalWithTax) * 100).toFixed(2));
                                              return { ...prev, selectedItems: updatedItems };
                                            });
                                          }}
                                          type="number"
                                          min="1"
                                          className="w-10 text-right text-xs px-1 py-0.5"
                                          placeholder="1"
                                        />
                                      </td>
                                      <td className="border border-gray-300 px-1 py-1 text-xs text-right">
                                        <Input
                                          value={item.discountAmount}
                                          name={`selectedItems.${index}.discountAmount`}
                                          onChange={e => handleItemDiscountChange(index, 'fixed', e.target.value)}
                                          type="number"
                                          step="0.01"
                                          className="w-14 text-right text-xs px-1 py-0.5"
                                          placeholder="0.00"
                                        />
                                      </td>
                                      <td className="border border-gray-300 px-1 py-1 text-xs text-right">
                                        <Input
                                          value={item.discountPercent}
                                          name={`selectedItems.${index}.discountPercent`}
                                          onChange={e => handleItemDiscountChange(index, 'percentage', e.target.value)}
                                          type="number"
                                          step="0.01"
                                          className="w-14 text-right text-xs px-1 py-0.5"
                                          placeholder="0.00"
                                        />
                                      </td>
                                      <td className="border border-gray-300 px-1 py-1 text-xs text-center">
                                          <Button variant="danger" size="sm" onClick={() => handleDeleteItem(index)}>Delete</Button>
                                      </td>
                                  </tr>
                              )))}
                      </tbody>
                  </table>
                  {/* Apply Discount Section */}
                  <div className="flex justify-between items-center mt-3 p-2 bg-gray-50 rounded border">
                    <div className="flex items-center space-x-4">
                      <span className="text-xs font-medium">Discount Type:</span>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="discountType"
                          value="percentage"
                          checked={formData.discountType === 'percentage'}
                              onChange={handleChange} // Use main handleChange
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-1 text-xs">%</span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="discountType"
                          value="fixed"
                          checked={formData.discountType === 'fixed'}
                              onChange={handleChange} // Use main handleChange
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="ml-1 text-xs">Fixed Amount</span>
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs font-medium">
                        {formData.discountType === 'percentage' ? 'Discount %:' : 'Discount Amount:'}
                      </label>
                      <Input
                        value={formData.applyDiscount}
                        name="applyDiscount"
                            onChange={handleChange} // Use main handleChange
                        className="w-16 text-right text-xs px-1 py-0.5"
                        placeholder={formData.discountType === 'percentage' ? '0.00%' : '0.00'}
                      />
                      <Button
                        type="button"
                        variant="action"
                        size="sm"
                        className="text-xs"
                        onClick={handleApplyDiscount}
                      >
                        Apply Disc
                      </Button>
                    </div>
                  </div>
             </div>
         </div>
        {/* Remarks and Payment Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Remarks and Status */}
            <RemarksAndStatusSection
                formData={formData}
                handleChange={handleChange}
            />
            {/* Payment Section */} 
            <PaymentSection
                formData={formData}
                handleNumericInputChange={handleNumericInputChange}
            />
        </div>

        {/* Bottom Buttons */}
        <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4 mt-8">
          <Button type="submit" variant="action">&#60;&#60; Add Order Card &#62;&#62;</Button>
          {/* These buttons might need logic to interact with search/edit/print features */} 
          <Button type="button" variant="action">&#60;&#60; Edit/Search Order Card &#62;&#62;</Button>
          <Button type="button" variant="action">&#60;&#60; Print Order Card &#62;&#62;</Button>
          <Button type="button" variant="action" onClick={handleClear}>&#60;&#60; Clear Order &#62;&#62;</Button>
          <Button type="button" variant="action">&#60;&#60; Exit &#62;&#62;</Button>
        </div>

      </Card>

      {/* Render the Toast Notification */}
      {notification.visible && (
      <ToastNotification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, visible: false })}
      />
      )}

      {/* Item Selection Popup */}
      {showItemSelectionPopup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="relative p-6 border w-11/12 md:w-1/3 shadow-lg rounded-md bg-white">
            <h4 className="text-lg font-semibold mb-4 border-b pb-2 text-blue-700">Select Item Type</h4>
            <div className="space-y-4">
              <Button 
                type="button" 
                variant="action" 
                className="w-full text-left justify-start"
                onClick={() => handleAddItemClick('Frames')}
              >
                Add Frames
              </Button>
              <Button 
                type="button" 
                variant="action" 
                className="w-full text-left justify-start"
                onClick={() => handleAddItemClick('Sun Glasses')}
              >
                Add Sunglasses
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => setShowItemSelectionPopup(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Popup */}
      {showManualEntryPopup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="relative p-6 border w-11/12 md:w-2/3 lg:w-1/3 shadow-lg rounded-md bg-white">
            <h4 className="text-lg font-semibold mb-4 border-b pb-2 text-blue-700">
              Add {formData.manualEntryType} Manually
            </h4>
            <div className="mb-4">
              {/* Assuming RadioGroup is needed, it was in the original CustomerInfoSection */} 
              <RadioGroup
                label="Type:"
                name="manualEntryType"
                options={[
                  { label: 'Frames', value: 'Frames' },
                  { label: 'Sun Glasses', value: 'Sun Glasses' }
                ]}
                value={formData.manualEntryType}
                onChange={handleManualEntryChange}
              />
            </div>
            <div className="space-y-3 text-gray-700">
              <Input label="Item Name:" value={formData.manualEntryItemName} name="manualEntryItemName" onChange={handleManualEntryChange} />
              <Input label="Rate:" value={formData.manualEntryRate} name="manualEntryRate" onChange={handleManualEntryChange} type="number" step="0.01" />
              <Input label="Quantity:" value={formData.manualEntryQty} name="manualEntryQty" onChange={handleManualEntryChange} type="number" min="1" />
              <Input label="Item Amount:" value={formData.manualEntryItemAmount.toFixed(2)} name="manualEntryItemAmount" readOnly />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setShowManualEntryPopup(false)}>Cancel</Button>
              <Button type="button" variant="action" onClick={() => {
                if (!formData.manualEntryItemName || !formData.manualEntryRate) {
                  setNotification({
                    message: 'Please enter both item name and rate',
                    type: 'error',
                    visible: true,
                  });
                  return;
                }
                const newItem: SelectedItem = {
                  si: formData.selectedItems.length + 1,
                  itemCode: generateItemCode(formData.manualEntryType), // Assuming generateItemCode exists
                  itemName: formData.manualEntryItemName,
                  unit: 'PCS',
                  taxPercent: 0,
                  rate: parseFloat(formData.manualEntryRate),
                  qty: formData.manualEntryQty || 1,
                  amount: parseFloat(formData.manualEntryRate) * (formData.manualEntryQty || 1),
                  discountAmount: 0,
                  discountPercent: 0
                };
                setFormData(prev => ({
                  ...prev,
                  selectedItems: [...prev.selectedItems, newItem],
                  manualEntryItemName: '',
                  manualEntryRate: '',
                  manualEntryQty: 1,
                  manualEntryItemAmount: 0
                }));
                setShowManualEntryPopup(false);
                 setNotification({
                   message: 'Manual item added',
                   type: 'success',
                   visible: true
                 });
              }}>Add</Button>
            </div>
          </div>
        </div>
      )}

      {/* Lens Entry Popup */}
      {showLensEntryPopup && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="relative p-6 border w-11/12 md:w-2/3 lg:w-1/3 shadow-lg rounded-md bg-white">
            <h4 className="text-lg font-semibold mb-4 border-b pb-2 text-blue-700">Add Lenses Manually</h4>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <Input label="Brand Name" value={lensEntry.brandName} name="brandName" onChange={e => setLensEntry({ ...lensEntry, brandName: e.target.value })} />
              <Input label="Item Name" value={lensEntry.itemName} name="itemName" onChange={e => setLensEntry({ ...lensEntry, itemName: e.target.value })} />
            </div>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <Input label="Index" value={lensEntry.index} name="index" onChange={e => setLensEntry({ ...lensEntry, index: e.target.value })} />
              <Input label="Coating" value={lensEntry.coating} name="coating" onChange={e => setLensEntry({ ...lensEntry, coating: e.target.value })} />
            </div>
            <div className="mb-2 grid grid-cols-3 gap-2">
              <Input label="Rate" value={lensEntry.rate} name="rate" type="number" onChange={e => {
                const rate = e.target.value;
                const qty = lensEntry.qty === '' ? 1 : parseInt(lensEntry.qty);
                setLensEntry(le => ({ ...le, rate, itemAmount: rate && qty ? (parseFloat(rate) * qty).toString() : '' }));
              }} />
              <Input label="Qty" value={lensEntry.qty} name="qty" type="number" min="1" onChange={e => {
                const qty = e.target.value;
                const rate = lensEntry.rate === '' ? 0 : parseFloat(lensEntry.rate);
                setLensEntry(le => ({ ...le, qty, itemAmount: qty && rate ? (rate * parseInt(qty)).toString() : '' }));
              }} />
              <Input label="Item Amount" value={lensEntry.itemAmount} name="itemAmount" readOnly />
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setShowLensEntryPopup(false)}>Cancel</Button>
              <Button type="button" variant="action" onClick={() => {
                if (!lensEntry.itemName || !lensEntry.rate) { setNotification({ message: 'Please enter item name and rate', type: 'error', visible: true }); return; }
                const newItem: SelectedItem = {
                  si: formData.selectedItems.length + 1,
                  itemCode: generateItemCode('Lens'), // Assuming generateItemCode exists
                  itemName: lensEntry.itemName,
                  unit: 'PCS',
                  taxPercent: 0,
                  rate: parseFloat(lensEntry.rate),
                  qty: lensEntry.qty ? parseInt(lensEntry.qty) : 1,
                  amount: lensEntry.itemAmount ? parseFloat(lensEntry.itemAmount) : 0,
                  discountAmount: 0,
                  discountPercent: 0,
                  brandName: lensEntry.brandName,
                  index: lensEntry.index,
                  coating: lensEntry.coating
                };
                setFormData(prev => ({ ...prev, selectedItems: [...prev.selectedItems, newItem] }));
                setLensEntry({ brandName: '', itemName: '', index: '', coating: '', rate: '', qty: '', itemAmount: '' });
                setShowLensEntryPopup(false);
                 setNotification({
                   message: 'Lens item added',
                   type: 'success',
                   visible: true
                 });
              }}>Add</Button>
            </div>
          </div>
        </div>
      )}
      {/* Save Order Button */}
      <div className="mt-6 flex justify-end">
        <Button 
          type="button" 
          variant="action" 
          onClick={saveOrderToDatabase}
        >
          Save Order
        </Button>
      </div>
    </form>
  );
};

export default OrderCardForm;