import type { User, Project, DirectoryItem, UserProfile, EstimateTemplate, InventoryItem, ProjectNote, Estimate, Comment, PhotoReport } from './types';
import { generateId } from './utils';

// --- Local Storage Database ---

interface UserData {
    projects: Project[];
    directory: DirectoryItem[];
    profile: UserProfile;
    templates: EstimateTemplate[];
    inventory: InventoryItem[];
    inventoryNotes: ProjectNote[];
}

interface LocalDB {
    users: User[];
    data: {
        [userEmail: string]: UserData;
    };
}

const DB_KEY = 'prorab_db';

const getInitialDB = (): LocalDB => ({
    users: [],
    data: {},
});

const getInitialUserData = (): UserData => ({
    projects: [],
    directory: [],
    profile: { companyName: '', contactName: '', phone: '', logo: '' },
    templates: [],
    inventory: [],
    inventoryNotes: [],
});

const getDb = (): LocalDB => {
    try {
        const dbString = localStorage.getItem(DB_KEY);
        if (dbString) {
            return JSON.parse(dbString);
        }
    } catch (e) {
        console.error("Failed to parse localStorage DB", e);
    }
    return getInitialDB();
};

const saveDb = (db: LocalDB) => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
};

let currentUserEmail: string | null = null;

export const setToken = (newToken: string | null) => {
    currentUserEmail = newToken;
};

// --- API Implementation ---

