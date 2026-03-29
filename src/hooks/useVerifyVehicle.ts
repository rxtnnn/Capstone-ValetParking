import { useState } from 'react';
import apiClient from '../config/api';
import { API_ENDPOINTS } from '../constants/AppConst';

export type VerifyResult = {
  found: boolean;
  valid?: boolean;
  status?: string;
  message: string;
  user_name?: string;
  user_role?: string;
  vehicle_plate?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  uid?: string;
  expiry_date?: string;
};

export function useVerifyVehicle() {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyMode, setVerifyMode] = useState<'rfid' | 'plate'>('rfid');
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const handleVerify = async () => { //verify vehicle
    const value = verifyInput.trim();
    if (!value) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await apiClient.post(API_ENDPOINTS.publicVerifyVehicle, { mode: verifyMode, value });
      setVerifyResult(res.data);
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
