import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { 
    LogOut, Backpack,
    BookOpen, Calculator, Users, FileSpreadsheet, Code,
    X, FileText, Video, Link as LinkIcon, Calendar, ArrowLeft, Bot, Send, Sparkles, Database
} from 'lucide-react';

interface Course {
    id: string;
    title: string;
    description: string;
    progress: number;
    bgClass: string;
    textClass: string;
    progressClass: string;
    icon: React.ElementType;
}

const COURSES: Course[] = [
    {
        id: '1',
        title: 'Cálculo Monovariable',
        description: 'Límites, derivadas e integrales',
        progress: 68,
        bgClass: 'bg-blue-500',
        textClass: 'text-blue-500',
        progressClass: 'bg-gradient-to-r from-cyan-400 to-blue-600',
        icon: Calculator
    },
    {
        id: '2',
        title: 'Gestión de Talentos Humanos',
        description: 'Reclutamiento y desarrollo organizacional',
        progress: 45,
        bgClass: 'bg-fuchsia-500',
        textClass: 'text-fuchsia-500',
        progressClass: 'bg-gradient-to-r from-purple-500 to-fuchsia-500',
        icon: Users
    },
    {
        id: '3',
        title: 'Excel II',
        description: 'Funciones avanzadas y análisis de datos',
        progress: 82,
        bgClass: 'bg-emerald-500',
        textClass: 'text-emerald-500',
        progressClass: 'bg-gradient-to-r from-emerald-400 to-green-600',
        icon: FileSpreadsheet
    },
    {
        id: '4',
        title: 'Desarrollo II',
        description: 'Programación orientada a objetos',
        progress: 55,
        bgClass: 'bg-orange-600',
        textClass: 'text-orange-500',
        progressClass: 'bg-gradient-to-r from-orange-400 to-red-600',
        icon: Code
    }
];

