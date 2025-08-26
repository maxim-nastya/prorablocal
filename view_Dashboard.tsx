import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { api } from './api';
import type { DashboardViewProps, ViewState, WorkspaceTask, ProjectScheduleItem } from './types';
import { generateId, debounce } from './utils';
import { DeleteIcon, CalendarIcon } from './icons';

const NotesWidget = ({ notes, setNotes }: { notes: string, setNotes: React.Dispatch<React.SetStateAction<string>> }) => {
    const [localNotes, setLocalNotes] = useState(notes);

    const debouncedSave = useCallback(debounce((newNotes: string) => {
        api.saveWorkspaceNotes(newNotes);
    }, 1000), []);

    useEffect(() => {
        setLocalNotes(notes);
    }, [notes]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setLocalNotes(newText);
        setNotes(newText);
        debouncedSave(newText);
    };

    return (
        <div className="card dashboard-widget dashboard-widget-full">
            <div className="card-header">
                <h3>Быстрые заметки</h3>
            </div>
            <textarea
                className="notes-widget-textarea"
                value={localNotes}
                onChange={handleChange}
                placeholder="Запишите что-нибудь важное... размеры, телефон, артикул..."
            />
        </div>
    );
};

const TasksWidget = ({ tasks, setTasks }: { tasks: WorkspaceTask[], setTasks: React.Dispatch<React.SetStateAction<WorkspaceTask[]>> }) => {
    const [newTaskText, setNewTaskText] = useState('');

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedText = newTaskText.trim();
        if (!trimmedText) return;

        const newTask: WorkspaceTask = {
            id: generateId(),
            text: trimmedText,
            completed: false,
        };

        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
        await api.saveWorkspaceTasks(updatedTasks);
        setNewTaskText('');
    };

    const handleToggleTask = async (taskId: string) => {
        const updatedTasks = tasks.map(t =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        setTasks(updatedTasks);
        await api.saveWorkspaceTasks(updatedTasks);
    };

    const handleDeleteTask = async (taskId: string) => {
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        setTasks(updatedTasks);
        await api.saveWorkspaceTasks(updatedTasks);
    };
    
    const sortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => (a.completed === b.completed) ? 0 : a.completed ? 1 : -1);
    }, [tasks]);

    return (
        <div className="card dashboard-widget">
            <div className="card-header">
                <h3>Мои задачи</h3>
            </div>
            {sortedTasks.length > 0 ? (
                <ul className="tasks-widget-list">
                    {sortedTasks.map(task => (
                        <li key={task.id} className="tasks-widget-item">
                            <input type="checkbox" id={`task-${task.id}`} checked={task.completed} onChange={() => handleToggleTask(task.id)} />
                            <label htmlFor={`task-${task.id}`}>{task.text}</label>
                            <button className="action-btn delete-task-btn" onClick={() => handleDeleteTask(task.id)} aria-label="Удалить задачу">
                                <DeleteIcon />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="field-hint" style={{textAlign: 'center', padding: 'var(--space-4) 0'}}>У вас нет личных задач.</p>
            )}
            <form onSubmit={handleAddTask} className="add-task-form">
                <input
                    type="text"
                    value={newTaskText}
                    onChange={e => setNewTaskText(e.target.value)}
                    placeholder="Что нужно сделать?"
                />
                <button type="submit" className="btn btn-primary btn-sm">Добавить</button>
            </form>
        </div>
    );
};

interface UpcomingTask extends ProjectScheduleItem {
    projectName: string;
    projectId: string;
}

const UpcomingTasksWidget = ({ projects, setCurrentView }: { projects: any[], setCurrentView: (view: ViewState) => void }) => {
    const upcomingTasks = useMemo((): UpcomingTask[] => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(today.getDate() + 2);
        
        const tasks: UpcomingTask[] = [];

        projects
            .filter(p => p.status === 'В работе')
            .forEach(p => {
                (p.schedule || []).forEach((task: ProjectScheduleItem) => {
                    if (task.completed) return;

                    const startDate = new Date(task.startDate);
                    startDate.setHours(0, 0, 0, 0);
                    const endDate = new Date(task.endDate);
                    endDate.setHours(0, 0, 0, 0);

                    // Ending today or tomorrow
                    if ((endDate.getTime() === today.getTime() || endDate.getTime() === tomorrow.getTime())) {
                        tasks.push({ ...task, projectName: p.name, projectId: p.id });
                    }
                    // Starting tomorrow or day after
                    else if (startDate.getTime() === tomorrow.getTime() || startDate.getTime() === dayAfterTomorrow.getTime()) {
                         tasks.push({ ...task, projectName: p.name, projectId: p.id });
                    }
                });
            });

        return tasks.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [projects]);

    const handleNavigate = (view: ViewState) => {
        setCurrentView(view);
    };

    return (
         <div className="card dashboard-widget">
            <div className="card-header">
                <CalendarIcon />
                <h3>Что дальше по проектам?</h3>
            </div>
            {upcomingTasks.length > 0 ? (
                <div className="data-list">
                    {upcomingTasks.map(task => (
                        <div key={task.id} className="data-item dashboard-item-link" onClick={() => handleNavigate({ view: 'project_details', projectId: task.projectId })}>
                            <div className="data-item-info">
                                <p><strong>{task.name}</strong></p>
                                <span className="data-item-subtext">
                                    {new Date(task.startDate) > new Date() ? 'Начало:' : 'Конец:'} {new Date(task.startDate).toLocaleDateString('ru-RU')} - {new Date(task.endDate).toLocaleDateString('ru-RU')}
                                </span>
                                <span className="data-item-subtext">Проект: {task.projectName}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="field-hint" style={{textAlign: 'center', padding: 'var(--space-4) 0'}}>В ближайшие дни нет запланированных работ.</p>
            )}
        </div>
    )
};

export const DashboardView = ({ projects, setCurrentView, workspaceNotes, setWorkspaceNotes, workspaceTasks, setWorkspaceTasks }: DashboardViewProps) => {
    return (
        <div className="dashboard-grid">
            <NotesWidget notes={workspaceNotes} setNotes={setWorkspaceNotes} />
            <TasksWidget tasks={workspaceTasks} setTasks={setWorkspaceTasks} />
            <UpcomingTasksWidget projects={projects} setCurrentView={setCurrentView} />
        </div>
    );
};