export const api = {
    // --- Auth ---
    async login(email: string, password: string): Promise<{ user: User, token: string }> {
        const db = getDb();
        const user = db.users.find(u => u.email === email && u.password === password);
        if (!user) {
            throw new Error('Неверный email или пароль');
        }
        return { user, token: user.email };
    },

    async register(email: string, password: string): Promise<{ user: User, token: string }> {
        const db = getDb();
        if (db.users.some(u => u.email === email)) {
            throw new Error('Пользователь с таким email уже существует');
        }
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 3);

        const newUser: User = { 
            email, 
            password,
            trialEndsAt: trialEndDate.toISOString(),
        };
        db.users.push(newUser);
        db.data[email] = getInitialUserData();
        saveDb(db);

        return { user: newUser, token: newUser.email };
    },

    // --- Data Fetching ---
    async getInitialData(): Promise<{ user: User, projects: Project[], directory: DirectoryItem[], profile: UserProfile, templates: EstimateTemplate[], inventory: InventoryItem[], inventoryNotes: ProjectNote[] }> {
        if (!currentUserEmail) {
            throw new Error("Authentication error");
        }
        const db = getDb();
        const user = db.users.find(u => u.email === currentUserEmail);
        if (!user) {
            throw new Error("User not found");
        }

        const userData = db.data[currentUserEmail] || getInitialUserData();
        return { user, ...userData };
    },
    
    async getPublicEstimateData(projectId: string, estimateId: string): Promise<{ project: Project, estimate: Estimate }> {
        const db = getDb();
        // In local mode, we can't know the user, so we search all projects.
        for (const email in db.data) {
            const userData = db.data[email];
            const project = userData.projects.find(p => p.id === projectId);
            if (project) {
                const estimate = project.estimates.find(e => e.id === estimateId);
                if (estimate) {
                    return { project: {...project, contractor: userData.profile}, estimate };
                }
            }
        }
        throw new Error('Estimate not found');
    },

    async approvePublicEstimate(projectId: string, estimateId: string): Promise<{ success: boolean }> {
        const db = getDb();
        for (const email in db.data) {
            const userData = db.data[email];
            const projectIndex = userData.projects.findIndex(p => p.id === projectId);
            if (projectIndex !== -1) {
                const estimateIndex = userData.projects[projectIndex].estimates.findIndex(e => e.id === estimateId);
                if (estimateIndex !== -1) {
                    userData.projects[projectIndex].estimates[estimateIndex].approvedOn = new Date().toISOString();
                    saveDb(db);
                    return { success: true };
                }
            }
        }
        throw new Error('Could not approve estimate');
    },

    async addPublicComment(projectId: string, estimateId: string, itemId: string, commentText: string): Promise<{ success: boolean }> {
        const db = getDb();
        const newComment: Comment = {
            id: generateId(),
            author: 'Клиент',
            text: commentText,
            timestamp: new Date().toISOString()
        };

        for (const email in db.data) {
            const userData = db.data[email];
            const project = userData.projects.find(p => p.id === projectId);
            if (project) {
                const estimate = project.estimates.find(e => e.id === estimateId);
                if (estimate) {
                    const item = estimate.items.find(i => i.id === itemId);
                    if (item) {
                        if (!item.comments) {
                            item.comments = [];
                        }
                        item.comments.push(newComment);
                        saveDb(db);
                        return { success: true };
                    }
                }
            }
        }
        throw new Error('Could not add comment: item not found');
    },

    async addPublicPhotoComment(projectId: string, photoReportId: string, commentText: string): Promise<{ success: boolean }> {
        const db = getDb();
        const newComment: Comment = {
            id: generateId(),
            author: 'Клиент',
            text: commentText,
            timestamp: new Date().toISOString()
        };

        for (const email in db.data) {
            const userData = db.data[email];
            const project = userData.projects.find(p => p.id === projectId);
            if (project) {
                const photoReport = (project.photoReports || []).find(pr => pr.id === photoReportId);
                if (photoReport) {
                    if (!photoReport.comments) {
                        photoReport.comments = [];
                    }
                    photoReport.comments.push(newComment);
                    saveDb(db);
                    return { success: true };
                }
            }
        }
        throw new Error('Could not add comment: photo report not found');
    },

    // --- Data Saving (FIXED to be atomic) ---
    async saveProjects(data: Project[]): Promise<void> {
        if (!currentUserEmail) throw new Error("Not authenticated");
        const db = getDb();
        if (!db.data[currentUserEmail]) db.data[currentUserEmail] = getInitialUserData();
        db.data[currentUserEmail].projects = data;
        saveDb(db);
    },

    async saveDirectory(data: DirectoryItem[]): Promise<void> {
        if (!currentUserEmail) throw new Error("Not authenticated");
        const db = getDb();
        if (!db.data[currentUserEmail]) db.data[currentUserEmail] = getInitialUserData();
        db.data[currentUserEmail].directory = data;
        saveDb(db);
    },

    async saveProfile(data: UserProfile): Promise<void> {
        if (!currentUserEmail) throw new Error("Not authenticated");
        const db = getDb();
        if (!db.data[currentUserEmail]) db.data[currentUserEmail] = getInitialUserData();
        db.data[currentUserEmail].profile = data;
        saveDb(db);
    },

    async saveTemplates(data: EstimateTemplate[]): Promise<void> {
        if (!currentUserEmail) throw new Error("Not authenticated");
        const db = getDb();
        if (!db.data[currentUserEmail]) db.data[currentUserEmail] = getInitialUserData();
        db.data[currentUserEmail].templates = data;
        saveDb(db);
    },

    async saveInventory(data: InventoryItem[]): Promise<void> {
        if (!currentUserEmail) throw new Error("Not authenticated");
        const db = getDb();
        if (!db.data[currentUserEmail]) db.data[currentUserEmail] = getInitialUserData();
        db.data[currentUserEmail].inventory = data;
        saveDb(db);
    },
    
    async saveInventoryNotes(data: ProjectNote[]): Promise<void> {
        if (!currentUserEmail) throw new Error("Not authenticated");
        const db = getDb();
        if (!db.data[currentUserEmail]) db.data[currentUserEmail] = getInitialUserData();
        db.data[currentUserEmail].inventoryNotes = data;
        saveDb(db);
    },
    
    async activateSubscription(): Promise<User> {
        if (!currentUserEmail) throw new Error('Not authenticated');
        const db = getDb();
        const user = db.users.find(u => u.email === currentUserEmail);
        if (!user) throw new Error('User not found');

        const subscriptionEndDate = new Date();
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
        user.subscriptionEndsAt = subscriptionEndDate.toISOString();
        saveDb(db);
        return user;
    }
};