export default function StudentDashboard() {
    const navigate = useNavigate();
    
    // View state
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isBackpackOpen, setIsBackpackOpen] = useState(false);
    
    // Chat state
    const [chatInput, setChatInput] = useState('');

    const handleLogout = () => {
        navigate('/login');
    };

    return (
        <div className="h-screen w-full bg-[#0d0d0f] text-zinc-200 flex font-sans overflow-hidden">
            {/* Minimalist Sidebar */}
            <div className="w-20 bg-[#161618] border-r border-zinc-800/50 flex flex-col items-center py-6 gap-6 z-20 shrink-0">
                {/* User/Avatar Icon */}
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg mb-4 text-sm">
                    I
                </div>

                {/* Nav Icons */}
                <button 
                    onClick={() => { setSelectedCourse(null); setIsBackpackOpen(false); }}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                        !selectedCourse && !isBackpackOpen ? 'bg-teal-500/20 text-teal-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                >
                    <BookOpen className="w-6 h-6" />
                </button>

                <div className="relative">
                    <button 
                        onClick={() => { setIsBackpackOpen(!isBackpackOpen); }}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                            isBackpackOpen ? 'bg-purple-600/20 text-purple-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                        }`}
                    >
                        <Backpack className="w-6 h-6" />
                    </button>
                    {/* Active indicatior or border could go here */}
                </div>

                <div className="mt-auto">
                    <button 
                        onClick={handleLogout}
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all font-light"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-6 h-6" strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative h-full overflow-hidden">
                {!selectedCourse ? (
                    /* Dashboard View */
                    <div className={`p-8 md:p-12 transition-all duration-300 h-full overflow-y-auto ${isBackpackOpen ? 'pr-[350px]' : ''}`}>
                        <header className="mb-14">
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Bienvenido de vuelta</h1>
                            <p className="text-zinc-400 font-light">Continúa tu aprendizaje autodidacta con IA especializada</p>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
                            {COURSES.map((course, index) => (
                                <motion.div 
                                    key={course.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    onClick={() => setSelectedCourse(course)}
                                    className="bg-[#141416] border border-zinc-800/60 rounded-2xl p-6 cursor-pointer hover:border-zinc-700 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-12 h-12 rounded-2xl ${course.bgClass} flex items-center justify-center text-white shadow-lg`}>
                                            <course.icon className="w-6 h-6" />
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-white transition-colors">{course.title}</h3>
                                    <p className="text-sm text-zinc-400 mb-8 font-light line-clamp-1">{course.description}</p>
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-zinc-500 font-medium tracking-wide">Progreso</span>
                                            <span className={`${course.textClass} text-xs font-bold`}>{course.progress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${course.progressClass}`} 
                                                style={{ width: `${course.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Chat View for selected course */
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col h-full bg-[#0d0d0f]"
                    >
                        {/* Chat Header */}
                        <header className="flex items-center justify-between px-8 py-5 bg-[#0d0d0f] border-b border-zinc-800/50">
                            <div className="flex items-center gap-5">
                                <button 
                                    onClick={() => setSelectedCourse(null)}
                                    className="w-10 h-10 rounded-xl bg-zinc-900/80 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800/50"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <h2 className="text-lg font-bold text-white leading-tight">{selectedCourse.title}</h2>
                                    <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 mt-1">
                                        <span className="flex items-center gap-1.5 text-teal-400"><Sparkles className="w-3 h-3" /> IA Especializada</span>
                                        <span className="text-zinc-600">•</span>
                                        <span className="flex items-center gap-1.5 text-purple-400"><Database className="w-3 h-3" /> RAG Activo</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                <Bot className="w-5 h-5" />
                            </div>
                        </header>

                        {/* Informational Banner */}
                        <div className="bg-[#1a1625] border-y border-purple-900/30 px-8 py-4 flex items-start gap-4">
                            <BookOpen className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-white font-medium text-sm">Esta IA está alimentada exclusivamente por la documentación técnica de esta materia</h4>
                                <p className="text-[11px] text-purple-300/70 mt-1 font-light">Todas las respuestas se basan en el material cargado por tu docente (RAG - Retrieval Augmented Generation)</p>
                            </div>
                        </div>

                        {/* Chat Messages Area */}
                        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
                            {/* Initial AI Message */}
                            <div className="flex items-start gap-4 max-w-3xl">
                                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 mt-2 shadow-lg shadow-blue-500/20">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="bg-[#141416] border border-zinc-800/80 rounded-2xl rounded-tl-sm p-5 text-zinc-300 text-sm leading-relaxed shadow-sm">
                                        ¡Hola! Soy tu asistente de IA especializado en {selectedCourse.title}. Estoy alimentado exclusivamente con la documentación técnica y materiales de esta materia. ¿En qué puedo ayudarte hoy?
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-medium ml-2 mt-2 inline-block">18:16</span>
                                </div>
                            </div>
                        </div>

                        {/* Chat Input Field */}
                        <div className="px-8 pb-8 pt-4">
                            <div className="max-w-4xl mx-auto relative flex items-center">
                                <input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={`Pregunta algo sobre ${selectedCourse.title}...`}
                                    className="w-full bg-[#18181b] border border-zinc-800/80 rounded-2xl py-4 pl-6 pr-16 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-all font-light"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setChatInput('');
                                        }
                                    }}
                                />
                                <button className="absolute right-3 w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-all">
                                    <Send className="w-4 h-4 ml-0.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Mochila Virtual Right Sidebar Drawer */}
            <AnimatePresence>
                {isBackpackOpen && !selectedCourse && (
                    <motion.div 
                        initial={{ x: 350, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 350, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed right-0 top-0 bottom-0 w-[350px] bg-[#161618] border-l border-zinc-800/50 flex flex-col shadow-2xl z-20"
                    >
                        <header className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-purple-400">
                                    <Backpack className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-white">Mochila Virtual</h3>
                            </div>
                            <button 
                                onClick={() => setIsBackpackOpen(false)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <p className="text-[13px] text-zinc-400 mb-6 font-light leading-relaxed">
                                Recursos transversales disponibles para todas tus materias
                            </p>

                            <div className="space-y-3">
                                {/* Mochila Items */}
                                {[
                                    { icon: FileText, title: 'Guía de Estudio 2026', type: 'Document' },
                                    { icon: Video, title: 'Tutorial: Técnicas de Aprendizaje', type: 'Video' },
                                    { icon: LinkIcon, title: 'Recursos Adicionales', type: 'Link' },
                                    { icon: Calendar, title: 'Calendario Académico', type: 'Document' }
                                ].map((item, i) => (
                                    <div key={i} className="bg-[#1a1a1c] border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-purple-500/30 transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center text-purple-400 shrink-0 group-hover:bg-purple-500/10 transition-all">
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition-colors leading-tight">{item.title}</h4>
                                            <p className="text-[11px] text-zinc-500 mt-1 font-medium">{item.type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
