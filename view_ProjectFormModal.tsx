import React, { useState, useEffect } from 'react';
import type { Project } from './types';
import { useToasts, Modal, Loader } from './components';
import { generateId } from './utils';

interface ProjectFormModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (project: Project) => Promise<void>;
    existingProject?: Project;
}

export const ProjectFormModal = ({ show, onClose, onSave, existingProject }: ProjectFormModalProps) => {
    const [projectData, setProjectData] = useState({
        name: '', address: '', status: 'В работе' as 'В работе' | 'Завершен',
        clientName: '', clientPhone: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToasts();
    
    useEffect(() => {
        if (show && existingProject) {
            setProjectData({
                name: existingProject.name,
                address: existingProject.address,
                status: existingProject.status,
                clientName: existingProject.client.name,
                clientPhone: existingProject.client.phone
            });
        } else if (show) {
            setProjectData({ name: '', address: '', status: 'В работе', clientName: '', clientPhone: '' });
        }
    }, [show, existingProject]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const projectToSave: Project = {
                ...(existingProject || {
                    id: generateId(), estimates: [{ id: generateId(), name: 'Основная смета', items: [] }],
                    expenses: [], payments: [], createdAt: new Date().toISOString()
                }),
                name: projectData.name,
                address: projectData.address,
                status: projectData.status,
                client: { name: projectData.clientName, phone: projectData.clientPhone },
                completedAt: projectData.status === 'Завершен' && !existingProject?.completedAt ? new Date().toISOString() : existingProject?.completedAt,
            };
            await onSave(projectToSave);
            addToast(existingProject ? 'Проект обновлен' : 'Проект создан', 'success');
            onClose();
        } catch (e) {
            addToast('Не удалось сохранить', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setProjectData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Modal show={show} onClose={() => !isSaving && onClose()} title={existingProject ? 'Редактировать проект' : 'Новый проект'}>
            <form onSubmit={handleSave}>
                <div className="form-group">
                    <label>Название объекта</label>
                    <input type="text" name="name" value={projectData.name} onChange={handleChange} required disabled={isSaving}/>
                </div>
                <div className="form-group">
                    <label>Адрес</label>
                    <input type="text" name="address" value={projectData.address} onChange={handleChange} required disabled={isSaving}/>
                </div>
                 <div className="form-group">
                    <label>Имя клиента</label>
                    <input type="text" name="clientName" value={projectData.clientName} onChange={handleChange} required disabled={isSaving}/>
                </div>
                 <div className="form-group">
                    <label>Телефон клиента</label>
                    <input type="tel" name="clientPhone" value={projectData.clientPhone} onChange={handleChange} required disabled={isSaving}/>
                </div>
                <div className="form-group">
                    <label>Статус</label>
                    <select name="status" value={projectData.status} onChange={handleChange} required disabled={isSaving}>
                        <option>В работе</option>
                        <option>Завершен</option>
                    </select>
                </div>
                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>Отмена</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? <Loader /> : 'Сохранить'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
