import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Users, Settings, Database, Plus, X, Shield, BookOpen, GraduationCap } from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        password: '',
        role: 'STUDENT'
    });

    useEffect(() => {
        // En un caso real verificaríamos que haya sesión iniciada
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                await fetchUsers();
                setIsModalOpen(false);
                setFormData({ name: '', code: '', password: '', role: 'STUDENT' });
            } else {
                alert('No se pudo crear el usuario. Posiblemente el código ya existe.');
            }
        } catch (error) {
            console.error('Error al crear usuario', error);
            alert('Error de conexión con el backend.');
        } finally {
            setLoading(false);
        }
    };

    const getRoleIcon = (role: string) => {
        if (role === 'ADMIN') return <Shield className="w-4 h-4 text-red-400" />;
        if (role === 'TEACHER') return <BookOpen className="w-4 h-4 text-purple-400" />;
        return <GraduationCap className="w-4 h-4 text-cyan-400" />;
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex relative">
            {/* Sidebar */}
            <div className="w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-10 text-cyan-400">
                    <Database className="w-8 h-8" />
                    <h1 className="text-xl font-bold">LMS Admin</h1>
                </div>

                <nav className="flex-1 space-y-2">
                    <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg flex items-center gap-3 font-medium cursor-pointer">
                        <Users className="w-5 h-5" />
                        Usuarios
                    </div>
                </nav>

                <button
                    onClick={handleLogout}
                    className="mt-auto p-3 text-red-400 hover:bg-red-400/10 rounded-lg flex items-center gap-3 font-medium transition-colors w-full text-left"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto h-screen">
                <header className="mb-8">
                    <h2 className="text-2xl font-bold text-white">Gestión de Usuarios</h2>
                    <p className="text-zinc-400 mt-1">Administra los accesos de Docentes y Estudiantes.</p>
                </header>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-lg">Lista de Usuarios</h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Usuario
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                                    <th className="pb-3 px-4 font-medium">Nombre</th>
                                    <th className="pb-3 px-4 font-medium">Código</th>
                                    <th className="pb-3 px-4 font-medium">Rol</th>
                                    <th className="pb-3 px-4 font-medium">ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-zinc-500">
                                            Cargando usuarios...
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                                            <td className="py-4 px-4 font-medium text-white">{user.name}</td>
                                            <td className="py-4 px-4 text-zinc-300">
                                                <span className="bg-zinc-800 font-mono text-xs px-2 py-1 rounded-md">{user.code}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    {getRoleIcon(user.role)}
                                                    <span className="text-sm font-medium text-zinc-300">
                                                        {user.role}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-zinc-500 text-xs font-mono truncate max-w-[120px]">
                                                {user.id}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

            {/* Modal para Crear Usuario */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
                                <h3 className="text-lg font-bold text-white">Registrar Nuevo Usuario</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Código de Ingreso</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="Ej. E1001 (Estudiante) o D1001 (Docente)"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">Este código será usado para iniciar sesión.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Rol del Sistema</label>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'STUDENT' })}
                                            className={`flex items-center gap-2 justify-center p-3 rounded-lg border transition-all ${formData.role === 'STUDENT' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                                        >
                                            <GraduationCap className="w-5 h-5" />
                                            Estudiante
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'TEACHER' })}
                                            className={`flex items-center gap-2 justify-center p-3 rounded-lg border transition-all ${formData.role === 'TEACHER' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                                        >
                                            <BookOpen className="w-5 h-5" />
                                            Docente
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-zinc-800 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-500/25"
                                    >
                                        {loading ? 'Creando...' : 'Guardar Usuario'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
