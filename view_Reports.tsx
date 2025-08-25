import React, { useMemo, useState } from 'react';
import type { Project } from './types';
import { formatCurrency } from './utils';

export const ReportsView = ({ projects }: { projects: Project[] }) => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(lastDayOfMonth);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const completedDate = p.completedAt;
            return p.status === 'Завершен' && completedDate && completedDate >= startDate && completedDate <= endDate + 'T23:59:59';
        });
    }, [projects, startDate, endDate]);

    const reportData = useMemo(() => {
        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalProfit = 0;

        filteredProjects.forEach(project => {
            const estimateTotal = project.estimates.reduce((projectSum, estimate) => {
                const subtotal = estimate.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
                const discountAmount = estimate.discount ? (estimate.discount.type === 'percent' ? subtotal * (estimate.discount.value / 100) : estimate.discount.value) : 0;
                return projectSum + (subtotal - discountAmount);
            }, 0);
            
            const workTotal = project.estimates.flatMap(e => e.items)
                .filter(item => item.type === 'Работа')
                .reduce((sum, item) => sum + item.quantity * item.price, 0);
            
            const expensesTotal = project.expenses.reduce((sum, expense) => sum + expense.amount, 0);

            totalRevenue += estimateTotal;
            totalExpenses += expensesTotal;
            totalProfit += (workTotal - expensesTotal);
        });

        return {
            totalRevenue,
            totalExpenses,
            totalProfit,
            completedProjectsCount: filteredProjects.length,
            averageProfit: filteredProjects.length > 0 ? totalProfit / filteredProjects.length : 0,
        };
    }, [filteredProjects]);

    const handleExportCSV = () => {
        if (filteredProjects.length === 0) return;
        
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for Excel
        csvContent += "Проект,Клиент,Дата завершения,Сумма сметы,Расходы,Прибыль\n";

        filteredProjects.forEach(p => {
            const estimateTotal = p.estimates.reduce((sum, est) => sum + est.items.reduce((s, i) => s + i.price * i.quantity, 0), 0);
            const expensesTotal = p.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            const workTotal = p.estimates.flatMap(e => e.items).filter(i => i.type === 'Работа').reduce((sum, i) => sum + i.price * i.quantity, 0);
            const profit = workTotal - expensesTotal;
            
            const row = [
                `"${p.name.replace(/"/g, '""')}"`,
                `"${p.client.name.replace(/"/g, '""')}"`,
                new Date(p.completedAt!).toLocaleDateString('ru-RU'),
                estimateTotal,
                expensesTotal,
                profit
            ].join(',');
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `report_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="reports-header">
                <h3>Сводный отчет</h3>
                <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} disabled={filteredProjects.length === 0}>
                    Скачать отчет (CSV)
                </button>
            </div>
            
            <div className="card date-filter-container">
                 <div className="d-flex gap-1 align-center">
                    <div className="form-group w-100">
                        <label>Начало периода</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                     <span>&mdash;</span>
                    <div className="form-group w-100">
                        <label>Конец периода</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                 </div>
            </div>

            <div className="reports-grid">
                <div className="report-card">
                    <div className="report-card-label">Общая выручка</div>
                    <div className="report-card-value">{formatCurrency(reportData.totalRevenue)}</div>
                </div>
                <div className="report-card">
                    <div className="report-card-label">Общие расходы</div>
                    <div className="report-card-value">{formatCurrency(reportData.totalExpenses)}</div>
                </div>
                <div className="report-card">
                    <div className="report-card-label">Чистая прибыль</div>
                    <div className={`report-card-value ${reportData.totalProfit >= 0 ? 'profit' : 'loss'}`}>
                        {formatCurrency(reportData.totalProfit)}
                    </div>
                </div>
            </div>

            <div className="reports-grid small" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
                 <div className="report-card small">
                    <div className="report-card-label">Завершено проектов</div>
                    <div className="report-card-value">{reportData.completedProjectsCount}</div>
                </div>
                 <div className="report-card small">
                    <div className="report-card-label">Средняя прибыль</div>
                    <div className="report-card-value">{formatCurrency(reportData.averageProfit)}</div>
                </div>
            </div>
            
             <div className="card">
                <h3>Детализация по проектам</h3>
                <div className="table-container">
                    <table className="profit-table">
                        <thead>
                            <tr>
                                <th>Проект</th>
                                <th className="align-right">Сумма</th>
                                <th className="align-right">Прибыль</th>
                            </tr>
                        </thead>
                        <tbody>
                             {filteredProjects.length === 0 ? (
                                <tr><td colSpan={3} style={{textAlign: 'center', padding: '1rem'}}>Нет завершенных проектов за выбранный период.</td></tr>
                            ) : (
                                filteredProjects.map(p => {
                                    const estimateTotal = p.estimates.reduce((sum, est) => {
                                        const subtotal = est.items.reduce((s, i) => s + i.price * i.quantity, 0);
                                        const discount = est.discount ? (est.discount.type === 'percent' ? subtotal * (est.discount.value / 100) : est.discount.value) : 0;
                                        return sum + (subtotal - discount);
                                    }, 0);
                                    const expensesTotal = p.expenses.reduce((sum, exp) => sum + exp.amount, 0);
                                    const workTotal = p.estimates.flatMap(e => e.items).filter(i => i.type === 'Работа').reduce((sum, i) => sum + i.price * i.quantity, 0);
                                    const profit = workTotal - expensesTotal;

                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <strong>{p.name}</strong><br/>
                                                <small>{p.client.name}</small>
                                            </td>
                                            <td className="align-right">{formatCurrency(estimateTotal)}</td>
                                            <td className={`align-right ${profit >= 0 ? 'profit' : 'loss'}`}>{formatCurrency(profit)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </>
    );
};
