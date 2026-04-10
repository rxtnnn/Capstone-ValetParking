import { useState } from 'react';
import apiClient from '../config/api';
import { API_ENDPOINTS } from '../constants/AppConst';

export type VerifyResult = {
  found: boolean;
  valid?: boolean;
  status?: string;
  message: string;
  // Registered user fields
  user_name?: string;
  user_role?: string;
  vehicle_plate?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  uid?: string;
  expiry_date?: string;
  // Guest fields
  is_guest?: boolean;
  purpose?: string;
  valid_from?: string;
  valid_until?: string;
  entry_time?: string;
};

export function useVerifyVehicle() {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMode, setVerifyMode] = useState<'rfid' | 'plate'>('rfid');
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const handleVerify = async () => {
    const value = verifyInput.trim();
    if (!value) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      if (verifyMode === 'plate') {
        // Guest lookup by plate — GET /api/guest-access/verify/{plate} (auth, no status change)
        const res = await apiClient.get(API_ENDPOINTS.guestAccessVerify(value.toUpperCase()));
        const d = res.data;
        const guest = d?.data ?? d;
        const found = d?.success !== false && !!guest?.id;
        setVerifyResult({
          found,
          valid: found && guest?.status === 'active',
          message: found
            ? guest?.status === 'active'
              ? 'Active guest pass found'
              : `Guest pass is ${guest?.status}`
            : 'No guest pass found for this plate',
          is_guest: true,
          user_name: guest?.name,
          vehicle_plate: guest?.vehicle_plate,
          purpose: guest?.purpose,
          valid_from: guest?.valid_from,
          valid_until: guest?.valid_until,
          status: guest?.status,
        });
      } else {
        // RFID lookup — uses general vehicle verify endpoint
        const res = await apiClient.post(API_ENDPOINTS.publicVerifyVehicle, { mode: 'rfid', value });
        setVerifyResult(res.data);
      }
    } catch {
      setVerifyResult({ found: false, message: 'Verification failed. Check connection.' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const resetVerify = () => {
    setVerifyInput('');
    setVerifyResult(null);
    setVerifyMode('rfid');
  };

  return {
    showVerifyModal,
    setShowVerifyModal,
    verifyMode,
    setVerifyMode,
    verifyInput,
    setVerifyInput,
    verifyLoading,
    verifyResult,
    setVerifyResult,
    handleVerify,
    resetVerify,
  };
}
