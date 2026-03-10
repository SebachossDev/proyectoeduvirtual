import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { LogOut, GraduationCap, Backpack, Search, PlayCircle, Star, Filter } from 'lucide-react';

export default function StudentDashboard() {
    const navigate = useNavigate();

    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex">
            {/* Sidebar - Navigation */}
            <div className="w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-10 text-cyan-400">
                    <GraduationCap className="w-8 h-8" />
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
                        Estudiante
                    </h1>
                </div>

                <nav className="flex-1 space-y-2">
                    <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg flex items-center gap-3 font-medium">
                        <Search className="w-5 h-5" />
                        Explorar
                    </div>
                    <div className="p-3 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 rounded-lg flex items-center gap-3 font-medium transition-colors cursor-pointer">
                        <Backpack className="w-5 h-5" />
                        Mi Mochila
                    </div>
                </nav>

                {/* User Card */}
                <div className="mt-auto mb-4 p-4 rounded-xl bg-zinc-800/50 flex items-center gap-3 border border-zinc-700/50">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center font-bold">
                        ES
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Johan (Estudiante)</p>
                        <p className="text-xs text-zinc-400">E12345</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors w-full"
                >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 h-screen overflow-y-auto">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Bienvenido de nuevo 👋</h2>
                        <p className="text-zinc-400">Encuentra los materiales para continuar tu aprendizaje.</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Buscar recursos..."
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-sm transition-all text-white placeholder:text-zinc-600"
                            />
                        </div>
                        <button className="p-2.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Content Tabs (Mock) */}
                <div className="flex gap-4 mb-8 border-b border-zinc-800">
                    <button className="pb-3 border-b-2 border-cyan-400 text-cyan-400 font-medium px-2">
                        Recomendados
                    </button>
                    <button className="pb-3 text-zinc-500 font-medium hover:text-zinc-300 px-2 transition-colors">
                        Recientes
                    </button>
                    <button className="pb-3 text-zinc-500 font-medium hover:text-zinc-300 px-2 transition-colors">
                        Vídeos
                    </button>
                </div>

                {/* Resource Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all shadow-xl shadow-black/50"
                    >
                        {/* Thumbnail Mock */}
                        <div className="h-40 bg-zinc-800 relative w-full overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/50 to-blue-900/50"></div>
                            <PlayCircle className="w-12 h-12 text-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 group-hover:text-white transition-all shadow-xl rounded-full" />
                            <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-xs font-medium text-zinc-300">
                                12:45
                            </span>
                        </div>

                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full">
                                    VIDEO
                                </span>
                                <button className="text-zinc-500 hover:text-yellow-400 transition-colors" title="Guardar en Mochila">
                                    <Star className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="font-bold text-lg mb-1 line-clamp-1">Estructuras de Datos I</h3>
                            <p className="text-zinc-400 text-sm mb-4 line-clamp-2">Aprende sobre Arrays, Listas y Árboles con ejemplos prácticos en TypeScript.</p>

                            <div className="flex items-center gap-2 mt-auto">
                                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                                    PT
                                </div>
                                <span className="text-xs text-zinc-500 font-medium">Prof. Torres</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
