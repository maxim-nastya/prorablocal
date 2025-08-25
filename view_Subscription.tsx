import React, { useState } from 'react';
import { User } from './types';
import { Loader } from './components';
import { CheckIcon, CrownIcon, LogoutIcon } from './icons';

interface SubscriptionViewProps {
    user: User;
    onActivate: () => Promise<void>;
    onLogout: () => void;
}

export const SubscriptionView = ({ user, onActivate, onLogout }: SubscriptionViewProps) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleActivateClick = async () => {
        setIsLoading(true);
        await onActivate();
        // isLoading will remain true as the app reloads into the main view
    };
    
    const isTrialEnded = user.trialEndsAt && new Date(user.trialEndsAt) < new Date();
    const isSubscriptionEnded = user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) < new Date();
    
    const title = isTrialEnded && !isSubscriptionEnded ? "Ваш пробный период закончился" : "Ваша подписка истекла";
    const subtitle = "Чтобы продолжить управлять проектами, пожалуйста, активируйте подписку.";

    return (
        <>
            <header>
                <div className="header-content" style={{justifyContent: 'flex-end'}}>
                     <button className="settings-btn" onClick={onLogout} aria-label="Выход"><LogoutIcon /></button>
                </div>
            </header>
            <main className="app-container">
                <div className="subscription-container">
                    <CrownIcon />
                    <h2>{title}</h2>
                    <p>{subtitle}</p>
                    
                    <div className="pricing-cards">
                        <div className="pricing-card" onClick={handleActivateClick}>
                            <h3>1 месяц</h3>
                            <div className="pricing-price">1 500 ₽</div>
                            <p>Полный доступ ко всем функциям.</p>
                             <button className="btn btn-primary w-100" disabled={isLoading}>
                                {isLoading ? <Loader /> : 'Активировать'}
                            </button>
                        </div>
                    </div>

                    <ul className="features-list">
                        <li className="feature-item"><CheckIcon /> <span>Неограниченное количество проектов и смет</span></li>
                        <li className="feature-item"><CheckIcon /> <span>Учет финансов и фотоотчеты</span></li>
                        <li className="feature-item"><CheckIcon /> <span>Клиентский портал для согласования</span></li>
                        <li className="feature-item"><CheckIcon /> <span>Генерация актов с помощью ИИ</span></li>
                    </ul>
                </div>
            </main>
        </>
    );
};