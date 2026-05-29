export type AppStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
export type UserLevel = 'IC' | 'Manager' | 'Director';
export type RefGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type Sentiment = 'positive' | 'neutral' | 'mixed' | 'critical';
export type Theme = 'light' | 'dark' | 'high-contrast';
export type FontSize = 'small' | 'medium' | 'large';

export interface Language { language: string; level: string; }
export interface Certification { name: string; issuer: string; dateIssued: string; renewalDate?: string; status: 'active' | 'expired' | 'pending'; }
export interface Goal { id: string; title: string; description: string; metric: string; targetDate: string; status: 'in-progress' | 'completed'; category: string; }
export interface System { name: string; category: string; proficiency: 'Beginner' | 'Intermediate' | 'Expert'; dateStarted?: string; active: boolean; }

export interface Profile {
  name: string;
  email: string;
  phone: string;
  currentTitle: string;
  yearsExperience: number;
  level: UserLevel;
  sector: string;
  department: string;
  location: string;
  linkedin: string;
  summary: string;
  skills: string[];
  languages: Language[];
  certifications: Certification[];
  goals: Goal[];
  systems: System[];
  steuerIdNr?: string;
  steuernummer?: string;
  ustId?: string;
  krankenkasse?: string;
  krankenkasseMitgliedsnummer?: string;
  sozialversicherungsnummer?: string;
  ibanMain?: string;
  bicMain?: string;
  bankNameMain?: string;
  ibanSavings?: string;
  bicSavings?: string;
  bankNameSavings?: string;
}

export interface InterviewStage {
  id: string;
  name: string;
  date: string;
  format: string;
  status: 'upcoming' | 'done' | 'passed' | 'failed';
  interviewers: string;
  prepNotes: string;
  notes: string;
  sentiment: Sentiment | '';
}

export interface Application {
  [key: string]: unknown;
  id: string;
  company: string;
  role: string;
  location: string;
  workSetup: 'remote' | 'hybrid' | 'onsite';
  status: AppStatus;
  dateAdded: string;
  dateApplied?: string;
  url?: string;
  jdText?: string;
  jdLanguage?: string;
  notes?: string;
  coverLetter?: string;
  companyDescription?: string;
  companyStage?: 'Startup' | 'Scale-up' | 'Established' | 'Enterprise';
  employeeCount?: string;
  reportingLine?: string;
  teamSize?: string;
  directReports?: string;
  salary?: { min: number; max: number; currency: string; period: string };
  benefits?: string[];
  requiredSkills?: string[];
  niceToHaveSkills?: string[];
  matchedSkills?: string[];
  transferableSkills?: string[];
  skillGaps?: string[];
  matchPercent?: number;
  stages?: InterviewStage[];
  questions?: string[];
  companyWebsite?: string;
  companyMission?: string;
  companyValues?: string;
  timeline?: { date: string; status: string; note?: string }[];
  referenceIds?: string[];
}

export interface Offer {
  id: string;
  applicationId?: string;
  company: string;
  role: string;
  contractType: 'full-time' | 'part-time' | 'freelance' | 'fixed-term';
  grossSalary: number;
  bonus: number;
  bonusType: 'fixed' | 'percentage';
  equity: string;
  vacationDays: number;
  noticePeriod: string;
  probationMonths: number;
  startDate: string;
  benefits: string[];
  workSetup: 'remote' | 'hybrid' | 'onsite';
  officeDaysPerWeek: number;
  learningBudget: number;
  notes: string;
  rating: number;
}

export interface Reference {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  relationship: string;
  grade?: RefGrade;
  sentiment?: Sentiment;
  strengthRating?: number;
  notes?: string;
  letterText?: string;
  letterPdf?: string;
  letterPdfName?: string;
  employmentFrom?: string;
  employmentTo?: string;
  companyGrade?: string;
  languageOfLetter?: string;
  usedForApplications?: string[];
}

export interface Settings {
  theme: Theme;
  fontSize: FontSize;
}

export interface AppData {
  user: { email: string; name: string; isPro: boolean; isAdmin: boolean };
  profile: Profile;
  applications: Application[];
  references: Reference[];
  offers: Offer[];
  settings: Settings;
}

export const ADMIN_EMAIL = 'myrthetjaarda@gmail.com';

export const DEFAULT_PROFILE: Profile = {
  name: '',
  email: '',
  phone: '',
  currentTitle: '',
  yearsExperience: 0,
  level: 'IC',
  sector: '',
  department: '',
  location: '',
  linkedin: '',
  summary: '',
  skills: [],
  languages: [],
  certifications: [],
  goals: [],
  systems: [],
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  fontSize: 'medium',
};

export const DEFAULT_DATA: AppData = {
  user: { email: '', name: '', isPro: false, isAdmin: false },
  profile: DEFAULT_PROFILE,
  applications: [],
  references: [],
  offers: [],
  settings: DEFAULT_SETTINGS,
};

export const STATUS_LABELS: Record<AppStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const GRADE_LABELS: Record<RefGrade, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Adequate',
  D: 'Weak',
  E: 'Poor',
  F: 'Not usable',
};

export const PRO_LIMITS = {
  references: 5,   // free tier max
  offers: 2,       // free tier max
} as const;

export const SECTORS = ['FinTech', 'HR Tech', 'SaaS', 'Banking', 'Consulting', 'E-Commerce', 'Healthcare', 'Non-profit', 'Government', 'Media', 'Legal', 'Other'];
export const DEPARTMENTS = ['People Ops', 'HR', 'HR Business Partner', 'Talent Acquisition', 'Finance', 'Engineering', 'Product', 'Marketing', 'Sales', 'Legal', 'Operations', 'Other'];
export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'];
