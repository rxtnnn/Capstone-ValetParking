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
        // Guest lookup by Guest ID — POST /public/guest/verify
        const res = await apiClient.post(API_ENDPOINTS.publicGuestVerify, {
          guest_id: value.toUpperCase(),
          gate_mac: '',
        });
        const d = res.data;
        // Flatten the nested guest object into VerifyResult
        setVerifyResult({
          found: d.valid === true,
          valid: d.valid,
          message: d.message,
          is_guest: true,
          user_name: d.guest?.name,
          vehicle_plate: d.guest?.vehicle_plate,
          purpose: d.guest?.purpose,
          entry_time: d.guest?.entry_time,
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
