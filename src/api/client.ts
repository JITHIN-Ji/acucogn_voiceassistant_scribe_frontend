import axios from 'axios';
import type { ApprovePlanPayload, ApprovePlanResponse, ProcessAudioResponse, RootResponse, UserChatPayload, UserChatResponse, CreatePatientPayload, PatientResponse } from '../types';

const baseURL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://web-application-voice-assitant.onrender.com';

// If the app is served by Vite with a proxy, you can set useProxy = true
const useProxy = false; // set to true to route via /api proxy

const instance = axios.create({
  baseURL: useProxy ? '/api' : baseURL,
});

export const api = {
  async getRoot(): Promise<RootResponse> {
    const res = await instance.get('/');
    return res.data;
  },

  async processAudio(file: File, isRealtime: boolean = false): Promise<ProcessAudioResponse> {
    const form = new FormData();
    form.append('audio', file);
    form.append('is_realtime', isRealtime ? 'true' : 'false');
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
};


