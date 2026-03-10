import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { LogOut, BookOpen, PlusCircle, CheckCircle } from 'lucide-react';

export default function TeacherDashboard() {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex">
            {/* Sidebar */}
            <div className="w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-10 text-purple-500">
                    <BookOpen className="w-8 h-8" />
                    <h1 className="text-xl font-bold">Portal Docente</h1>
                </div>

                <nav className="flex-1 space-y-2">
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg flex items-center gap-3 font-medium">
                        <BookOpen className="w-5 h-5" />
                        Mis Recursos
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
            <div className="flex-1 p-8">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Centro de Recursos</h2>
                        <p className="text-zinc-400 mt-1">Sube materiales de estudio para los alumnos.</p>
                    </div>

                    <button className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-purple-500/25 transition-all">
                        <PlusCircle className="w-5 h-5" />
                        Subir Material
                    </button>
                </header>

                {/* Recursos Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-purple-500/50 transition-colors group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-semibold bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase">
                                PDF Documento
                            </span>
                        </div>

                        <h3 className="font-semibold text-lg text-white mb-2">
                            Introducción a TypeScript
                        </h3>
                        <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                            Conceptos básicos y tipado estático para mejorar tus aplicaciones React.
                        </p>

                        <div className="flex items-center gap-2 text-xs text-zinc-500 border-t border-zinc-800/50 pt-4 mt-auto">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>Subido hace 2 días</span>
                        </div>
                    </motion.div>

                    {/* Tarjeta fantasma para subir */}
                    <div className="bg-zinc-900/20 border-2 border-zinc-800 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-zinc-500 hover:text-purple-400 hover:border-purple-500/50 transition-colors cursor-pointer min-h-[220px]">
                        <PlusCircle className="w-10 h-10 mb-3" />
                        <span className="font-medium">Añadir nuevo material</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
