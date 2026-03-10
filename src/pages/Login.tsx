import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { User, Lock, GraduationCap } from 'lucide-react';
import styles from './Login.module.css';

export default function Login() {
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        try {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.toUpperCase(), password })
            });

            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || 'Credenciales inválidas');
                return;
            }

            // Guardar sesión
            localStorage.setItem('user', JSON.stringify(data));

            // Redirigir según el rol del backend
            if (data.role === 'ADMIN') {
                navigate('/admin');
            } else if (data.role === 'TEACHER') {
                navigate('/teacher');
            } else {
                navigate('/student');
            }
        } catch (error) {
            setErrorMsg('Error de conexión con el servidor.');
        }
    };

    return (
        <div className={styles.container}>
            {/* Efectos de fondo */}
            <div className={styles.backgroundEffects}>
                <div className={styles.glowTop}></div>
                <div className={styles.glowBottom}></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className={styles.motionCard}
            >
                {/* Card de Login */}
                <div className={styles.loginCard}>
                    {/* Logo/Branding */}
                    <div className={styles.logoContainer}>
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                            className={styles.logoIcon}
                        >
                            <GraduationCap className="w-8 h-8 text-white" />
                        </motion.div>
                        <h1 className={styles.logoText}>
                            Punto Clave IA
                        </h1>
                        <p className={styles.subtitle}>
                            Plataforma de Aprendizaje Autodidacta
                        </p>
                    </div>

                    {/* Formulario */}
                    <form onSubmit={handleLogin} className={styles.form}>
                        {/* Campo Código */}
                        <div>
                            <label htmlFor="code" className={styles.label}>
                                Código
                            </label>
                            <div className={styles.inputWrapper}>
                                <div className={styles.iconWrapper}>
                                    <User className={styles.icon} />
                                </div>
                                <input
                                    id="code"
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Estudiante / Docente"
                                    required
                                    className={styles.input}
                                />
                            </div>
                            <p className={styles.helperText}>
                                Ejemplo: E12345 (Estudiante) o D54321 (Docente)
                            </p>
                        </div>

                        {/* Campo Contraseña */}
                        <div>
                            <label htmlFor="password" className={styles.label}>
                                Contraseña
                            </label>
                            <div className={styles.inputWrapper}>
                                <div className={styles.iconWrapper}>
                                    <Lock className={styles.icon} />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        {/* Mensaje de error (si existe) */}
                        {errorMsg && (
                            <p className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded-lg">
                                {errorMsg}
                            </p>
                        )}

                        {/* Botón de Login */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className={styles.submitButton}
                        >
                            Iniciar Sesión
                        </motion.button>
                    </form>

                    {/* Footer */}
                    <div className={styles.footer}>
                        <p>Instituto Tecnológico Intro © 2026</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
