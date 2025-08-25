// --- DATA TYPES ---
export interface User {
    email: string;
    password?: string; // Should be hashed in a real app
    trialEndsAt?: string; // ISO Date string
    subscriptionEndsAt?: string; // ISO Date string
}

export interface Client {
    name: string;
    phone: string;
}

export interface UserProfile {
    companyName: string;
    contactName: string;
    phone: string;
    logo: string; // base64 data URL
}

export interface Comment {
    id: string;
    author: 'Клиент' | 'Исполнитель';
    text: string;
    timestamp: string;
}

export interface EstimateItem {
    id: string;
    name: string;
    type: 'Работа' | 'Материал';
    unit: string;
    quantity: number;
    price: number;
    comments?: Comment[];
}

export interface Estimate {
    id: string;
    name: string;
    items: EstimateItem[];
    discount?: Discount;
    approvedOn?: string;
}

export interface EstimateTemplate {
    id: string;
    name: string;
    items: Omit<EstimateItem, 'id' | 'quantity' | 'comments'>[];
}

export interface DirectoryItem {
    id: string;
    name: string;
    type: 'Работа' | 'Материал';
    unit: string;
    price: number;
}

export interface Expense {
    id: string;
    date: string;
    description: string;
    amount: number;
    receipt?: string; // base64 data URL
}

export interface Payment {
    id: string;
    date: string;
    amount: number;
}

export interface Discount {
    type: 'percent' | 'fixed';
    value: number;
}

export interface PhotoReport {
    id: string;
    date: string;
    description: string;
    image: string; // base64 data URL
}

export interface ProjectScheduleItem {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    completed?: boolean;
}

export interface ProjectDocument {
    id: string;
    name: string;
    file: string; // base64 data URL
    fileName: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    location: string; // 'На базе' or projectId
}

export interface ProjectNote {
    id: string;
    text: string;
    createdAt: string;
}

export interface Project {
    id: string;
    name: string;
    address: string;
    status: 'В работе' | 'Завершен';
    client: Client;
    estimates: Estimate[];
    expenses: Expense[];
    payments: Payment[];
    contractor?: UserProfile;
    photoReports?: PhotoReport[];
    notes?: ProjectNote[];
    schedule?: ProjectScheduleItem[];
    documents?: ProjectDocument[];
    createdAt: string; // ISO Date string
    completedAt?: string; // ISO Date string
}

export type ToastMessage = { 
    id: number; 
    message: string; 
    type: 'success' | 'error'; 
};

export type FormEstimateItem = {
    name: string;
    type: 'Работа' | 'Материал';
    unit: string;
    quantity: string | number;
    price: string | number;
};

export type ViewState = 
    | { view: 'projects' } 
    | { view: 'project_details'; projectId: string; }
    | { view: 'reports' }
    | { view: 'directory' }
    | { view: 'settings' }
    | { view: 'inventory' };

// --- PROP TYPES ---

export interface ProjectDetailsViewProps {
    project: Project;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    onBack: () => void;
    directory: DirectoryItem[];
    setDirectory: React.Dispatch<React.SetStateAction<DirectoryItem[]>>;
    templates: EstimateTemplate[];
    onSaveTemplate: (template: EstimateTemplate) => Promise<void>;
    onDeleteTemplate: (templateId: string) => Promise<void>;
}

export interface EstimateEditorProps {
    estimate: Estimate;
    projectId: string;
    onUpdate: (updatedEstimate: Estimate) => Promise<void>;
    onDelete: (estimateId: string) => Promise<void>;
    directory: DirectoryItem[];
    setDirectory: React.Dispatch<React.SetStateAction<DirectoryItem[]>>;
    templates: EstimateTemplate[];
    onSaveTemplate: (template: EstimateTemplate) => Promise<void>;
    onDeleteTemplate: (templateId: string) => Promise<void>;
}

export interface SettingsViewProps {
    user: User;
    profile: UserProfile;
    onSave: (profile: UserProfile) => Promise<void>;
    onLogout: () => void;
}