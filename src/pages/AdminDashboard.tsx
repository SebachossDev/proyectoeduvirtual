import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Users, Database, Plus, X, Shield, BookOpen, GraduationCap, Edit2, Trash2, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<any[]>([]);
    
    // Modals state
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [userToDelete, setUserToDelete] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        password: '',
        role: 'STUDENT'
    });

    useEffect(() => {
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

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ name: '', code: '', password: '', role: 'STUDENT' });
        setIsFormModalOpen(true);
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            code: user.code,
            password: '', // Leave empty to not change it unless typed
            role: user.role
        });
        setIsFormModalOpen(true);
    };

    const confirmDelete = (user: any) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const url = editingUser 
            ? `http://localhost:3000/api/users/${editingUser.id}` 
            : 'http://localhost:3000/api/users';
            
        const method = editingUser ? 'PUT' : 'POST';

        // Apply trim to avoid accidental hidden spaces
        const payload = {
            ...formData,
            code: formData.code.trim(),
            password: formData.password.trim()
        };

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await fetchUsers();
                setIsFormModalOpen(false);
                setFormData({ name: '', code: '', password: '', role: 'STUDENT' });
            } else {
                alert('Hubo un problema al guardar. Posiblemente el código ya existe.');
            }
        } catch (error) {
            console.error('Error al guardar usuario', error);
            alert('Error de conexión con el backend.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3000/api/users/${userToDelete.id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await fetchUsers();
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
            } else {
                alert('No se pudo eliminar el usuario.');
            }
        } catch (error) {
            alert('Error de conexión con el backend al intentar eliminar.');
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
                    <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg flex items-center gap-3 font-medium cursor-pointer border border-cyan-500/20">
                        <Users className="w-5 h-5" />
                        Usuarios
                    </div>
                </nav>

                <button
                    onClick={handleLogout}
                    className="mt-auto p-3 text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-3 font-medium transition-colors w-full text-left"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 overflow-y-auto h-screen">
                <header className="mb-8">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Gestión de Usuarios</h2>
                    <p className="text-zinc-400 mt-1">Administra los accesos de Docentes y Estudiantes.</p>
                </header>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-lg">Lista de Usuarios</h3>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-cyan-500/20"
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
                                    <th className="pb-3 px-4 font-medium text-right">Acciones</th>
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
                                        <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors group">
                                            <td className="py-4 px-4 font-medium text-white">{user.name}</td>
                                            <td className="py-4 px-4 text-zinc-300">
                                                <span className="bg-zinc-800 font-mono text-xs px-2.5 py-1 rounded-md border border-zinc-700">{user.code}</span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    {getRoleIcon(user.role)}
                                                    <span className="text-sm font-medium text-zinc-300">
                                                        {user.role}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => openEditModal(user)}
                                                        className="p-2 bg-zinc-800 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => confirmDelete(user)}
                                                        className="p-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

            {/* form modal */}
            <AnimatePresence>
                {isFormModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
                                <h3 className="text-lg font-bold text-white">
                                    {editingUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
                                </h3>
                                <button
                                    onClick={() => setIsFormModalOpen(false)}
                                    className="text-zinc-500 hover:text-white transition-colors p-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveUser} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Código de Ingreso</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                                        placeholder="Ej. E1001 o D1001"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                                        Contraseña {editingUser && <span className="text-xs text-amber-500 ml-2">(Dejar en blanco para no cambiar)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                        placeholder={editingUser ? "Escribe nueva contraseña..." : "••••••••"}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Rol del Sistema</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'STUDENT' })}
                                            className={`flex items-center gap-2 justify-center p-3 rounded-lg border transition-all ${formData.role === 'STUDENT' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-sm shadow-cyan-500/10' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
                                        >
                                            <GraduationCap className="w-5 h-5" />
                                            Estudiante
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role: 'TEACHER' })}
                                            className={`flex items-center gap-2 justify-center p-3 rounded-lg border transition-all ${formData.role === 'TEACHER' ? 'bg-purple-500/10 border-purple-500 text-purple-400 shadow-sm shadow-purple-500/10' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'}`}
                                        >
                                            <BookOpen className="w-5 h-5" />
                                            Docente
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormModalOpen(false)}
                                        className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 rounded-lg border border-transparent"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center min-w-[120px]"
                                    >
                                        {loading ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && userToDelete && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">¿Eliminar Usuario?</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                Estás a punto de eliminar a <span className="text-white font-medium">{userToDelete.name}</span>. Esta acción no se puede deshacer.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2.5 rounded-lg font-bold text-white bg-red-500 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                                >
                                    {loading ? 'Borrando...' : 'Sí, eliminar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
