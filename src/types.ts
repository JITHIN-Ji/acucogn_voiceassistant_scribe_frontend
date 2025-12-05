export type RootResponse = {
  message: string;
};

export type ProcessAudioResponse = {
  transcript: string;
  original_transcript?: string | null;  // Original transcript for Option 1 (real-time)
  diarized_segments: unknown;
  soap_sections: Record<string, unknown> | string;
  audio_file_name: string;
  soap_record_id?: number;  // Database record ID if saved
};

export type ApprovePlanPayload = {
  plan_section: string;
  user_email?: string;
  send_email?: boolean;
  email_content?: string; // Doctor's edited email content
};

export type ApprovePlanResponse = {
  status?: string;
  message?: string;
  appointment_preview?: {
    status?: string;
    email_content?: string;
    message?: string;
  };
  appointment_sending?: {
    status?: string;
    result?: unknown;
    message?: string;
    error?: string;
  };
};

export type UserChatPayload = {
  question: string;
  soap_summary: {
    S?: string;
    O?: string;
    A?: string;
    P?: string;
    Subjective?: string;
    Objective?: string;
    Assessment?: string;
    Plan?: string;
  };
};

export type UserChatResponse = {
  status: string;
  is_relevant?: boolean;
  answer: string;
  forwarded_to_doctor?: boolean;
  message?: string;
};

export type Patient = {
  id: number;
  name: string;
  address?: string;
  phone_number?: string;
  problem?: string;
  created_at?: string;
};

export type CreatePatientPayload = {
  name: string;
  address?: string;
  phone_number?: string;
  problem?: string;
};

export type PatientResponse = {
  status: string;
  message?: string;
  patient?: Patient;
  patients?: Patient[];
};


