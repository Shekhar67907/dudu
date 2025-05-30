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
// Define this before the component where it's used
const initialFormState: PrescriptionFormData = {
  prescriptionNo: '',
  referenceNo: '',
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

  // Payment Section: Auto-calculate Payment Estimate and Sch Amt from selectedItems
  useEffect(() => {
    // Payment Estimate: sum of (rate * qty) for all items
    const paymentEstimate = formData.selectedItems.reduce((sum, item) => sum + (item.rate * item.qty), 0);
    // Sch Amt: sum of all discountAmount fields
    const schAmt = formData.selectedItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
    // Advance: user input, default to 0 if empty
    const advance = formData.advance === '' ? 0 : parseFloat(formData.advance);
    // Balance: Payment Estimate - Sch Amt - Advance
    const balance = paymentEstimate - schAmt - advance;
    setFormData(prev => ({
      ...prev,
      paymentEstimate: paymentEstimate.toFixed(2),
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
        
        // Use Supabase to query the database with join to eye_prescriptions and prescription_remarks
        console.log(`Executing query for ${column}=${query}`);
        let { data, error } = await supabase
          .from('prescriptions')
          .select(`
            *,
            eye_prescriptions(id, prescription_id, eye_type, vision_type, sph, cyl, ax, add_power, vn, rpd, lpd),
            prescription_remarks(*)
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
              prescription_remarks(*)
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
        // Check if eye_prescriptions and prescription_remarks arrays exist
        const eyePrescriptions = item.eye_prescriptions || [];
        const prescriptionRemarks = item.prescription_remarks || [];
        
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
          selectedItems: [],
          orderStatus: 'Processing',
          orderStatusDate: '',
          retestAfter: item.retest_after || '',
          billNo: '',
          // Payment related fields
          paymentEstimate: '0.00',
          schAmt: '0.00',
          advance: '0.00',
          balance: '0.00',
          cashAdv1: '0.00',
          ccUpiAdv: '0.00',
          chequeAdv: '0.00',
          cashAdv2: '0.00',
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
          deliveryDateTime: ''
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
    // Populate form data with the selected suggestion's data
    setFormData(prevData => ({
      ...prevData,
      // Personal Info
      name: suggestion.name || '',
      // Ensure age is treated as string for the input value
      age: suggestion.age?.toString() || '',
      gender: suggestion.gender || 'Male',
      customerCode: suggestion.customerCode || '',
      // Format dates for datetime-local input if necessary
      birthDay: formatDateForInput(suggestion.birthDay), // Assuming birthDay is a date string
      marriageAnniversary: formatDateForInput(suggestion.marriageAnniversary), // Assuming marriageAnniversary is a date string
      address: suggestion.address || '',
      city: suggestion.city || '',
      state: suggestion.state || '',
      pinCode: suggestion.pinCode || '',
      phoneLandline: suggestion.phoneLandline || '',
      mobileNo: suggestion.mobileNo || '',
      email: suggestion.email || '',
      ipd: suggestion.ipd || '',
      prescribedBy: suggestion.prescribedBy || '', // Assuming prescribedBy is on the Prescription object

      // Order Info
      prescriptionNo: suggestion.prescriptionNo || '',
      referenceNo: suggestion.referenceNo || '',
      // Note: currentDateTime and deliveryDateTime are not part of the search result typically,
      // so we keep the existing values or generate new ones as per initial state logic.
      // If you intend to load these from search, update the SearchSuggestion interface and this mapping.
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
          add: suggestion.rightEye?.nv?.add|| '',
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
          add: suggestion.leftEye?.dv?.add || '',
          vn: suggestion.leftEye?.dv?.vn || '6/', // Default if empty
          lpd: suggestion.leftEye?.dv?.lpd || ''
        },
        nv: {
          ...prevData.leftEye.nv, // Preserve other leftEye NV properties if any
          sph: suggestion.leftEye?.nv?.sph || '',
          cyl: suggestion.leftEye?.nv?.cyl || '',
          ax: suggestion.leftEye?.nv?.ax || '',
          add: suggestion.leftEye?.nv?.add || '',
          vn: suggestion.leftEye?.nv?.vn || 'N' // Default if empty
        }
      },
      balanceLens: suggestion.balanceLens || false, // Assuming balanceLens is on the Prescription object
      remarks: suggestion.remarks || { // Initialize remarks as an object if null/undefined from search
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
      orderStatus: suggestion.orderStatus || 'Processing', // Assuming orderStatus is on the Prescription object
      orderStatusDate: formatDateForInput(suggestion.orderStatusDate), // Assuming orderStatusDate is on the Prescription object
      retestAfter: formatDateForInput(suggestion.retestAfter), // Assuming retestAfter is on the Prescription object
      billNo: suggestion.billNo || '', // Assuming billNo is on the Prescription object
      // Keep other fields as they are not typically loaded from a basic prescription search
      selectedItems: prevData.selectedItems,
      paymentEstimate: prevData.paymentEstimate,
      schAmt: prevData.schAmt,
      advance: prevData.advance,
      balance: prevData.balance,
      cashAdv1: prevData.cashAdv1,
      ccUpiAdv: prevData.ccUpiAdv,
      chequeAdv: prevData.chequeAdv,
      cashAdv2: prevData.cashAdv2,
      cashAdv2Date: prevData.cashAdv2Date,
      applyDiscount: prevData.applyDiscount,
      discountType: prevData.discountType,
      discountValue: prevData.discountValue,
      discountReason: prevData.discountReason,
      manualEntryType: prevData.manualEntryType,
      manualEntryItemName: prevData.manualEntryItemName,
      manualEntryRate: prevData.manualEntryRate,
      manualEntryQty: prevData.manualEntryQty,
      manualEntryItemAmount: prevData.manualEntryItemAmount,
      others: suggestion.others || '', // Assuming others is on the Prescription object
      status: suggestion.status || '', // Assuming status is on the Prescription object

    }));
    setActiveField(null);
    setSuggestions([]);
     setNotification({
       message: 'Prescription data loaded from search',
       type: 'success',
       visible: true
     });
  };

  // Keep existing handleChange for non-search fields and nested updates
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    console.log('Order Card Form Submitted:', formData);
    
    // Call the function to save the order to the database
    saveOrderToDatabase();
  };
  
  // Function to save order data to the database
  const saveOrderToDatabase = async () => {
    try {
      console.log('Saving order to database...');
      
      // First, get the prescription ID from the prescription number
      const { data: prescriptions, error: prescError } = await supabase
        .from('prescriptions')
        .select('id')
        .eq('prescription_no', formData.prescriptionNo)
        .single();
      
      if (prescError || !prescriptions) {
        console.error('Error finding prescription:', prescError instanceof Error ? prescError.message : 'Unknown error');
        setNotification({
          message: `Error: Could not find prescription with number ${formData.prescriptionNo}`,
          type: 'error',
          visible: true
        });
        return;
      }
      
      console.log('Found prescription:', prescriptions);
      const prescriptionId = prescriptions.id;
      
      // Use the existing order number or generate a new one
      const orderNumber = formData.referenceNo || `ORD-${Date.now()}`;
      
      // First check if an order with this order number already exists
      const { data: existingOrder, error: orderCheckError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_no', orderNumber)
        .single();
      
      console.log('Existing order check:', existingOrder);
      
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
        items: formData.selectedItems.map((item, index) => ({
          si: index + 1,
          itemType: 'unknown', // Default to unknown since itemType is not in SelectedItem
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
        })),
        
        // Map payment details
        payment: {
          paymentEstimate: parseFloat(formData.paymentEstimate || '0'),
          taxAmount: 0, // Calculated tax
          discountAmount: 0, // Total discount
          finalAmount: parseFloat(formData.paymentEstimate || '0'), // Final amount after tax and discount
          advanceCash: parseFloat(formData.cashAdv1 || '0'),
          advanceCardUpi: parseFloat(formData.ccUpiAdv || '0'),
          advanceOther: parseFloat(formData.chequeAdv || '0'),
          scheduleAmount: parseFloat(formData.schAmt || '0')
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
          const orderItems = orderData.items.map((item, index) => ({
            order_id: existingOrder.id,
            si: item.si,
            item_type: item.itemType,
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
          }));
          
          const { error: itemsInsertError } = await supabase
            .from('order_items')
            .insert(orderItems);
            
          if (itemsInsertError) {
            console.error('Error inserting order items:', itemsInsertError);
            throw new Error(`Failed to insert order items: ${itemsInsertError.message}`);
          }
          
          // 4. Update payment record
          const { error: paymentUpdateError } = await supabase
            .from('order_payments')
            .update({
              payment_estimate: orderData.payment.paymentEstimate,
              tax_amount: orderData.payment.taxAmount,
              discount_amount: orderData.payment.discountAmount,
              final_amount: orderData.payment.finalAmount,
              advance_cash: orderData.payment.advanceCash,
              advance_card_upi: orderData.payment.advanceCardUpi,
              advance_other: orderData.payment.advanceOther,
              schedule_amount: orderData.payment.scheduleAmount
            })
            .eq('order_id', existingOrder.id);
            
          if (paymentUpdateError) {
            console.error('Error updating payment:', paymentUpdateError);
            throw new Error(`Failed to update payment: ${paymentUpdateError.message}`);
          }
          
          console.log('Successfully updated order and related records');
          result = { 
            success: true, 
            message: 'Order updated successfully', 
            orderId: existingOrder.id 
          };
        } catch (updateError) {
          console.error('Error during order update process:', updateError);
          result = { 
            success: false, 
            message: updateError instanceof Error ? updateError.message : 'Unknown error during update' 
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
          message: `Error: ${result ? result.message : 'Unknown error'}`,
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
                handleChange={handleChange}
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