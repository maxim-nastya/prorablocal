import React, { useMemo } from 'react';
import type { DashboardViewProps, Project, ViewState } from './types';
import { formatCurrency } from './utils';
import { CalendarIcon } from './icons';

type TodayTask = {
    id: string;
    name: string;
    projectName: string;
    projectId: string;
    endDate: string;
};

type RecentTransaction = {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'expense' | 'payment';
    projectName: string;
    projectId: string;
};

export const DashboardView = ({ projects, setCurrentView }: DashboardViewProps) => {
    
    const todaysTasks = useMemo((): TodayTask[] => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tasks: TodayTask[] = [];
        
        projects
            .filter(p => p.status === 'В работе')
            .forEach(p => {
                (p.schedule || []).forEach(task => {
                    const startDate = new Date(task.startDate);
                    const endDate = new Date(task.endDate);
                    if (!task.completed && today >= startDate && today <= endDate) {
                        tasks.push({
                            id: task.id,
                            name: task.name,
                            projectName: p.name,
                            projectId: p.id,
                            endDate: task.endDate,
                        });
                    }
                });
            });
            
        return tasks.sort((a,b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    }, [projects]);

    const recentTransactions = useMemo((): RecentTransaction[] => {
        const allTransactions: RecentTransaction[] = [];
        
        projects.forEach(p => {
            p.expenses.forEach(exp => {
                allTransactions.push({
                    ...exp,
                    type: 'expense',
                    projectName: p.name,
                    projectId: p.id
                });
            });
            p.payments.forEach(pay => {
                allTransactions.push({
                    ...pay,
                    description: 'Платеж от клиента',
                    type: 'payment',
                    projectName: p.name,
                    projectId: p.id
                });
            });
        });
        
        return allTransactions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);

    }, [projects]);

    const handleNavigate = (view: ViewState) => {
        setCurrentView(view);
    };

    return (
        <>
            <div className="card">
                <div className="d-flex align-center gap-1" style={{marginBottom: 'var(--space-4)'}}>
                    <CalendarIcon />
                    <h3>Задачи на сегодня</h3>
                </div>
                {todaysTasks.length > 0 ? (
                    <div className="data-list">
                        {todaysTasks.map(task => (
                            <div key={task.id} className="data-item dashboard-item-link" onClick={() => handleNavigate({ view: 'project_details', projectId: task.projectId })}>
                                <div className="data-item-info">
                                    <p><strong>{task.name}</strong></p>
                                    <span className="data-item-subtext">Проект: {task.projectName}</span>
                                </div>
                                <span className="data-item-subtext">до {new Date(task.endDate).toLocaleDateString('ru-RU')}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="field-hint" style={{textAlign: 'center', padding: 'var(--space-4) 0'}}>На сегодня активных задач нет. Время планировать или отдыхать!</p>
                )}
            </div>
            
            <div className="card">
                <h3>Последние финансовые операции</h3>
                {recentTransactions.length > 0 ? (
                    <div className="transaction-list">
                        {recentTransactions.map(t => (
                             <div key={`${t.type}-${t.id}`} className="transaction-item dashboard-item-link" onClick={() => handleNavigate({ view: 'project_details', projectId: t.projectId })}>
                                <div className="transaction-details">
                                    <span className="transaction-description">{t.description}</span>
                                    <span className="transaction-date">{t.projectName} &bull; {new Date(t.date).toLocaleDateString('ru-RU')}</span>
                                </div>
                                <span className={`transaction-amount ${t.type}`}>
                                    {t.type === 'expense' ? '-' : '+'}
                                    {formatCurrency(t.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                     <p className="field-hint" style={{textAlign: 'center', padding: 'var(--space-4) 0'}}>Финансовых операций пока не было.</p>
                )}
            </div>
        </>
    );
};
