import React, { useState } from 'react';
import { api } from './api';
import { User } from './types';
import { Loader } from './components';
import { LogoIcon, EmailIcon, LockIcon } from './icons';

interface AuthScreenProps {
    onLogin: (data: { user: User, token: string }) => void;
}

// --- AUTH SCREEN ---
export const AuthScreen = ({ onLogin }: AuthScreenProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = isLogin ? await api.login(email, password) : await api.register(email, password);
            onLogin(data);
        } catch (err: any) {
            setError(err.message || 'Произошла ошибка');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <LogoIcon size={48} />
                    <h1>{isLogin ? 'Вход в Прораб' : 'Регистрация'}</h1>
                </div>
                <form onSubmit={handleSubmit}>
                    {error && <div className="auth-error">{error}</div>}
                    <div className="form-group form-group-icon">
                        <EmailIcon />
                        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group form-group-icon">
                        <LockIcon />
                        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-large w-100" disabled={loading}>
                        {loading ? <Loader /> : (isLogin ? 'Войти' : 'Создать аккаунт')}
                    </button>
                    <div style={{textAlign: 'center', marginTop: 'var(--space-6)'}}>
                        <button type="button" className="link-button" onClick={() => setIsLogin(!isLogin)}>
                            {isLogin ? 'У меня еще нет аккаунта' : 'Уже есть аккаунт? Войти'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};