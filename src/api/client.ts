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

const baseURL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://web-application-voice-assitant.onrender.com';


const useProxy = false; 

const instance = axios.create({
  baseURL: useProxy ? '/api' : baseURL,
});


instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      
      localStorage.removeItem('auth_token');
      
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export const authApi = {
  async googleAuth(googleToken: string): Promise<{
    status: string;
    token: string;
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

  async processAudio(file: File, isRealtime: boolean = false, patientTokenId?: string): Promise<ProcessAudioResponse> {
    const form = new FormData();
    form.append('audio', file);
    form.append('is_realtime', isRealtime ? 'true' : 'false');
    if (patientTokenId) {
      form.append('patient_token_id', patientTokenId);
    }
    const res = await instance.post('/process_audio', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
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
      params: sessionId ? { session_id: sessionId } : {}
    });
    return res.data;
  },

  async getPatient(tokenId: string): Promise<PatientResponse> {
    const res = await instance.get(`/patients/${tokenId}`);
    return res.data;
  },

  async getPatientSoapRecords(patientTokenId: string): Promise<{
    status: string;
    patient_token_id: string;
    soap_records: Array<{
      id: number;
      patient_token_id: string;
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
    const res = await instance.get(`/patient/${patientTokenId}/soap_records`);
    return res.data;
  },

  async updateSoapRecord(recordId: number, soapSections: Record<string, string>): Promise<{
    status: string;
    message: string;
    record_id: number;
  }> {
    const res = await instance.put(`/soap_record/${recordId}`, {
      soap_sections: soapSections
    });
    return res.data;
  },


  getAudioUrl(storagePath: string): string {
  
  const base = useProxy ? '/api' : baseURL;
  return `${base}/download_audio?storage_path=${encodeURIComponent(storagePath)}`;
},
};



