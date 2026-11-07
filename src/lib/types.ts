export type Lang = 'ru' | 'kk';

export interface Profile {
  name: string;
  stentDate: string;
  programStart: string;
  emergencyName: string;
  emergencyPhone: string;
  doctorName: string;
  allergies: string;
  stepGoal: number;
}

export interface Med {
  id: string;
  name: string;
  dose: string;
  times: string[];
  /** null means the patient chose not to track supply. */
  pillsLeft: number | null;
  pillsPerDose: number;
  startDate: string;
  /** Last day the medication is scheduled; null while active. */
  endDate: string | null;
  updatedAt: number;
}

export interface DoseLog { id: string; medId: string; date: string; time: string; takenAt: number; deleted?: boolean; updatedAt: number }

export type Severity = 'none' | 'mild' | 'severe';
export interface CheckIn {
  id: string;
  date: string;
  chestPain: Severity;
  breath: Severity;
  dizzy: Severity;
  bleeding: Severity;
  swelling: Severity;
  updatedAt: number;
}

export interface BpEntry { id: string; at: number; systolic: number; diastolic: number; pulse: number | null; updatedAt: number }

export type MetricSource = 'band' | 'demo';
export interface DayMetrics {
  date: string;
  source: MetricSource;
  steps: number;
  distance: number;
  hrAvg: number | null;
  hrMin: number | null;
  hrMax: number | null;
  sleepMinutes: number | null;
  updatedAt: number;
}

export interface BandInfo { mode: 'none' | 'demo' | 'real'; deviceId: string | null; deviceName: string | null; battery: number | null; lastSync: number | null; lastPulse: number | null }

export interface AppState {
  version: 1;
  lang: Lang | null;
  profile: Profile | null;
  meds: Med[];
  doses: DoseLog[];
  checkIns: CheckIn[];
  bp: BpEntry[];
  metrics: Record<string, DayMetrics>;
  band: BandInfo;
  syncConsent: boolean;
  lastServerSync: number | null;
}
