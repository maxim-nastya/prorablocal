import { useState, useEffect, useMemo } from 'react';
import { api } from './api';
import { useToasts, Loader, Modal, PhotoViewerModal } from './components';
import { formatCurrency, generateId, fileToBase64 } from './utils';
import type {
    Project, Estimate, EstimateItem, DirectoryItem, EstimateTemplate, Discount,
    Comment, FormEstimateItem, Expense, Payment, PhotoReport, ProjectScheduleItem,
    ProjectDocument, ProjectNote, ProjectDetailsViewProps, EstimateEditorProps
} from './types';
import {
    EditIcon, DeleteIcon, CheckIcon, ReplayIcon, DocumentIcon,
    SearchIcon, ShareIcon, ShoppingListIcon, CommentIcon, SaveTemplateIcon, TemplateIcon
} from './icons';
import { ProjectFormModal } from './view_ProjectFormModal';

// --- SUB-COMPONENTS for ProjectDetailsView ---

export const FinancialDashboard = ({ project }: { project: Project }) => {
    const totals = useMemo(() => {
        const estimateTotal = project.estimates.reduce((projectSum, estimate) => {
            const subtotal = estimate.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
            const discountAmount = estimate.discount
                ? (estimate.discount.type === 'percent' ? subtotal * (estimate.discount.value / 100) : estimate.discount.value)
                : 0;
            return projectSum + (subtotal - discountAmount);
        }, 0);

        const workTotal = project.estimates.flatMap(e => e.items)
            .filter(item => item.type === 'Работа')
            .reduce((sum, item) => sum + item.quantity * item.price, 0);

        const expensesTotal = project.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalPaid = project.payments.reduce((sum, payment) => sum + payment.amount, 0);
        
        const profit = workTotal - expensesTotal;
        const clientDebt = estimateTotal - totalPaid;

        return { estimateTotal, workTotal, expensesTotal, totalPaid, profit, clientDebt };
    }, [project]);

    return (
        <div className="card-inset">
            <div className="financial-summary-grid">
                <div className="summary-item">
                    <div className="summary-item-label">Смета</div>
                    <div className="summary-item-value">{formatCurrency(totals.estimateTotal)}</div>
                </div>
                <div className="summary-item">
                    <div className="summary-item-label">Оплачено</div>
                    <div className="summary-item-value">{formatCurrency(totals.totalPaid)}</div>
                </div>
                <div className="summary-item">
                    <div className="summary-item-label">Долг клиента</div>
                    <div className={`summary-item-value ${totals.clientDebt > 0 ? 'loss' : ''}`}>
                        {formatCurrency(totals.clientDebt)}
                    </div>
                </div>
                 <div className="summary-item">
                    <div className="summary-item-label">Стоимость работ</div>
                    <div className="summary-item-value">{formatCurrency(totals.workTotal)}</div>
                </div>
                <div className="summary-item">
                    <div className="summary-item-label">Расходы</div>
                    <div className="summary-item-value">{formatCurrency(totals.expensesTotal)}</div>
                </div>
                <div className="summary-item">
                    <div className="summary-item-label">Прибыль</div>
                    <div className={`summary-item-value ${totals.profit >= 0 ? 'profit' : 'loss'}`}>
                        {formatCurrency(totals.profit)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CommentModal = ({ show, onClose, item, onAddComment }: { show: boolean, onClose: () => void, item: EstimateItem | null, onAddComment: (itemId: string, commentText: string) => void }) => {
    const [newComment, setNewComment] = useState('');
    
    if (!item) return null;

    const handleCommentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newComment.trim()) {
            onAddComment(item.id, newComment.trim());
            setNewComment('');
        }
    };

    return (
        <Modal show={show} onClose={onClose} title={`Комментарии: ${item.name}`}>
            <div className="comment-modal-body">
                <div className="comment-thread">
                    {(item.comments || []).length === 0 ? (
                        <p style={{textAlign: 'center', color: 'hsl(var(--text-secondary))'}}>Комментариев пока нет.</p>
                    ) : (
                        item.comments?.map(comment => (
                            <div key={comment.id} className={`comment-bubble author-${comment.author === 'Клиент' ? 'client' : 'contractor'}`}>
                                <p>{comment.text}</p>
                                <small>{new Date(comment.timestamp).toLocaleString('ru-RU')}</small>
                            </div>
                        ))
                    )}
                </div>
                <form className="comment-form" onSubmit={handleCommentSubmit}>
                    <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Ваш комментарий..."
                        style={{flex: 1}}
                    />
                    <button type="submit" className="btn btn-primary">Отправить</button>
                </form>
            </div>
        </Modal>
    );
};

const TemplateModal = ({ show, onClose, templates, onApplyTemplate, onDeleteTemplate }: { show: boolean, onClose: () => void, templates: EstimateTemplate[], onApplyTemplate: (template: EstimateTemplate) => void, onDeleteTemplate: (templateId: string) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredTemplates = useMemo(() => {
        const sortedTemplates = [...templates].sort((a, b) => a.name.localeCompare(b.name));
        if (!searchTerm.trim()) return sortedTemplates;
        return sortedTemplates.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [templates, searchTerm]);

    const handleApply = (template: EstimateTemplate) => {
        onApplyTemplate(template);
        onClose();
    }

    return (
        <Modal show={show} onClose={onClose} title="Применить шаблон">
             <div className="search-container" style={{marginBottom: 'var(--space-4)'}}>
                <SearchIcon />
                <input
                    type="text"
                    placeholder="Поиск по названию шаблона..."
                    className="search-input"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="template-list-container">
                {filteredTemplates.length > 0 ? (
                    <div className="data-list">
                        {filteredTemplates.map(template => (
                            <div key={template.id} className="data-item">
                                <div className="data-item-info">
                                    <p><strong>{template.name}</strong></p>
                                    <small>{template.items.length} поз.</small>
                                </div>
                                <div className="item-actions">
                                    <button className="btn btn-primary btn-sm" onClick={() => handleApply(template)}>Применить</button>
                                    <button className="action-btn" onClick={() => onDeleteTemplate(template.id)} aria-label="Удалить шаблон"><DeleteIcon /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{textAlign: 'center', color: 'hsl(var(--text-secondary))', padding: 'var(--space-4) 0'}}>
                        {searchTerm ? 'Шаблоны не найдены.' : 'У вас нет сохраненных шаблонов.'}
                    </p>
                )}
            </div>
        </Modal>
    );
}


const EstimateEditor = ({ estimate, projectId, onUpdate, onDelete, directory, setDirectory, onSaveTemplate, templates, onDeleteTemplate }: EstimateEditorProps) => {
    const [showModal, setShowModal] = useState(false);
    const [showShoppingListModal, setShowShoppingListModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingItem, setEditingItem] = useState<EstimateItem | null>(null);
    const [newItem, setNewItem] = useState<FormEstimateItem>({ name: '', type: 'Работа', unit: 'шт', quantity: '1', price: '' });
    const [suggestions, setSuggestions] = useState<DirectoryItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToasts();
    
    const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(estimate.discount?.type || 'percent');
    const [discountValue, setDiscountValue] = useState<string | number>(estimate.discount?.value || '');
    const [estimateName, setEstimateName] = useState(estimate.name);

    const [showCommentModal, setShowCommentModal] = useState(false);
    const [commentingItem, setCommentingItem] = useState<EstimateItem | null>(null);

    useEffect(() => {
        setDiscountType(estimate.discount?.type || 'percent');
        setDiscountValue(estimate.discount?.value || '');
        setEstimateName(estimate.name);
    }, [estimate]);

    const isEditing = editingItem !== null;

    const parsedDiscountValue = parseFloat(String(discountValue)) || 0;

    const subtotal = useMemo(() => estimate.items.reduce((sum, item) => sum + item.quantity * item.price, 0), [estimate.items]);
    const discountAmount = useMemo(() => {
        if (discountType === 'percent') {
            return subtotal * (parsedDiscountValue / 100);
        }
        return parsedDiscountValue;
    }, [subtotal, discountType, parsedDiscountValue]);
    const total = subtotal - discountAmount;

    const shoppingList = useMemo(() => {
        return estimate.items
            .filter(item => item.type === 'Материал')
            .map(item => ({ name: item.name, quantity: item.quantity, unit: item.unit }));
    }, [estimate.items]);

    const handleCopyShoppingList = () => {
        if (shoppingList.length === 0) return;
        const listText = shoppingList
            .map(item => `${item.name} - ${item.quantity} ${item.unit}`)
            .join('\n');
        navigator.clipboard.writeText(listText).then(() => {
            addToast('Список покупок скопирован!', 'success');
            setShowShoppingListModal(false);
        }, (err) => {
            console.error('Could not copy text: ', err);
            addToast('Не удалось скопировать', 'error');
        });
    };

    const openModalForNew = () => {
        setEditingItem(null);
        setNewItem({ name: '', type: 'Работа', unit: 'шт', quantity: '1', price: '' });
        setShowModal(true);
    };

    const openModalForEdit = (item: EstimateItem) => {
        setEditingItem(item);
        setNewItem({ ...item, quantity: String(item.quantity), price: String(item.price) });
        setShowModal(true);
    };

    const closeModal = () => {
        if(isSaving) return;
        setShowModal(false);
        setSuggestions([]);
        setEditingItem(null);
    };
    
    const handleSaveItem = async () => {
        const trimmedName = newItem.name.trim();
        if (!trimmedName) return;
        setIsSaving(true);

        const finalItemData = {
            name: trimmedName,
            type: newItem.type,
            unit: newItem.unit,
            quantity: parseFloat(String(newItem.quantity)) || 1,
            price: parseFloat(String(newItem.price)) || 0,
        };

        try {
            let updatedItems;
            if (isEditing && editingItem) { // Update existing item
                updatedItems = estimate.items.map(item => item.id === editingItem.id ? { ...item, ...finalItemData } : item);
            } else { // Add new item
                const itemWithId: EstimateItem = { ...finalItemData, id: generateId() };
                updatedItems = [...estimate.items, itemWithId];
            }
            await onUpdate({ ...estimate, items: updatedItems });
            
            const isInDirectory = directory.some(dirItem => dirItem.name.toLowerCase() === trimmedName.toLowerCase());
            if (!isInDirectory) {
                const newDirectoryItem: DirectoryItem = { 
                    id: generateId(), 
                    name: finalItemData.name, 
                    type: finalItemData.type, 
                    unit: finalItemData.unit, 
                    price: finalItemData.price 
                };
                const updatedDirectory = [...directory, newDirectoryItem];
                setDirectory(updatedDirectory);
                await api.saveDirectory(updatedDirectory);
            }
            addToast(isEditing ? 'Позиция обновлена' : 'Позиция добавлена', 'success');
            closeModal();
        } catch (e) {
            addToast('Не удалось сохранить', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (window.confirm('Вы уверены, что хотите удалить эту позицию?')) {
            try {
                const updatedItems = estimate.items.filter(item => item.id !== itemId);
                await onUpdate({ ...estimate, items: updatedItems });
                addToast('Позиция удалена', 'success');
            } catch (e) {
                addToast('Не удалось удалить', 'error');
            }
        }
    };

    const handleDiscountChange = async (type: 'percent' | 'fixed', value: string | number) => {
        try {
            const newDiscount: Discount = { type, value: parseFloat(String(value)) || 0 };
            await onUpdate({ ...estimate, discount: newDiscount });
            addToast('Скидка применена', 'success');
        } catch (e) {
            addToast('Не удалось применить скидку', 'error');
        }
    };

    const handleNameChangeOnBlur = async () => {
        if (estimateName.trim() && estimateName !== estimate.name) {
            try {
                await onUpdate({ ...estimate, name: estimateName.trim() });
                addToast('Название сметы обновлено', 'success');
            } catch (e) {
                 addToast('Не удалось обновить название', 'error');
            }
        }
    };

    const handleShare = () => {
        const estimateLink = `${window.location.origin}${window.location.pathname}?view=estimate&projectId=${projectId}&estimateId=${estimate.id}`;
        navigator.clipboard.writeText(estimateLink).then(() => {
            addToast('Ссылка на смету скопирована!', 'success');
        });
    };

    const handleNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNewItem({ ...newItem, name: value });
        if (value.trim().length > 1) {
            const filteredSuggestions = directory.filter(item =>
                item.name.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 5);
            setSuggestions(filteredSuggestions);
        } else {
            setSuggestions([]);
        }
    };

    const handleSuggestionClick = (suggestion: DirectoryItem) => {
        setNewItem({
            ...newItem,
            name: suggestion.name,
            type: suggestion.type,
            unit: suggestion.unit,
            price: String(suggestion.price),
        });
        setSuggestions([]);
    };

    const handleSaveAsTemplate = () => {
        if (!estimateName.trim()) {
            addToast('Сначала введите название сметы', 'error');
            return;
        }
        if (estimate.items.length === 0) {
            addToast('Нельзя сохранить пустую смету как шаблон', 'error');
            return;
        }

        const template: EstimateTemplate = {
            id: generateId(),
            name: estimateName.trim(),
            items: estimate.items.map(({ name, type, unit, price }) => ({ name, type, unit, price }))
        };

        onSaveTemplate(template);
    };

    const openCommentModal = (item: EstimateItem) => {
        setCommentingItem(item);
        setShowCommentModal(true);
    };

    const handleAddComment = (itemId: string, commentText: string) => {
        const newComment: Comment = {
            id: generateId(),
            author: 'Исполнитель',
            text: commentText,
            timestamp: new Date().toISOString()
        };

        const updatedItems = estimate.items.map(item => {
            if (item.id === itemId) {
                return { ...item, comments: [...(item.comments || []), newComment] };
            }
            return item;
        });

        onUpdate({ ...estimate, items: updatedItems });
    };

    const handleApplyTemplate = (template: EstimateTemplate) => {
        const newItems: EstimateItem[] = template.items.map(item => ({
            ...item,
            id: generateId(),
            quantity: 1, // Default quantity
        }));
        const updatedItems = [...estimate.items, ...newItems];
        onUpdate({ ...estimate, items: updatedItems });
        addToast(`Шаблон "${template.name}" применен`, 'success');
    };
    
    return (
        <div className="card">
            <div className="estimate-card-header">
                <input 
                    type="text" 
                    value={estimateName} 
                    onChange={(e) => setEstimateName(e.target.value)}
                    onBlur={handleNameChangeOnBlur}
                    className="estimate-name-input"
                    aria-label="Название сметы"
                />
                <div className="card-header-actions">
                    <button className="btn btn-primary btn-sm" onClick={openModalForNew}>+ Добавить</button>
                    <button className="action-btn" onClick={() => setShowTemplateModal(true)} aria-label="Применить шаблон"><TemplateIcon /></button>
                    <button className="action-btn" onClick={handleSaveAsTemplate} aria-label="Сохранить как шаблон"><SaveTemplateIcon /></button>
                    <button className="action-btn" onClick={() => setShowShoppingListModal(true)} aria-label="Список покупок"><ShoppingListIcon /></button>
                    <button className="action-btn" onClick={handleShare} aria-label="Поделиться"><ShareIcon /></button>
                    <button className="action-btn" onClick={() => onDelete(estimate.id)} aria-label="Удалить смету"><DeleteIcon /></button>
                </div>
            </div>
             {estimate.approvedOn && (
                <span className="approval-badge">
                    <CheckIcon />
                    Согласована клиентом {new Date(estimate.approvedOn).toLocaleDateString('ru-RU')}
                </span>
            )}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Позиция</th>
                            <th className="align-right">Кол-во</th>
                            <th className="align-right">Цена</th>
                            <th className="align-right">Итог</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {estimate.items.length === 0 ? (
                            <tr><td colSpan={5} style={{textAlign: 'center', padding: '1rem'}}>Позиций пока нет.</td></tr>
                        ) : (
                            estimate.items.map((item, index) => (
                                <tr key={item.id} className="animate-fade-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                                    <td>
                                        <strong>{item.name}</strong>
                                        <br />
                                        <small>{item.type}</small>
                                    </td>
                                    <td className="align-right">{item.quantity} {item.unit}</td>
                                    <td className="align-right">{formatCurrency(item.price)}</td>
                                    <td className="align-right">{formatCurrency(item.quantity * item.price)}</td>
                                    <td className="align-right">
                                        <div className="item-actions">
                                            <button className="action-btn comment-btn" onClick={() => openCommentModal(item)} aria-label="Комментарии">
                                                <CommentIcon />
                                                {(item.comments?.length || 0) > 0 && <span className="comment-badge">{item.comments?.length}</span>}
                                            </button>
                                            <button className="action-btn" onClick={() => openModalForEdit(item)} aria-label="Редактировать"><EditIcon /></button>
                                            <button className="action-btn" onClick={() => handleDeleteItem(item.id)} aria-label="Удалить"><DeleteIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="estimate-summary-container">
                <div className="discount-controls">
                    <label>Скидка</label>
                    <div className="d-flex">
                        <div className="modal-toggle">
                            <button className={discountType === 'percent' ? 'active' : ''} onClick={() => { setDiscountType('percent'); handleDiscountChange('percent', discountValue); }}>%</button>
                            <button className={discountType === 'fixed' ? 'active' : ''} onClick={() => { setDiscountType('fixed'); handleDiscountChange('fixed', discountValue); }}>₽</button>
                        </div>
                        <input 
                            type="number" 
                            className="discount-input"
                            value={discountValue} 
                            placeholder="0"
                            onChange={(e) => setDiscountValue(e.target.value)}
                            onBlur={() => handleDiscountChange(discountType, discountValue)}
                            step={discountType === 'percent' ? '0.1' : '100'}
                        />
                    </div>
                </div>

                <div className="estimate-totals">
                     <div className="total-row">
                         <span>Подытог</span>
                         <span>{formatCurrency(subtotal)}</span>
                     </div>
                     {discountAmount > 0 && (
                         <div className="total-row discount-row">
                             <span>Скидка ({discountType === 'percent' ? `${parsedDiscountValue}%` : formatCurrency(parsedDiscountValue)})</span>
                             <span>- {formatCurrency(discountAmount)}</span>
                         </div>
                     )}
                     <div className="total-row grand-total">
                         <span>Итого</span>
                         <span>{formatCurrency(total)}</span>
                     </div>
                 </div>
            </div>

             <Modal show={showModal} onClose={closeModal} title={isEditing ? 'Редактировать позицию' : 'Добавить позицию'}>
                <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleSaveItem(); }}>
                    <div className="form-group autocomplete-container">
                        <label>Наименование</label>
                        <input type="text" value={newItem.name} onChange={handleNameInputChange} required autoComplete="off" disabled={isSaving}/>
                        {suggestions.length > 0 && (
                            <div className="autocomplete-suggestions">
                                {suggestions.map(suggestion => (
                                    <div key={suggestion.id} className="suggestion-item" onClick={() => handleSuggestionClick(suggestion)}>
                                        <div className="suggestion-name">{suggestion.name}</div>
                                        <div className="suggestion-details">
                                            {formatCurrency(suggestion.price)} ({suggestion.type})
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                     <div className="form-group">
                        <label>Тип</label>
                        <select value={newItem.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewItem({...newItem, type: e.target.value as 'Работа' | 'Материал'})} disabled={isSaving}>
                            <option>Работа</option>
                            <option>Материал</option>
                        </select>
                    </div>
                    <div className="d-flex gap-1">
                        <div className="form-group w-100">
                           <label>Количество</label>
                           <input type="number" step="any" value={newItem.quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItem({...newItem, quantity: e.target.value})} required disabled={isSaving}/>
                        </div>
                        <div className="form-group w-100">
                           <label>Ед. изм.</label>
                           <input type="text" value={newItem.unit} placeholder="шт, м², час" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItem({...newItem, unit: e.target.value})} required disabled={isSaving}/>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Цена за единицу</label>
                        <input type="number" step="0.01" value={newItem.price} placeholder="0" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItem({...newItem, price: e.target.value})} required disabled={isSaving}/>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isSaving}>Отмена</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? <Loader /> : (isEditing ? 'Сохранить' : 'Добавить')}
                        </button>
                    </div>
                </form>
            </Modal>
             <Modal show={showShoppingListModal} onClose={() => setShowShoppingListModal(false)} title="Список покупок">
                <div className="shopping-list-container">
                    {shoppingList.length > 0 ? (
                        <ul className="shopping-list">
                            {shoppingList.map((item, index) => (
                                <li key={index} className="shopping-list-item">
                                    <span className="shopping-list-name">{item.name}</span>
                                    <span className="shopping-list-quantity">{item.quantity} {item.unit}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>В смете нет материалов для составления списка.</p>
                    )}
                </div>
                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowShoppingListModal(false)}>Закрыть</button>
                    <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleCopyShoppingList}
                        disabled={shoppingList.length === 0}
                    >
                        Скопировать список
                    </button>
                </div>
            </Modal>
            <CommentModal
                show={showCommentModal}
                onClose={() => setShowCommentModal(false)}
                item={commentingItem}
                onAddComment={handleAddComment}
            />
            <TemplateModal
                show={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                templates={templates}
                onApplyTemplate={handleApplyTemplate}
                onDeleteTemplate={onDeleteTemplate}
            />
        </div>
    );
};

const ExpenseTracker = ({ project, projects, setProjects }: { project: Project, projects: Project[], setProjects: React.Dispatch<React.SetStateAction<Project[]>> }) => {
    const [showModal, setShowModal] = useState(false);
    const [entryType, setEntryType] = useState<'expense' | 'payment'>('expense');
    const [newEntry, setNewEntry] = useState({ date: new Date().toISOString().split('T')[0], description: '', amount: '' as string | number });
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToasts();

    const transactions = useMemo(() => {
        const combinedExpenses = project.expenses.map(e => ({ ...e, type: 'expense' as const }));
        const combinedPayments = project.payments.map(p => ({ ...p, type: 'payment' as const, description: 'Платеж от клиента' }));
        return [...combinedExpenses, ...combinedPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [project.expenses, project.payments]);

    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const finalAmount = parseFloat(String(newEntry.amount)) || 0;
        if (finalAmount <= 0) {
            addToast('Сумма должна быть больше нуля', 'error');
            setIsSaving(false);
            return;
        }

        try {
            let updatedProjects;
            if (entryType === 'expense') {
                let receiptDataUrl: string | undefined = undefined;
                if (receiptFile) {
                    receiptDataUrl = await fileToBase64(receiptFile);
                }
                const expenseWithId: Expense = { ...newEntry, amount: finalAmount, id: generateId(), receipt: receiptDataUrl };
                updatedProjects = projects.map(p => p.id === project.id ? { ...p, expenses: [...p.expenses, expenseWithId] } : p);
            } else {
                const paymentWithId: Payment = { id: generateId(), date: newEntry.date, amount: finalAmount };
                updatedProjects = projects.map(p => p.id === project.id ? { ...p, payments: [...p.payments, paymentWithId] } : p);
            }
            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
            addToast('Операция добавлена', 'success');
            setShowModal(false);
            setNewEntry({ date: new Date().toISOString().split('T')[0], description: '', amount: '' });
            setReceiptFile(null);
        } catch (e) {
            addToast('Не удалось сохранить', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteTransaction = async (id: string, type: 'expense' | 'payment') => {
        if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) return;
        
        try {
            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    if (type === 'expense') {
                        return { ...p, expenses: p.expenses.filter(e => e.id !== id) };
                    } else { // type === 'payment'
                        return { ...p, payments: p.payments.filter(pay => pay.id !== id) };
                    }
                }
                return p;
            });
            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
            addToast('Запись удалена', 'success');
        } catch (e) {
            addToast('Не удалось удалить', 'error');
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };
    
    const openReceiptPreview = (imageData: string) => {
        setReceiptPreview(imageData);
    };

    const closeReceiptPreview = () => {
        setReceiptPreview(null);
    };

    return (
        <div className="card">
            <div className="d-flex justify-between align-center mb-1">
                <h3>Финансы</h3>
                 <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Добавить</button>
            </div>

            {transactions.length === 0 ? (
                <div className="transaction-list-empty">Операций пока нет.</div>
            ) : (
                <div className="transaction-list">
                    {transactions.map((t, index) => (
                        <div key={t.id} className="transaction-item animate-fade-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <div className="transaction-details">
                                <span className="transaction-description">{t.description}</span>
                                <span className="transaction-date">{new Date(t.date).toLocaleDateString('ru-RU')}</span>
                            </div>
                            <div className="d-flex align-center">
                                {t.type === 'expense' && t.receipt && (
                                    <img src={t.receipt} alt="Чек" className="receipt-image" onClick={() => openReceiptPreview(t.receipt!)} />
                                )}
                                <span className={`transaction-amount ${t.type}`}>
                                    {t.type === 'expense' ? '-' : '+'}
                                    {formatCurrency(t.amount)}
                                </span>
                                 <button className="action-btn" onClick={() => handleDeleteTransaction(t.id, t.type)} aria-label="Удалить"><DeleteIcon /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <Modal show={showModal} onClose={() => !isSaving && setShowModal(false)} title="Добавить операцию">
                 <div className="modal-toggle" style={{justifyContent: 'center', marginBottom: 'var(--space-6)'}}>
                    <button className={entryType === 'expense' ? 'active' : ''} onClick={() => setEntryType('expense')}>Расход</button>
                    <button className={entryType === 'payment' ? 'active' : ''} onClick={() => setEntryType('payment')}>Платеж</button>
                </div>
                <form onSubmit={handleAddEntry}>
                    <div className="form-group">
                        <label>Сумма</label>
                        <input type="number" step="0.01" value={newEntry.amount} placeholder="0" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry({...newEntry, amount: e.target.value})} required disabled={isSaving}/>
                    </div>
                     <div className="form-group">
                        <label>Дата</label>
                        <input type="date" value={newEntry.date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry({...newEntry, date: e.target.value})} required disabled={isSaving}/>
                    </div>
                    {entryType === 'expense' && (
                        <>
                            <div className="form-group">
                                <label>Описание</label>
                                <input type="text" value={newEntry.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEntry({...newEntry, description: e.target.value})} placeholder="Например, материалы с рынка" required disabled={isSaving}/>
                            </div>
                            <div className="form-group">
                                <label>Фото чека</label>
                                <input type="file" accept="image/*" onChange={handleFileChange} disabled={isSaving}/>
                            </div>
                        </>
                    )}
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>Отмена</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                           {isSaving ? <Loader /> : 'Добавить'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={!!receiptPreview} onClose={closeReceiptPreview} title="Просмотр чека">
                {receiptPreview && <img src={receiptPreview} alt="Чек" style={{width: '100%', borderRadius: 'var(--border-radius)'}} />}
            </Modal>
        </div>
    );
};

const PhotoReports = ({ project, projects, setProjects }: { project: Project, projects: Project[], setProjects: React.Dispatch<React.SetStateAction<Project[]>> }) => {
    const [showModal, setShowModal] = useState(false);
    const [newReport, setNewReport] = useState({ date: new Date().toISOString().split('T')[0], description: '' });
    const [reportFile, setReportFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToasts();
    
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const photoReports = project.photoReports || [];

    const openViewer = (index: number) => {
        setCurrentImageIndex(index);
        setIsViewerOpen(true);
    };

    const closeViewer = () => {
        setIsViewerOpen(false);
    };

    const handleAddReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reportFile) {
            addToast('Пожалуйста, выберите файл', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const imageDataUrl = await fileToBase64(reportFile);
            const reportWithId: PhotoReport = {
                ...newReport,
                id: generateId(),
                image: imageDataUrl,
            };

            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    const existingReports = p.photoReports || [];
                    return { ...p, photoReports: [reportWithId, ...existingReports] };
                }
                return p;
            });

            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
            addToast('Фотоотчет добавлен', 'success');
            setShowModal(false);
            setNewReport({ date: new Date().toISOString().split('T')[0], description: '' });
            setReportFile(null);
        } catch (err) {
            addToast('Не удалось добавить фотоотчет', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        if (!window.confirm('Вы уверены, что хотите удалить этот фотоотчет?')) return;

        try {
            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    const updatedReports = (p.photoReports || []).filter(r => r.id !== reportId);
                    return { ...p, photoReports: updatedReports };
                }
                return p;
            });
            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
            addToast('Фотоотчет удален', 'success');
        } catch (err) {
            addToast('Не удалось удалить фотоотчет', 'error');
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReportFile(e.target.files[0]);
        }
    };

    return (
        <div className="card">
            <div className="d-flex justify-between align-center mb-1">
                <h3>Фотоотчеты</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Добавить фото</button>
            </div>
            {photoReports.length === 0 ? (
                <div className="transaction-list-empty">Фотоотчетов пока нет.</div>
            ) : (
                <div className="photo-reports-grid">
                    {photoReports.map((report, index) => (
                        <div key={report.id} className="photo-report-card" onClick={() => openViewer(index)}>
                            <img src={report.image} alt={report.description} />
                            <div className="photo-report-info">
                                <p>{report.description}</p>
                                <small>{new Date(report.date).toLocaleDateString('ru-RU')}</small>
                            </div>
                            <button className="photo-report-delete-btn action-btn" onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.id); }} aria-label="Удалить фотоотчет">
                                <DeleteIcon />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <Modal show={showModal} onClose={() => !isSaving && setShowModal(false)} title="Добавить фотоотчет">
                <form onSubmit={handleAddReport}>
                    <div className="form-group">
                        <label>Фотография</label>
                        <input type="file" accept="image/*" onChange={handleFileChange} required disabled={isSaving} />
                    </div>
                    <div className="form-group">
                        <label>Описание</label>
                        <input type="text" value={newReport.description} onChange={e => setNewReport({ ...newReport, description: e.target.value })} placeholder="Например, укладка плитки" required disabled={isSaving} />
                    </div>
                    <div className="form-group">
                        <label>Дата</label>
                        <input type="date" value={newReport.date} onChange={e => setNewReport({ ...newReport, date: e.target.value })} required disabled={isSaving} />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>Отмена</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                           {isSaving ? <Loader /> : 'Добавить'}
                        </button>
                    </div>
                </form>
            </Modal>
            <PhotoViewerModal
                show={isViewerOpen}
                onClose={closeViewer}
                images={photoReports}
                startIndex={currentImageIndex}
            />
        </div>
    );
};

const ProjectSchedule = ({ project, projects, setProjects }: { project: Project, projects: Project[], setProjects: React.Dispatch<React.SetStateAction<Project[]>> }) => {
    const [showModal, setShowModal] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', startDate: '', endDate: '' });
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToasts();
    
    const schedule = project.schedule || [];

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.name || !newItem.startDate || !newItem.endDate) {
            addToast('Заполните все поля', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const itemWithId: ProjectScheduleItem = { ...newItem, id: generateId(), completed: false };
            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    const existingSchedule = p.schedule || [];
                    return { ...p, schedule: [...existingSchedule, itemWithId] };
                }
                return p;
            });

            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
            addToast('Этап добавлен в график', 'success');
            setShowModal(false);
            setNewItem({ name: '', startDate: '', endDate: '' });
        } catch (err) {
            addToast('Не удалось добавить этап', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteItem = async (itemId: string) => {
        if (!window.confirm('Удалить этот этап?')) return;
        try {
            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    return { ...p, schedule: (p.schedule || []).filter(item => item.id !== itemId) };
                }
                return p;
            });
            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
            addToast('Этап удален', 'success');
        } catch (err) {
            addToast('Не удалось удалить этап', 'error');
        }
    };

    const toggleItemCompletion = async (itemId: string) => {
         try {
            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    const updatedSchedule = (p.schedule || []).map(item =>
                        item.id === itemId ? { ...item, completed: !item.completed } : item
                    );
                    return { ...p, schedule: updatedSchedule };
                }
                return p;
            });
            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
        } catch (err) {
            addToast('Не удалось обновить статус', 'error');
        }
    };

    return (
        <div className="card">
            <div className="d-flex justify-between align-center mb-1">
                <h3>График работ</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Добавить этап</button>
            </div>
            {schedule.length === 0 ? (
                <div className="transaction-list-empty">Этапы работ пока не добавлены.</div>
            ) : (
                <div className="data-list">
                    {schedule.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(item => (
                        <div key={item.id} className={`data-item schedule-item ${item.completed ? 'completed' : ''}`}>
                             <div className="schedule-item-toggle">
                                <button className="action-btn" onClick={() => toggleItemCompletion(item.id)}>
                                    {item.completed ? <ReplayIcon /> : <CheckIcon />}
                                </button>
                            </div>
                            <div className="data-item-info">
                                <p><strong>{item.name}</strong></p>
                                <span className="data-item-subtext">
                                    {new Date(item.startDate).toLocaleDateString('ru-RU')} - {new Date(item.endDate).toLocaleDateString('ru-RU')}
                                </span>
                            </div>
                            <button className="action-btn" onClick={() => handleDeleteItem(item.id)} aria-label="Удалить этап">
                                <DeleteIcon />
                            </button>
                        </div>
                    ))}
                </div>
            )}
             <Modal show={showModal} onClose={() => !isSaving && setShowModal(false)} title="Добавить этап работ">
                <form onSubmit={handleAddItem}>
                    <div className="form-group">
                        <label>Наименование этапа</label>
                        <input type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Например, Черновые работы" required disabled={isSaving} />
                    </div>
                     <div className="d-flex gap-1">
                        <div className="form-group w-100">
                            <label>Дата начала</label>
                            <input type="date" value={newItem.startDate} onChange={e => setNewItem({ ...newItem, startDate: e.target.value })} required disabled={isSaving} />
                        </div>
                        <div className="form-group w-100">
                            <label>Дата окончания</label>
                            <input type="date" value={newItem.endDate} onChange={e => setNewItem({ ...newItem, endDate: e.target.value })} required disabled={isSaving} />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>Отмена</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                           {isSaving ? <Loader /> : 'Добавить'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};


const ProjectDocuments = ({ project, projects, setProjects }: { project: Project, projects: Project[], setProjects: React.Dispatch<React.SetStateAction<Project[]>> }) => {
    const [showModal, setShowModal] = useState(false);
    const [newItem, setNewItem] = useState({ name: '' });
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToasts();
    
    const documents = project.documents || [];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setDocumentFile(e.target.files[0]);
            if (!newItem.name) {
                setNewItem({ name: e.target.files[0].name.replace(/\.[^/.]+$/, "") });
            }
        }
    };
    
    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!documentFile) {
            addToast('Выберите файл для загрузки', 'error');
            return;
        }
        setIsSaving(true);
        try {
            const fileData = await fileToBase64(documentFile);
            const itemWithId: ProjectDocument = {
                id: generateId(),
                name: newItem.name.trim(),
                file: fileData,
                fileName: documentFile.name
            };
            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    return { ...p, documents: [...(p.documents || []), itemWithId] };
                }
                return p;
            });
            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
            addToast('Документ загружен', 'success');
            setShowModal(false);
            setNewItem({ name: '' });
            setDocumentFile(null);
        } catch (err) {
            addToast('Не удалось загрузить документ', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!window.confirm('Удалить этот документ?')) return;
        try {
            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    return { ...p, documents: (p.documents || []).filter(item => item.id !== itemId) };
                }
                return p;
            });
            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
            addToast('Документ удален', 'success');
        } catch (err) {
            addToast('Не удалось удалить документ', 'error');
        }
    };
    
    const handleDownload = (fileDataUrl: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = fileDataUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="card">
            <div className="d-flex justify-between align-center mb-1">
                <h3>Документы</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ Загрузить</button>
            </div>
            {documents.length === 0 ? (
                <div className="transaction-list-empty">Документов пока нет.</div>
            ) : (
                <div className="data-list">
                    {documents.map(doc => (
                        <div key={doc.id} className="data-item">
                            <div className="data-item-info">
                                <a href="#" onClick={(e) => { e.preventDefault(); handleDownload(doc.file, doc.fileName); }}>
                                    {doc.name}
                                </a>
                            </div>
                            <button className="action-btn" onClick={() => handleDeleteItem(doc.id)} aria-label="Удалить документ">
                                <DeleteIcon />
                            </button>
                        </div>
                    ))}
                </div>
            )}
             <Modal show={showModal} onClose={() => !isSaving && setShowModal(false)} title="Загрузить документ">
                <form onSubmit={handleAddItem}>
                    <div className="form-group">
                        <label>Файл</label>
                        <input type="file" onChange={handleFileChange} required disabled={isSaving} />
                    </div>
                    <div className="form-group">
                        <label>Название документа</label>
                        <input type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Например, Договор" required disabled={isSaving} />
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>Отмена</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                           {isSaving ? <Loader /> : 'Загрузить'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

const ProjectNotes = ({ project, projects, setProjects }: { project: Project, projects: Project[], setProjects: React.Dispatch<React.SetStateAction<Project[]>> }) => {
    const [newNote, setNewNote] = useState('');
    const { addToast } = useToasts();
    
    const notes = project.notes || [];

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        try {
            const noteWithId: ProjectNote = {
                id: generateId(),
                text: newNote.trim(),
                createdAt: new Date().toISOString()
            };
            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    return { ...p, notes: [...(p.notes || []), noteWithId] };
                }
                return p;
            });
            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
            setNewNote('');
        } catch (err) {
            addToast('Не удалось добавить заметку', 'error');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!window.confirm('Удалить эту заметку?')) return;
        try {
            const updatedProjects = projects.map(p => {
                if (p.id === project.id) {
                    return { ...p, notes: (p.notes || []).filter(note => note.id !== noteId) };
                }
                return p;
            });
            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
            addToast('Заметка удалена', 'success');
        } catch (err) {
            addToast('Не удалось удалить заметку', 'error');
        }
    };

    return (
        <div className="card">
            <h3>Заметки по объекту</h3>
            {notes.length === 0 ? (
                <div className="transaction-list-empty">Заметок пока нет.</div>
            ) : (
                <div className="data-list">
                    {notes.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(note => (
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
                </div>
            )}
            <form onSubmit={handleAddNote} className="add-note-form">
                <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Новая заметка..."
                />
                <button type="submit" className="btn btn-primary btn-sm">Добавить</button>
            </form>
        </div>
    );
};


// --- MAIN VIEW COMPONENT ---
export const ProjectDetailsView = ({ project, projects, setProjects, onBack, directory, setDirectory, templates, onSaveTemplate, onDeleteTemplate }: ProjectDetailsViewProps) => {
    const { addToast } = useToasts();
    const [showEditModal, setShowEditModal] = useState(false);
    const [showActModal, setShowActModal] = useState(false);
    const [actContent, setActContent] = useState('');
    const [isActGenerating, setIsActGenerating] = useState(false);

    const handleUpdateProject = async (updatedProject: Project) => {
        try {
            const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
            setProjects(updatedProjects);
            await api.saveProjects(updatedProjects);
        } catch (e) {
            addToast('Ошибка при сохранении проекта', 'error');
        }
    };
    
    const handleDeleteProject = async () => {
        if (window.confirm('Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.')) {
            try {
                const updatedProjects = projects.filter(p => p.id !== project.id);
                setProjects(updatedProjects);
                await api.saveProjects(updatedProjects);
                addToast('Проект удален', 'success');
                onBack();
            } catch (e) {
                addToast('Ошибка при удалении проекта', 'error');
            }
        }
    };

    const handleUpdateEstimate = async (updatedEstimate: Estimate) => {
        const updatedEstimates = project.estimates.map(e => e.id === updatedEstimate.id ? updatedEstimate : e);
        await handleUpdateProject({ ...project, estimates: updatedEstimates });
    };
    
    const handleAddEstimate = async () => {
        const newEstimate: Estimate = {
            id: generateId(),
            name: `Новая смета №${project.estimates.length + 1}`,
            items: [],
        };
        await handleUpdateProject({ ...project, estimates: [...project.estimates, newEstimate] });
        addToast('Новая смета добавлена', 'success');
    };

    const handleDeleteEstimate = async (estimateId: string) => {
        if (project.estimates.length <= 1) {
            addToast('Нельзя удалить последнюю смету', 'error');
            return;
        }
        if (window.confirm('Вы уверены, что хотите удалить эту смету?')) {
            const updatedEstimates = project.estimates.filter(e => e.id !== estimateId);
            await handleUpdateProject({ ...project, estimates: updatedEstimates });
            addToast('Смета удалена', 'success');
        }
    };

    const generateAct = async () => {
        setIsActGenerating(true);
        setShowActModal(true);
        try {
            const totalAmount = project.estimates.reduce((projectSum, estimate) => {
                const subtotal = estimate.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
                const discountAmount = estimate.discount ? (estimate.discount.type === 'percent' ? subtotal * (estimate.discount.value / 100) : estimate.discount.value) : 0;
                return projectSum + (subtotal - discountAmount);
            }, 0);

            // Mocked AI response for local functionality
            const mockActText = `
АКТ № ${generateId().substring(3, 8)}
сдачи-приемки выполненных работ

г. (Ваш Город)                                       "${new Date().getDate()}" ${new Date().toLocaleString('ru', { month: 'long' })} ${new Date().getFullYear()} г.

Мы, нижеподписавшиеся, Исполнитель ${project.contractor?.companyName || project.contractor?.contactName || 'Исполнитель'}, с одной стороны, и Заказчик ${project.client.name}, с другой стороны, составили настоящий Акт о нижеследующем:

1. Исполнителем были выполнены работы по объекту "${project.name}" по адресу ${project.address}.
2. Работы выполнены в соответствии с условиями договора, в полном объеме и в установленные сроки.
3. Общая стоимость выполненных работ по смете составляет: ${formatCurrency(totalAmount)}.
4. Качество выполненных работ соответствует требованиям. Заказчик претензий по объему, качеству и срокам выполнения работ не имеет.

Настоящий Акт составлен в двух экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из сторон.

ПОДПИСИ СТОРОН:

_________________ (Исполнитель)

_________________ (Заказчик)
    `.trim();

            // Simulate network delay for better UX
            await new Promise(resolve => setTimeout(resolve, 1000));

            setActContent(mockActText);

        } catch (error) {
            console.error(error);
            setActContent("Произошла ошибка при генерации акта.");
        } finally {
            setIsActGenerating(false);
        }
    };
    
    return (
        <>
            <button className="back-button" onClick={onBack}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="currentColor"/></svg>
                Все проекты
            </button>
            <div className="project-details-header">
                <div className="d-flex justify-between align-start">
                    <div>
                        <h2>{project.name}</h2>
                        <p>{project.address}</p>
                        <p><strong>Клиент:</strong> {project.client.name}, {project.client.phone}</p>
                    </div>
                    <div className="project-header-actions">
                        {project.status === 'Завершен' && (
                            <button className="action-btn" onClick={generateAct} aria-label="Сгенерировать акт"><DocumentIcon /></button>
                        )}
                        <button className="action-btn" onClick={() => setShowEditModal(true)} aria-label="Редактировать проект"><EditIcon /></button>
                        <button className="action-btn" onClick={handleDeleteProject} aria-label="Удалить проект"><DeleteIcon /></button>
                    </div>
                </div>
            </div>

            <FinancialDashboard project={project} />

            <div className="estimates-container">
                {project.estimates.map(estimate => (
                     <EstimateEditor 
                        key={estimate.id}
                        estimate={estimate} 
                        projectId={project.id}
                        onUpdate={handleUpdateEstimate} 
                        onDelete={handleDeleteEstimate}
                        directory={directory}
                        setDirectory={setDirectory}
                        templates={templates}
                        onSaveTemplate={onSaveTemplate}
                        onDeleteTemplate={onDeleteTemplate}
                    />
                ))}
            </div>
             <div style={{textAlign: 'center', marginTop: 'var(--space-6)'}}>
                 <button className="btn btn-secondary" onClick={handleAddEstimate}>+ Добавить смету</button>
             </div>
            
            <ProjectNotes project={project} projects={projects} setProjects={setProjects} />
            <ProjectSchedule project={project} projects={projects} setProjects={setProjects} />
            <ProjectDocuments project={project} projects={projects} setProjects={setProjects} />
            <ExpenseTracker project={project} projects={projects} setProjects={setProjects} />
            <PhotoReports project={project} projects={projects} setProjects={setProjects} />
            
            <Modal show={showActModal} onClose={() => setShowActModal(false)} title="Акт сдачи-приемки работ">
                {isActGenerating ? <Loader /> : (
                    <>
                        <textarea className="act-textarea" value={actContent} readOnly />
                        <div className="form-actions">
                             <button className="btn btn-secondary" onClick={() => setShowActModal(false)}>Закрыть</button>
                             <button className="btn btn-primary" onClick={() => navigator.clipboard.writeText(actContent).then(() => addToast('Акт скопирован', 'success'))}>Скопировать</button>
                        </div>
                    </>
                )}
            </Modal>
            
            <ProjectFormModal
                show={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSave={handleUpdateProject}
                existingProject={project}
            />
        </>
    );
};