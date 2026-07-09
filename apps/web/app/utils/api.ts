// apps/web/app/utils/api.ts
import { loadSession } from '@/lib/auth'; // Adjust import path if needed

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // 1. Fetch your stored browser token
  const session = loadSession();
  const token = session?.token;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // 2. Inject the Authorization Bearer block dynamically
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API error: ${response.status}`);
  }
  return response.json();
}

export const nutritionistApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDashboard: () => request<any>('/dashboard'),
  
  // Anthropometric Records
  recordAnthropometrics: (data: { patient_id: string; height_cm?: number; weight_kg?: number; waist_cm?: number; hip_cm?: number; notes?: string }) => 
    request('/patients/anthropometrics', { method: 'POST', body: JSON.stringify(data) }),

  // Custom Diet Regimen Generation
  createDietPlan: (data: {
    patient_id: string;
    condition_name?: string;
    total_calories?: number;
    language?: string;
    notes?: string;
    meals?: Array<{
      meal_slot: string;
      calories?: number;
      preparation_guidance?: string;
      foods: Array<{ name: string; quantity: string; grams?: number }>;
    }>;
  }) => request('/patients/diet-plans', { method: 'POST', body: JSON.stringify(data) }),

  // Scheduling Patient Intervals
  createFollowUp: (data: { patient_id: string; interval: 'TWO_WEEKS' | 'ONE_MONTH' | 'THREE_MONTHS'; follow_up_at?: string; notes?: string }) => 
    request('/patients/follow-ups', { method: 'POST', body: JSON.stringify(data) }),

  // Food Exchange Item Lookup
  listFoodItems: (query?: string) => 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    request<any[]>(query ? `/food-items?q=${encodeURIComponent(query)}` : '/food-items'),
};