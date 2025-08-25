import React, { useState, useEffect } from 'react';
import { api } from './api';
import type { Project, Estimate, EstimateItem, Comment } from './types';
import { useToasts, Loader, Modal } from './components';
import { generateId, formatCurrency } from './utils';
import { LogoIcon, PrintIcon, CheckIcon, CommentIcon, ImageIcon } from './icons';

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

// --- PUBLIC ESTIMATE VIEW ---
export const PublicEstimateView = () => {
    const [project, setProject] = useState<Project | null>(null);
    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { addToast } = useToasts();
    
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [commentingItem, setCommentingItem] = useState<EstimateItem | null>(null);
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('projectId');
        const estimateId = params.get('estimateId');

        if (!projectId || !estimateId) {
            setError('Неверная ссылка на смету.');
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const data = await api.getPublicEstimateData(projectId, estimateId);
                setProject(data.project);
                setEstimate(data.estimate);
            } catch (err) {
                 setError('Смета не найдена. Возможно, она была удалена.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleApprove = async () => {
        if (!project || !estimate || estimate.approvedOn) return;
        if (window.confirm('Вы уверены, что хотите согласовать эту смету? Это действие нельзя будет отменить.')) {
            try {
                await api.approvePublicEstimate(project.id, estimate.id);
                setEstimate(prev => prev ? {...prev, approvedOn: new Date().toISOString()} : null);
                addToast('Смета успешно согласована!', 'success');
            } catch (err) {
                 addToast('Не удалось согласовать смету', 'error');
            }
        }
    };

    const handleAddComment = (itemId: string, commentText: string) => {
        if (!project || !estimate) return;

        // Note: In a real app, this would be an API call to post a comment.
        // For the mock, we just update local state. The change won't persist on reload.
        const newComment: Comment = {
            id: generateId(),
            author: 'Клиент',
            text: commentText,
            timestamp: new Date().toISOString()
        };

        const updatedEstimate = {
            ...estimate,
            items: estimate.items.map(item =>
                item.id === itemId ? { ...item, comments: [...(item.comments || []), newComment] } : item
            )
        };
        setEstimate(updatedEstimate);
        addToast("Комментарий добавлен (в демо-режиме)", "success");
    };

    if (loading) return <Loader fullScreen />;
    if (error) return <div className="app-container"><div className="auth-error">{error}</div></div>;
    if (!project || !estimate) return null;

    const subtotal = estimate.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const discountAmount = estimate.discount ? (estimate.discount.type === 'percent' ? subtotal * (estimate.discount.value / 100) : estimate.discount.value) : 0;
    const total = subtotal - discountAmount;
    
    return (
        <div className="public-estimate-container">
            <div className="public-header">
                <a href={window.location.origin + window.location.pathname} className="header-logo" aria-label="На главную">
                    <LogoIcon />
                    <span>Прораб</span>
                </a>
                <button className="btn btn-secondary btn-sm print-button" onClick={() => window.print()}>
                    <PrintIcon /> Печать / PDF
                </button>
            </div>
            
            <div className="card contractor-card">
                {project.contractor?.logo ? (
                     <img src={project.contractor.logo} alt="Логотип исполнителя" className="contractor-logo" />
                ) : (
                    <div className="logo-placeholder"><ImageIcon /></div>
                )}
                <div className="contractor-info">
                    <strong>{project.contractor?.companyName || project.contractor?.contactName}</strong>
                    <p>{project.contractor?.phone}</p>
                </div>
            </div>

            <div className="card">
                <div className="project-details-header">
                    <h2>Смета: {estimate.name}</h2>
                    <p><strong>Объект:</strong> {project.name}, {project.address}</p>
                    <p><strong>Заказчик:</strong> {project.client.name}, {project.client.phone}</p>
                </div>
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
                            {estimate.items.map(item => (
                                <tr key={item.id}>
                                    <td><strong>{item.name}</strong><br/><small>{item.type}</small></td>
                                    <td className="align-right">{item.quantity} {item.unit}</td>
                                    <td className="align-right">{formatCurrency(item.price)}</td>
                                    <td className="align-right">{formatCurrency(item.quantity * item.price)}</td>
                                    <td className="align-right">
                                        <button className="action-btn comment-btn" onClick={() => { setCommentingItem(item); setShowCommentModal(true); }}>
                                            <CommentIcon />
                                            {(item.comments?.length || 0) > 0 && <span className="comment-badge">{item.comments.length}</span>}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="estimate-summary-container">
                    <div />
                    <div className="estimate-totals">
                        <div className="total-row"><span>Подытог</span><span>{formatCurrency(subtotal)}</span></div>
                        {discountAmount > 0 && (
                            <div className="total-row discount-row">
                                <span>Скидка</span>
                                <span>- {formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        <div className="total-row grand-total"><span>Итого</span><span>{formatCurrency(total)}</span></div>
                    </div>
                </div>
            </div>
            
            {(project.photoReports || []).length > 0 && (
                <div className="card">
                    <h3>Фотоотчеты</h3>
                    <div className="photo-reports-grid public-view">
                         {(project.photoReports || []).map(report => (
                            <div key={report.id} className="photo-report-card-public">
                                <img src={report.image} alt={report.description} />
                                <div className="photo-report-info-public">
                                    <p>{report.description}</p>
                                    <small>{new Date(report.date).toLocaleDateString('ru-RU')}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="approval-section">
                {estimate.approvedOn ? (
                    <div className="approval-status approved">
                        <CheckIcon/>
                        <div>
                            <strong>Смета согласована</strong>
                            <p>Заказчик утвердил эту смету {new Date(estimate.approvedOn).toLocaleString('ru-RU')}.</p>
                        </div>
                    </div>
                ) : (
                     <>
                        <p>Пожалуйста, внимательно ознакомьтесь со сметой. Если у вас есть вопросы, свяжитесь с исполнителем. Если все верно, нажмите кнопку "Согласовать смету".</p>
                        <button className="btn btn-primary btn-large" onClick={handleApprove}>Согласовать смету</button>
                    </>
                )}
            </div>

            <footer className="public-footer">
                <p>
                    Смета сформирована в&nbsp;
                    <a href={window.location.origin + window.location.pathname} className="footer-logo-link" target="_blank" rel="noopener noreferrer">
                        <LogoIcon size={16}/> Прораб
                    </a>
                </p>
            </footer>
             <CommentModal
                show={showCommentModal}
                onClose={() => setShowCommentModal(false)}
                item={commentingItem}
                onAddComment={handleAddComment}
            />
        </div>
    );
};
