import React, { useMemo, useState } from 'react';
import type { Project } from './types';
import { SearchIcon } from './icons';
import { FinancialDashboard } from './view_ProjectDetails';

export const ProjectListView = ({ projects, onSelectProject, onShowNewProjectModal }: { projects: Project[], setProjects: React.Dispatch<React.SetStateAction<Project[]>>, onSelectProject: (projectId: string) => void, onShowNewProjectModal: () => void }) => {
    const [filter, setFilter] = useState<'В работе' | 'Завершен'>('В работе');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProjects = useMemo(() => {
        return projects
            .filter(p => p.status === filter)
            .filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.client.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [projects, filter, searchTerm]);

    return (
        <>
            <div className="d-flex justify-between align-center mb-1">
                <div className="filter-toggle">
                    <button className={filter === 'В работе' ? 'active' : ''} onClick={() => setFilter('В работе')}>В работе</button>
                    <button className={filter === 'Завершен' ? 'active' : ''} onClick={() => setFilter('Завершен')}>Завершен</button>
                </div>
            </div>
            
            <div className="search-container">
                <SearchIcon />
                <input
                    type="text"
                    placeholder="Поиск по названию, адресу, клиенту..."
                    className="search-input"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredProjects.length > 0 ? (
                <div className="project-list-grid">
                    {filteredProjects.map((p, index) => (
                        <div key={p.id} className="card project-card animate-fade-slide-up" style={{ animationDelay: `${index * 50}ms` }} onClick={() => onSelectProject(p.id)}>
                            <div className="project-card-header">
                                <div>
                                    <div className="project-card-title">{p.name}</div>
                                    <div className="project-card-client">{p.client.name}</div>
                                </div>
                                <span className={`status-badge ${p.status === 'В работе' ? 'status-in-progress' : 'status-completed'}`}>
                                    {p.status}
                                </span>
                            </div>
                            <FinancialDashboard project={p} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <h3>Проектов пока нет</h3>
                    <p>{searchTerm ? `Не найдено проектов по запросу "${searchTerm}"` : `У вас пока нет проектов со статусом "${filter}".`}</p>
                    {filter === 'В работе' && !searchTerm && <button className="btn btn-primary" onClick={onShowNewProjectModal}>Создать первый проект</button>}
                </div>
            )}

            {filter === 'В работе' && <button className="fab" onClick={onShowNewProjectModal} aria-label="Новый проект">+</button>}
        </>
    );
};
