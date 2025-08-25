import React, { useState, Dispatch, SetStateAction } from 'react';
import { api } from './api';
import { useToasts, Modal } from './components';
import { DeleteIcon } from './icons';
import type { InventoryItem, ProjectNote, Project } from './types';

export const InventoryView = ({ inventory, setInventory, notes, setNotes, projects }: { inventory: InventoryItem[], setInventory: Dispatch<SetStateAction<InventoryItem[]>>, notes: ProjectNote[], setNotes: Dispatch<SetStateAction<ProjectNote[]>>, projects: Project[] }) => {
    const [showItemModal, setShowItemModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newNoteText, setNewNoteText] = useState('');
    const { addToast } = useToasts();

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) {
            addToast('Название не может быть пустым', 'error');
            return;
        }
        const newItem: InventoryItem = {
            id: `id_${Date.now()}`,
            name: newItemName.trim(),
            location: 'На базе',
        };
        try {
            const updatedInventory = [...inventory, newItem];
            setInventory(updatedInventory);
            await api.saveInventory(updatedInventory);
            addToast('Инструмент добавлен', 'success');
            setNewItemName('');
            setShowItemModal(false);
        } catch (error) {
            addToast('Не удалось добавить инструмент', 'error');
        }
    };
    
    const handleDeleteItem = async (itemId: string) => {
        if (!window.confirm('Удалить инструмент?')) return;
        try {
            const updatedInventory = inventory.filter(i => i.id !== itemId);
            setInventory(updatedInventory);
            await api.saveInventory(updatedInventory);
            addToast('Инструмент удален', 'success');
        } catch (error) {
            addToast('Не удалось удалить инструмент', 'error');
        }
    };

    const handleLocationChange = async (itemId: string, location: string) => {
        try {
            const updatedInventory = inventory.map(i => i.id === itemId ? {...i, location} : i);
            setInventory(updatedInventory);
            await api.saveInventory(updatedInventory);
            addToast('Местоположение обновлено', 'success');
        } catch (error) {
            addToast('Не удалось обновить местоположение', 'error');
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNoteText.trim()) {
            addToast('Заметка не может быть пустой', 'error');
            return;
        }
        const newNote: ProjectNote = {
            id: `id_${Date.now()}`,
            text: newNoteText.trim(),
            createdAt: new Date().toISOString(),
        };
        try {
            const updatedNotes = [newNote, ...notes];
            setNotes(updatedNotes);
            await api.saveInventoryNotes(updatedNotes);
            addToast('Заметка добавлена', 'success');
            setNewNoteText('');
        } catch (error) {
            addToast('Не удалось добавить заметку', 'error');
        }
    };
    
    const handleDeleteNote = async (noteId: string) => {
        if (!window.confirm('Удалить заметку?')) return;
        try {
            const updatedNotes = notes.filter(n => n.id !== noteId);
            setNotes(updatedNotes);
            await api.saveInventoryNotes(updatedNotes);
            addToast('Заметка удалена', 'success');
        } catch (error) {
            addToast('Не удалось удалить заметку', 'error');
        }
    };

    const activeProjects = projects.filter(p => p.status === 'В работе');

    return (
        <>
            <div className="card">
                <div className="d-flex justify-between align-center mb-1">
                    <h3>Инструменты и оборудование</h3>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowItemModal(true)}>+ Добавить</button>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr><th>Наименование</th><th>Местоположение</th><th></th></tr>
                        </thead>
                        <tbody>
                            {inventory.length === 0 ? (
                                <tr><td colSpan={3} style={{textAlign: 'center', padding: '1rem'}}>Инструменты не добавлены</td></tr>
                            ) : (
                                inventory.map(item => (
                                    <tr key={item.id}>
                                        <td><strong>{item.name}</strong></td>
                                        <td>
                                            <select value={item.location} onChange={(e) => handleLocationChange(item.id, e.target.value)} style={{maxWidth: '200px', padding: 'var(--space-2)'}}>
                                                <option value="На базе">На базе</option>
                                                {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="align-right">
                                            <button className="action-btn" onClick={() => handleDeleteItem(item.id)}><DeleteIcon /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
             <div className="card">
                <h3>Заметки по инвентарю</h3>
                 {notes.map(note => (
                    <div key={note.id} className="data-item">
                        <div className="data-item-info">
                            <p>{note.text}</p>
                            <span className="data-item-subtext">{new Date(note.createdAt).toLocaleString('ru-RU')}</span>
                        </div>
                        <button className="action-btn" onClick={() => handleDeleteNote(note.id)} aria-label="Удалить заметку">
                            <DeleteIcon />
                        </button>
                    </div>
                 ))}
                 <form onSubmit={handleAddNote} className="add-note-form">
                    <input type="text" value={newNoteText} onChange={e => setNewNoteText(e.target.value)} placeholder="Что-то сломалось или нужно купить..."/>
                    <button type="submit" className="btn btn-primary btn-sm">Добавить</button>
                </form>
            </div>
            
            <Modal show={showItemModal} onClose={() => setShowItemModal(false)} title="Добавить инструмент">
                <form onSubmit={handleAddItem}>
                    <div className="form-group">
                        <label>Название</label>
                        <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Например, Перфоратор Makita" required/>
                    </div>
                     <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Отмена</button>
                        <button type="submit" className="btn btn-primary">Добавить</button>
                    </div>
                </form>
            </Modal>
        </>
    );
};