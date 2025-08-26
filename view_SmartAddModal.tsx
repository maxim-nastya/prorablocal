import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Project, WorkspaceTask, Expense, ViewState } from './types';
import { api } from './api';
import { Modal, Loader, useToasts } from './components';
import { generateId } from './utils';
import { MagicIcon } from './icons';

interface SmartAddModalProps {
    show: boolean;
    onClose: () => void;
    projects: Project[];
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    workspaceNotes: string;
    setWorkspaceNotes: React.Dispatch<React.SetStateAction<string>>;
    workspaceTasks: WorkspaceTask[];
    setWorkspaceTasks: React.Dispatch<React.SetStateAction<WorkspaceTask[]>>;
    setCurrentView: (view: ViewState) => void;
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        category: {
            type: Type.STRING,
            enum: ['expense', 'task', 'note'],
            description: 'Категория запроса: расход, задача или заметка.'
        },
        data: {
            type: Type.OBJECT,
            properties: {
                amount: { type: Type.NUMBER, description: 'Сумма расхода', nullable: true },
                description: { type: Type.STRING, description: 'Описание расхода', nullable: true },
                projectName: { type: Type.STRING, description: 'Название проекта для расхода', nullable: true },
                taskText: { type: Type.STRING, description: 'Текст задачи', nullable: true },
                noteText: { type: Type.STRING, description: 'Текст заметки', nullable: true },
            },
            description: 'Извлеченные данные из запроса.'
        }
    },
    required: ['category', 'data']
};

export const SmartAddModal = ({ show, onClose, projects, setProjects, workspaceNotes, setWorkspaceNotes, workspaceTasks, setWorkspaceTasks, setCurrentView }: SmartAddModalProps) => {
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToasts();
    
    const handleAction = async () => {
        if (!inputValue.trim()) return;
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const projectNames = projects.map(p => p.name).join(', ');

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Ты - умный ассистент для прораба. Проанализируй запрос и классифицируй его как 'expense' (расход), 'task' (задача) или 'note' (заметка). Извлеки данные. Список доступных проектов: [${projectNames}]. Запрос: "${inputValue}"`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                }
            });

            const result = JSON.parse(response.text);
            
            if (result.category === 'expense' && result.data.amount && result.data.description) {
                const projectNameFromAI = result.data.projectName;
                const targetProject = projectNameFromAI
                    ? projects.find(p => p.name.toLowerCase() === projectNameFromAI.toLowerCase())
                    : undefined;

                if (targetProject) {
                    const newExpense: Expense = {
                        id: generateId(),
                        date: new Date().toISOString().split('T')[0],
                        description: result.data.description,
                        amount: result.data.amount,
                    };
                    const updatedProjects = projects.map(p => p.id === targetProject.id ? { ...p, expenses: [...p.expenses, newExpense] } : p);
                    setProjects(updatedProjects);
                    await api.saveProjects(updatedProjects);
                    addToast(`Расход добавлен в проект "${targetProject.name}"`, 'success');
                    setCurrentView({ view: 'project_details', projectId: targetProject.id });
                } else {
                    addToast(`Проект "${projectNameFromAI || 'не указан'}" не найден`, 'error');
                }
            } else if (result.category === 'task' && result.data.taskText) {
                const newTask: WorkspaceTask = {
                    id: generateId(),
                    text: result.data.taskText,
                    completed: false,
                };
                const updatedTasks = [...workspaceTasks, newTask];
                setWorkspaceTasks(updatedTasks);
                await api.saveWorkspaceTasks(updatedTasks);
                addToast('Новая задача добавлена', 'success');
            } else if (result.category === 'note' && result.data.noteText) {
                const updatedNotes = `${workspaceNotes}\n- ${result.data.noteText}`.trim();
                setWorkspaceNotes(updatedNotes);
                await api.saveWorkspaceNotes(updatedNotes);
                addToast('Заметка добавлена', 'success');
            } else {
                addToast('Не удалось распознать команду. Попробуйте переформулировать.', 'error');
            }
            onClose();

        } catch (error) {
            console.error("Gemini API Error:", error);
            addToast('Ошибка при обработке запроса. Пожалуйста, попробуйте еще раз.', 'error');
        } finally {
            setIsLoading(false);
            setInputValue('');
        }
    };

    return (
        <Modal show={show} onClose={() => !isLoading && onClose()} title="Умное добавление">
            <div className="d-flex align-center gap-1" style={{ marginBottom: 'var(--space-4)'}}>
                <MagicIcon />
                <p style={{ margin: 0 }}>Что нужно сделать, купить или записать?</p>
            </div>
            <div className="form-group">
                <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Например, 'купить краску на 5000 для проекта...' "
                    onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                    disabled={isLoading}
                />
                <p className="field-hint">Gemini AI проанализирует ваш запрос и выполнит нужное действие.</p>
            </div>
            <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>Отмена</button>
                <button type="button" className="btn btn-primary" onClick={handleAction} disabled={isLoading || !inputValue.trim()}>
                    {isLoading ? <Loader /> : 'Выполнить'}
                </button>
            </div>
        </Modal>
    );
};
