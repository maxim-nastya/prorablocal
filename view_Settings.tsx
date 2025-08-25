import React, { useState, useMemo } from 'react';
import type { SettingsViewProps } from './types';
import { useToasts, Loader } from './components';
import { ImageIcon } from './icons';
import { fileToBase64 } from './utils';

export const SettingsView = ({ user, profile, onSave, onLogout }: SettingsViewProps) => {
    const [formData, setFormData] = useState(profile);
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToasts();
    
    const subscriptionStatus = useMemo(() => {
        if (!user) return { status: 'Нет данных', date: null };
        const now = new Date();

        if (user.subscriptionEndsAt) {
            const subEndDate = new Date(user.subscriptionEndsAt);
            if (subEndDate > now) {
                return { status: 'Активна до', date: subEndDate.toLocaleDateString('ru-RU') };
            }
        }
        if (user.trialEndsAt) {
            const trialEndDate = new Date(user.trialEndsAt);
            if (trialEndDate > now) {
                return { status: 'Пробный период до', date: trialEndDate.toLocaleDateString('ru-RU') };
            }
        }
        return { status: 'Неактивна', date: null };
    }, [user]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const base64 = await fileToBase64(e.target.files[0]);
                setFormData(prev => ({ ...prev, logo: base64 }));
            } catch (err) {
                addToast('Не удалось загрузить логотип', 'error');
            }
        }
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            addToast('Профиль сохранен', 'success');
        } catch (err) {
            addToast('Не удалось сохранить', 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <>
            <div className="card">
                <h3>Настройки профиля</h3>
                <form onSubmit={handleSave}>
                    <div className="d-flex align-center gap-1 mb-1">
                        {formData.logo ? (
                            <img src={formData.logo} alt="Логотип" className="logo-preview" />
                        ) : (
                            <div className="logo-placeholder"><ImageIcon /></div>
                        )}
                        <div>
                            <label htmlFor="logo-upload" className="btn btn-secondary btn-sm">Загрузить лого</label>
                            <input id="logo-upload" type="file" accept="image/*" onChange={handleFileChange} style={{display: 'none'}} />
                            <p className="field-hint">Рекомендуется квадратное изображение</p>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Название компании / ИП</label>
                        <input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label>Контактное лицо</label>
                        <input type="text" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} required />
                    </div>
                    <div className="form-group">
                        <label>Телефон</label>
                        <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="form-actions" style={{justifyContent: 'space-between'}}>
                        <button type="button" className="btn btn-secondary" onClick={onLogout}>Выйти</button>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? <Loader /> : 'Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="card">
                <h3>Подписка</h3>
                <p>Текущий статус: <strong>{subscriptionStatus.status} {subscriptionStatus.date}</strong></p>
                {/* In a real app, a "Manage Subscription" button would go here */}
            </div>
        </>
    );
};