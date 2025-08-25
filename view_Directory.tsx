import React, { useMemo, useState } from 'react';
import type { DirectoryItem } from './types';
import { EditIcon, DeleteIcon, SearchIcon } from './icons';
import { formatCurrency } from './utils';
import { useToasts, Modal, Loader } from './components';
import { api } from './api';

const DirectoryEditModal = ({ 
    show, 
    onClose, 
    item, 
    onSave,
}: { 
    show: boolean, 
    onClose: () => void, 
    item: DirectoryItem | null,
    onSave: (e: React.FormEvent, itemData: Omit<DirectoryItem, 'id'>) => Promise<void>,
}) => {
    const [itemData, setItemData] = useState<Omit<DirectoryItem, 'id'>>({ name: '', type: 'Работа', unit: 'шт', price: 0 });
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        if (item) {
            setItemData(item);
        }
    }, [item]);

    const handleSave = async (e: React.FormEvent) => {
        setIsSaving(true);
        await onSave(e, itemData);
        setIsSaving(false);
    };

    if (!item) return null;

    return (
        <Modal show={show} onClose={onClose} title="Редактировать справочник">
            <form onSubmit={handleSave}>
                <div className="form-group">
                    <label>Наименование</label>
                    <input type="text" value={itemData.name} onChange={e => setItemData(p => ({...p, name: e.target.value}))} required disabled={isSaving} />
                </div>
                 <div className="form-group">
                    <label>Тип</label>
                    <select value={itemData.type} onChange={e => setItemData(p => ({...p, type: e.target.value as 'Работа' | 'Материал'}))} disabled={isSaving}>
                        <option>Работа</option>
                        <option>Материал</option>
                    </select>
                </div>
                <div className="d-flex gap-1">
                    <div className="form-group w-100">
                       <label>Цена</label>
                       <input type="number" step="0.01" value={itemData.price} onChange={e => setItemData(p => ({...p, price: parseFloat(e.target.value) || 0}))} required disabled={isSaving}/>
                    </div>
                    <div className="form-group w-100">
                       <label>Ед. изм.</label>
                       <input type="text" value={itemData.unit} onChange={e => setItemData(p => ({...p, unit: e.target.value}))} required disabled={isSaving}/>
                    </div>
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


export const DirectoryView = ({ directory, setDirectory }: { directory: DirectoryItem[], setDirectory: React.Dispatch<React.SetStateAction<DirectoryItem[]>> }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<DirectoryItem | null>(null);
    const { addToast } = useToasts();
    
    const filteredDirectory = useMemo(() => {
        const sortedDirectory = [...directory].sort((a, b) => a.name.localeCompare(b.name));
        if (!searchTerm.trim()) {
            return sortedDirectory;
        }
        return sortedDirectory.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [directory, searchTerm]);

    const handleDeleteItem = async (itemId: string) => {
        if (window.confirm('Вы уверены, что хотите удалить эту позицию из справочника?')) {
            try {
                const updatedDirectory = directory.filter(item => item.id !== itemId);
                setDirectory(updatedDirectory);
                await api.saveDirectory(updatedDirectory);
                addToast('Позиция удалена из справочника', 'success');
            } catch (e) {
                addToast('Не удалось удалить позицию', 'error');
            }
        }
    };

    const handleSaveItem = async (e: React.FormEvent, itemData: Omit<DirectoryItem, 'id'>) => {
        e.preventDefault();
        const trimmedName = itemData.name.trim();
        if (!trimmedName) {
            addToast('Название не может быть пустым', 'error');
            return;
        }
        if (!editingItem) return;

        try {
            const updatedDirectory = directory.map(item => item.id === editingItem.id ? { ...item, ...itemData, name: trimmedName } : item);
            setDirectory(updatedDirectory);
            await api.saveDirectory(updatedDirectory);
            addToast('Справочник обновлен', 'success');
            setEditingItem(null);
        } catch (e) {
            addToast('Не удалось сохранить', 'error');
        }
    };

    return (
         <>
            <div className="card">
                <h3>Справочник</h3>
                <p className="field-hint">Здесь хранятся все работы и материалы, которые вы добавляли в сметы. Вы можете управлять ими централизованно.</p>
                
                <div className="search-container">
                    <SearchIcon />
                    <input
                        type="text"
                        placeholder="Поиск по названию..."
                        className="search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Наименование</th>
                                <th>Тип</th>
                                <th className="align-right">Цена</th>
                                <th className="align-right">Ед. изм.</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDirectory.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>
                                        {searchTerm ? 'Ничего не найдено' : 'Справочник пока пуст.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredDirectory.map((item, index) => (
                                    <tr key={item.id} className="animate-fade-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                                        <td><strong>{item.name}</strong></td>
                                        <td>{item.type}</td>
                                        <td className="align-right">{formatCurrency(item.price)}</td>
                                        <td className="align-right">{item.unit}</td>
                                        <td className="align-right">
                                            <div className="item-actions">
                                                <button className="action-btn" onClick={() => setEditingItem(item)} aria-label="Редактировать"><EditIcon /></button>
                                                <button className="action-btn" onClick={() => handleDeleteItem(item.id)} aria-label="Удалить"><DeleteIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <DirectoryEditModal 
                show={!!editingItem}
                onClose={() => setEditingItem(null)}
                item={editingItem}
                onSave={handleSaveItem}
            />
        </>
    );
};