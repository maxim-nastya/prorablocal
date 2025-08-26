import { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// Local module imports
import { api, setToken } from './api';
import { useLocalStorage } from './hooks';
import { Loader, ToastProvider, useToasts, Header, BottomNav, TabView } from './components';
import type {
    User, Project, DirectoryItem, UserProfile, EstimateTemplate,
    InventoryItem, ProjectNote, ViewState
} from './types';
import { AuthScreen } from './view_Auth';
import { ProjectListView } from './view_ProjectList';
import { ProjectDetailsView } from './view_ProjectDetails';
import { ReportsView } from './view_Reports';
import { DirectoryView } from './view_Directory';
import { SettingsView } from './view_Settings';
import { InventoryView } from './view_Inventory';
import { PublicEstimateView } from './view_PublicEstimate';
import { ProjectFormModal } from './view_ProjectFormModal';
import { SubscriptionView } from './view_Subscription';


// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(registration => {
      console.log('Service Worker registered: ', registration);
    }).catch(registrationError => {
      console.log('Service Worker registration failed: ', registrationError);
    });
  });
}

// --- MAIN APP ---

const App = () => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setTokenInStorage] = useLocalStorage<string | null>('prorab_token', null);
    
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState<Project[]>([]);
    const [directory, setDirectory] = useState<DirectoryItem[]>([]);
    const [profile, setProfile] = useState<UserProfile>({ companyName: '', contactName: '', phone: '', logo: '' });
    const [templates, setTemplates] = useState<EstimateTemplate[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [inventoryNotes, setInventoryNotes] = useState<ProjectNote[]>([]);

    const [currentView, setCurrentView] = useState<ViewState>({ view: 'projects' });
    const [showProjectModal, setShowProjectModal] = useState(false);
    
    const { addToast } = useToasts();
    
    useEffect(() => {
        if (token) {
            setToken(token);
        }

        const loadInitialData = async () => {
            if (token) {
                try {
                    const data = await api.getInitialData();
                    setUser(data.user);
                    setProjects(data.projects);
                    setDirectory(data.directory);
                    setProfile(data.profile);
                    setTemplates(data.templates);
                    setInventory(data.inventory);
                    setInventoryNotes(data.inventoryNotes);
                } catch (error) {
                    addToast('Не удалось загрузить данные. Возможно, сессия истекла.', 'error');
                    handleLogout(); // Clear stale token
                }
            }
            setLoading(false);
        };
        loadInitialData();
    }, [token, addToast]);
    
    const handleLogin = (data: { user: User; token: string }) => {
        setUser(data.user);
        setTokenInStorage(data.token);
    };

    const handleLogout = () => {
        setUser(null);
        setTokenInStorage(null);
        // Clear all local data upon logout for security
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('prorab_')) {
                localStorage.removeItem(key);
            }
        });
    };

    const subscriptionStatus = useMemo(() => {
        if (!user) return 'inactive';
        const now = new Date();
        if (user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > now) {
            return 'active';
        }
        if (user.trialEndsAt && new Date(user.trialEndsAt) > now) {
            return 'trial';
        }
        return 'expired';
    }, [user]);
    
    const handleSaveProject = async (project: Project) => {
        const updatedProjects = projects.find(p => p.id === project.id)
            ? projects.map(p => p.id === project.id ? project : p)
            : [project, ...projects];
        
        setProjects(updatedProjects);
        await api.saveProjects(updatedProjects);
    };

    const handleSaveProfile = async (updatedProfile: UserProfile) => {
        setProfile(updatedProfile);
        await api.saveProfile(updatedProfile);
    };
    
    const handleSaveTemplate = async (template: EstimateTemplate) => {
        try {
            const updatedTemplates = [...templates, template];
            setTemplates(updatedTemplates);
            await api.saveTemplates(updatedTemplates);
            addToast('Шаблон сохранен!', 'success');
        } catch (e) {
            addToast('Не удалось сохранить шаблон', 'error');
        }
    };

    const handleEditTemplate = async (template: EstimateTemplate) => {
        try {
            const updatedTemplates = templates.map(t => t.id === template.id ? template : t);
            setTemplates(updatedTemplates);
            await api.saveTemplates(updatedTemplates);
            addToast('Шаблон обновлен!', 'success');
        } catch (e) {
            addToast('Не удалось обновить шаблон', 'error');
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот шаблон?')) return;
        try {
            const updatedTemplates = templates.filter(t => t.id !== templateId);
            setTemplates(updatedTemplates);
            await api.saveTemplates(updatedTemplates);
            addToast('Шаблон удален', 'success');
        } catch (e) {
            addToast('Не удалось удалить шаблон', 'error');
        }
    };

    const handleActivateSubscription = async () => {
        try {
            const updatedUser = await api.activateSubscription();
            setUser(updatedUser);
            addToast('Подписка успешно активирована!', 'success');
        } catch (e) {
            addToast('Не удалось активировать подписку', 'error');
        }
    };
    
    if (loading) {
        return <Loader fullScreen />;
    }

    if (!user || !token) {
        return <AuthScreen onLogin={handleLogin} />;
    }

    if (subscriptionStatus === 'expired') {
        return <SubscriptionView user={user} onActivate={handleActivateSubscription} onLogout={handleLogout} />;
    }
    
    const renderContent = () => {
        switch (currentView.view) {
            case 'projects':
                return <ProjectListView projects={projects} setProjects={setProjects} onSelectProject={(id) => setCurrentView({ view: 'project_details', projectId: id })} onShowNewProjectModal={() => setShowProjectModal(true)} />;
            case 'project_details': {
                const project = projects.find(p => p.id === currentView.projectId);
                if (!project) {
                    // Fallback if project not found
                    setCurrentView({ view: 'projects' });
                    return null;
                }
                return (
                     <ProjectDetailsView 
                        project={project}
                        projects={projects}
                        setProjects={setProjects}
                        onBack={() => setCurrentView({ view: 'projects' })}
                        directory={directory}
                        setDirectory={setDirectory}
                        templates={templates}
                        onSaveTemplate={handleSaveTemplate}
                        onEditTemplate={handleEditTemplate}
                        onDeleteTemplate={handleDeleteTemplate}
                    />
                );
            }
            case 'reports':
                return <ReportsView projects={projects} />;
            case 'directory':
                return <DirectoryView directory={directory} setDirectory={setDirectory} />;
            case 'inventory':
                return <InventoryView inventory={inventory} setInventory={setInventory} notes={inventoryNotes} setNotes={setInventoryNotes} projects={projects} />;
            case 'settings':
                return <SettingsView user={user} profile={profile} onSave={handleSaveProfile} onLogout={handleLogout} />;
            default:
                return null;
        }
    };


    return (
        <>
            <Header onNavigate={setCurrentView} onLogout={handleLogout} />
            <TabView currentView={currentView.view} onNavigate={setCurrentView} />
            <main className="app-container">
                {renderContent()}
            </main>
            <BottomNav currentView={currentView.view} onNavigate={setCurrentView} />
            <ProjectFormModal 
                show={showProjectModal}
                onClose={() => setShowProjectModal(false)}
                onSave={handleSaveProject}
            />
        </>
    );
};

// --- APP INITIALIZATION ---
const queryParams = new URLSearchParams(window.location.search);
const isPublicView = queryParams.has('view') && queryParams.get('view') === 'estimate';

const AppWrapper = () => (
    <ToastProvider>
        {isPublicView ? <PublicEstimateView /> : <App />}
    </ToastProvider>
);

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<AppWrapper />);
}
