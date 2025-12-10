import axios from 'axios';
import type { 
  ApprovePlanPayload, 
  ApprovePlanResponse, 
  ProcessAudioResponse, 
  RootResponse, 
  UserChatPayload, 
  UserChatResponse, 
  CreatePatientPayload, 
  PatientResponse 
} from '../types';

const baseURL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000';

const useProxy = false; 

const instance = axios.create({
  baseURL: useProxy ? '/api' : baseURL,
  withCredentials: true,  
});


instance.defaults.headers.common['Cache-Control'] = 'no-store'
instance.defaults.headers.common['Pragma'] = 'no-cache'
instance.defaults.headers.common['Expires'] = '0'


export const authApi = {
  async googleAuth(googleToken: string): Promise<{
    status: string;
    
    user: {
      email: string;
      name: string;
      picture: string;
    };
  }> {
    const res = await instance.post('/auth/google', { token: googleToken });
    return res.data;
  },

  async verifyToken(): Promise<{
    status: string;
    user: {
      email: string;
      name: string;
      picture: string;
    };
  }> {
    const res = await instance.get('/auth/verify');
    return res.data;
  },

  async refreshToken(): Promise<{
    status: string;
    message: string;
  }> {
    const res = await instance.post('/auth/refresh');
    return res.data;
  },

  async logout(): Promise<{ status: string; message: string }> {
    const res = await instance.post('/auth/logout');
    return res.data;
  },
};


export const api = {
  async getRoot(): Promise<RootResponse> {
    const res = await instance.get('/');
    return res.data;
  },

  async processAudio(file: File, isRealtime: boolean = false, patientId?: number): Promise<ProcessAudioResponse> {
    const form = new FormData();
    form.append('audio', file);
    form.append('is_realtime', isRealtime ? 'true' : 'false');
    if (typeof patientId !== 'undefined' && patientId !== null) {
      form.append('patient_id', String(patientId));
    }
    const res = await instance.post('/process_audio', form, {
      headers: { 'Content-Type': 'multipart/form-data', 'Cache-Control': 'no-store' },
    });
    return res.data;
  },

  async approvePlan(payload: ApprovePlanPayload): Promise<ApprovePlanResponse> {
    const res = await instance.post('/approve_plan', payload);
    return res.data;
  },

  async userChat(payload: UserChatPayload): Promise<UserChatResponse> {
    const res = await instance.post('/user_chat', payload);
    return res.data;
  },

  async createPatient(payload: CreatePatientPayload & { session_id?: string }): Promise<PatientResponse> {
    const res = await instance.post('/patients', payload);
    return res.data;
  },

  async getPatients(sessionId?: string): Promise<PatientResponse> {
    const res = await instance.get('/patients', {
      params: sessionId ? { session_id: sessionId } : {},
      headers: { 'Cache-Control': 'no-store' }
    });
    return res.data;
  },

  async getPatient(tokenId: string): Promise<PatientResponse> {
    const res = await instance.get(`/patients/${tokenId}`, { headers: { 'Cache-Control': 'no-store' } });
    return res.data;
  },

  async getPatientSoapRecords(patientId: number): Promise<{
    status: string;
    patient_id: number;
    soap_records: Array<{
      id: number;
      patient_id: number;
      audio_file_name: string;
      storage_path?: string;
      transcript: string;
      original_transcript?: string;
      soap_sections: Record<string, any>;
      created_at: string;
      updated_at: string;
    }>;
    total_records: number;
  }> {
    const res = await instance.get(`/patient/${patientId}/soap_records`, { headers: { 'Cache-Control': 'no-store' } });
    return res.data;
  },

  async updateSoapRecord(recordId: number, soapSections: Record<string, string>): Promise<{
    status: string;
    message: string;
    record_id: number;
  }> {
    const res = await instance.put(`/soap_record/${recordId}`, {
      soap_sections: soapSections
    }, { headers: { 'Cache-Control': 'no-store' } });
    return res.data;
  },

  getAudioUrl(storagePath: string): string {
    const base = useProxy ? '/api' : baseURL;
    return `${base}/download_audio?storage_path=${encodeURIComponent(storagePath)}`;
  },
};