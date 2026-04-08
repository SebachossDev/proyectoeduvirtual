import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
    LogOut, Backpack,
    BookOpen, Calculator, Users, FileSpreadsheet, Code,
    X, FileText, Video, Link as LinkIcon, Calendar, ArrowLeft, Bot, Send, Sparkles, Database, Layers, ChevronRight, Download
} from 'lucide-react';

export default function StudentDashboard() {
    const navigate = useNavigate();

    // User State
    const [user, setUser] = useState<any>(null);

    // Dynamic Data
    const [courses, setCourses] = useState<any[]>([]);

    // View state
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const selectedCourseRef = useRef<any>(null); // To access within SSE without reconnecting
    const [isBackpackOpen, setIsBackpackOpen] = useState(false);

    // Inside Course View State
    const [viewTab, setViewTab] = useState<'materials' | 'chat'>('materials');
    const [resources, setResources] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');

    // Real-Time Toast State
    const [toast, setToast] = useState<{ resource: any, courseId: string, courseName: string } | null>(null);

    // Utility for dynamic colors
    const ICONS = [Calculator, Users, FileSpreadsheet, Code];
    const COLORS = [
        { bg: 'bg-blue-500', text: 'text-blue-500', gradient: 'from-cyan-400 to-blue-600' },
        { bg: 'bg-fuchsia-500', text: 'text-fuchsia-500', gradient: 'from-purple-500 to-fuchsia-500' },
        { bg: 'bg-emerald-500', text: 'text-emerald-500', gradient: 'from-emerald-400 to-green-600' },
        { bg: 'bg-orange-600', text: 'text-orange-500', gradient: 'from-orange-400 to-red-600' }
    ];

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        fetchCourses(parsed.id);
    }, [navigate]);

    // Keep ref updated
    useEffect(() => {
        selectedCourseRef.current = selectedCourse;
    }, [selectedCourse]);

    // SSE Setup (Real Time Connection)
    useEffect(() => {
        const sse = new EventSource('http://localhost:3000/api/events');

        sse.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'NEW_RESOURCE') {
                const incomingCourseId = data.payload.courseId;
                const incomingResource = data.payload.resource;

                // Fetch course name from local state for the toast
                let cName = 'tu curso';
                setCourses(prev => {
                    const c = prev.find(x => x.id === incomingCourseId);
                    if (c) cName = c.title;
                    return prev;
                });

                // Show Toast for 10 seconds
                setToast({ resource: incomingResource, courseId: incomingCourseId, courseName: cName });
                setTimeout(() => {
                    setToast(null);
                }, 10000);

                // Update real-time feed if viewing that specific course
                const currentSelected = selectedCourseRef.current;
                if (currentSelected && currentSelected.id === incomingCourseId) {
                    setResources(prev => [incomingResource, ...prev]);
                }
            }
        };

        return () => {
            sse.close();
        };
    }, []);

    const fetchCourses = async (studentId: string) => {
        try {
            const res = await fetch(`http://localhost:3000/api/students/${studentId}/courses`);
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            }
        } catch (error) {
            console.error('Error fetching student courses:', error);
        }
    };

    const handleSelectCourse = async (course: any) => {
        setSelectedCourse(course);
        setViewTab('materials'); // Default tab

        // Fetch course resources for the feed
        try {
            const res = await fetch(`http://localhost:3000/api/courses/${course.id}/sessions`);
            if (res.ok) {
                const sessions = await res.json();
                let allResources: any[] = [];
                sessions.forEach((s: any) => {
                    allResources = [...allResources, ...s.resources];
                });
                // Sort by newest first
                allResources.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setResources(allResources);
            }
        } catch (error) {
            console.error('Error fetching course data:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleViewToastMaterial = () => {
        if (!toast) return;
        const targetCourse = courses.find(c => c.id === toast.courseId);
        if (targetCourse) {
            handleSelectCourse(targetCourse);
        }
        setToast(null);
    };

    return (
        <div className="h-screen w-full bg-[#0d0d0f] text-zinc-200 flex font-sans overflow-hidden relative">

            {/* REAL-TIME TOAST NOTIFICATION */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: 50 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-6 right-6 z-50 bg-[#16161a]/90 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-5 shadow-2xl shadow-cyan-500/10 w-96 flex flex-col gap-3"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex gap-3 items-center text-cyan-400">
                                <Sparkles className="w-5 h-5 animate-pulse" />
                                <h4 className="font-bold text-white text-sm">Nuevo Material Publicado</h4>
                            </div>
                            <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-[13px] text-zinc-400 font-light">
                            Tu profesor acaba de subir <span className="text-white font-medium">{toast.resource.title}</span> en el curso de <span className="text-cyan-300">{toast.courseName}</span>.
                        </p>
                        <button
                            onClick={handleViewToastMaterial}
                            className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-xs py-2 px-4 rounded-lg mt-1 w-full transition-colors"
                        >
                            Ver material
                        </button>
                        {/* Auto-closing bar visual */}
                        <div className="h-1 w-full bg-zinc-800 rounded-full mt-1 overflow-hidden">
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 10, ease: "linear" }}
                                className="h-full bg-cyan-500"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Minimalist Sidebar */}
            <div className="w-20 bg-[#161618] border-r border-zinc-800/50 flex flex-col items-center py-6 gap-6 z-20 shrink-0">
                {/* User/Avatar Icon */}
                <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-bold text-white shadow-lg mb-4 text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'E'}
                </div>

                {/* Nav Icons */}
                <button
                    onClick={() => { setSelectedCourse(null); setIsBackpackOpen(false); }}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${!selectedCourse && !isBackpackOpen ? 'bg-teal-500/20 text-teal-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                        }`}
                    title="Mis Cursos"
                >
                    <BookOpen className="w-6 h-6" />
                </button>

                <div className="relative">
                    <button
                        onClick={() => { setIsBackpackOpen(!isBackpackOpen); }}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isBackpackOpen ? 'bg-purple-600/20 text-purple-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                        title="Mochila Virtual"
                    >
                        <Backpack className="w-6 h-6" />
                    </button>
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
                    /* DASHBOARD VIEW */
                    <div className={`p-8 md:p-12 transition-all duration-300 h-full overflow-y-auto ${isBackpackOpen ? 'pr-[350px]' : ''}`}>
                        <header className="mb-14">
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Bienvenido, {user?.name || 'Estudiante'}</h1>
                            <p className="text-zinc-400 font-light">Continúa tu aprendizaje. Aquí están tus cursos matriculados.</p>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-w-7xl">
                            {courses.length === 0 ? (
                                <div className="col-span-full py-12 text-center text-zinc-500 border border-zinc-800 border-dashed rounded-2xl bg-[#141416]">
                                    Aún no estás matriculado en ningún curso.
                                </div>
                            ) : (
                                courses.map((course, index) => {
                                    const cStyle = COLORS[index % COLORS.length];
                                    const IconComponent = ICONS[index % ICONS.length];

                                    return (
                                        <motion.div
                                            key={course.id}
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            onClick={() => handleSelectCourse(course)}
                                            className="bg-[#141416] border border-zinc-800/60 rounded-2xl p-6 cursor-pointer hover:border-zinc-700 transition-all group flex flex-col min-h-[220px]"
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`w-12 h-12 rounded-2xl ${cStyle.bg} flex items-center justify-center text-white shadow-lg`}>
                                                    <IconComponent className="w-6 h-6" />
                                                </div>
                                            </div>

                                            <h3 className="text-lg font-bold text-white mb-1 group-hover:text-white transition-colors leading-tight">{course.title}</h3>
                                            <p className="text-sm text-zinc-400 mb-8 font-light line-clamp-2">{course.description || 'Sin descripción'}</p>

                                            <div className="mt-auto space-y-2">
                                                <div className="flex justify-between text-[11px]">
                                                    <span className="text-zinc-500 font-medium tracking-wide">Progreso General</span>
                                                    <span className={`${cStyle.text} text-xs font-bold`}>{course.progress}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full bg-gradient-to-r ${cStyle.gradient}`}
                                                        style={{ width: `${course.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : (
                    /* COURSE VIEW (TABS: IA CHAT vs MATERIALS) */
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col h-full bg-[#0d0d0f]"
                    >
                        {/* Course Header & Tabs */}
                        <header className="flex flex-col bg-[#0d0d0f] border-b border-zinc-800/50 pt-5">
                            <div className="flex items-center justify-between px-8 pb-4">
                                <div className="flex items-center gap-5">
                                    <button
                                        onClick={() => setSelectedCourse(null)}
                                        className="w-10 h-10 rounded-xl bg-zinc-900/80 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800/50"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-bold text-white leading-tight">{selectedCourse.title}</h2>
                                        <div className="flex items-center gap-2 text-[11px] font-medium text-zinc-400 mt-1">
                                            <span className="flex items-center gap-1.5 text-teal-400"><Sparkles className="w-3 h-3" /> IA Especializada</span>
                                            <span className="text-zinc-600">•</span>
                                            <span className="flex items-center gap-1.5 text-purple-400"><Database className="w-3 h-3" /> Sincronización Real-Time</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex gap-8 px-8 mt-2">
                                <button
                                    onClick={() => setViewTab('materials')}
                                    className={`pb-4 text-sm font-semibold border-b-2 transition-all ${viewTab === 'materials' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4" />
                                        Feed de Contenidos
                                    </div>
                                </button>
                                <button
                                    onClick={() => setViewTab('chat')}
                                    className={`pb-4 text-sm font-semibold border-b-2 transition-all ${viewTab === 'chat' ? 'border-blue-400 text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Bot className="w-4 h-4" />
                                        Chat de Inteligencia Artificial
                                    </div>
                                </button>
                            </div>
                        </header>

                        {/* TAB 1: MATERIALS FEED */}
                        {viewTab === 'materials' && (
                            <div className="flex-1 overflow-y-auto px-8 py-8">
                                <div className="max-w-4xl mx-auto">
                                    <h3 className="text-lg font-bold text-white mb-6">Últimos Materiales Publicados</h3>

                                    {resources.length === 0 ? (
                                        <div className="bg-[#141416] border border-zinc-800/50 rounded-2xl p-10 text-center">
                                            <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                                            <p className="text-zinc-400">El profesor aún no ha publicado documentos en este módulo.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {resources.map((res: any, idx) => (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    key={res.id}
                                                    className="bg-[#141416] border border-zinc-800/80 hover:border-cyan-500/30 rounded-2xl p-5 flex items-center justify-between group transition-all"
                                                >
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[15px] font-bold text-white leading-tight">{res.title}</h4>
                                                            <p className="text-xs text-zinc-500 mt-1">
                                                                Subido el {new Date(res.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} • {res.type}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-400 flex flex-col items-center justify-center transition-colors">
                                                        <Download className="w-5 h-5" />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: AI CHAT */}
                        {viewTab === 'chat' && (
                            <>
                                {/* Informational Banner */}
                                <div className="bg-[#1a1625] border-y border-purple-900/30 px-8 py-4 flex items-start gap-4">
                                    <BookOpen className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-white font-medium text-sm">Esta IA está alimentada exclusivamente por la documentación técnica de esta materia</h4>
                                        <p className="text-[11px] text-purple-300/70 mt-1 font-light">Todas las respuestas se basan en el material cargado por tu docente (RAG activo)</p>
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
                                                ¡Hola! Soy tu asistente de IA especializado en {selectedCourse.title}. Estoy leyendo todo el material que el profesor acaba de subir. ¿En qué módulo te ayudo hoy?
                                            </div>
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
                                                if (e.key === 'Enter') setChatInput('');
                                            }}
                                        />
                                        <button className="absolute right-3 w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 transition-all">
                                            <Send className="w-4 h-4 ml-0.5" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Virtual Backpack Sidebar Drawer */}
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
                            <button onClick={() => setIsBackpackOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <p className="text-[13px] text-zinc-400 mb-6 font-light leading-relaxed">
                                Recursos transversales guardados
                            </p>

                            <div className="space-y-3">
                                {[
                                    { icon: FileText, title: 'Guía de Estudio Avanzado', type: 'Document' },
                                    { icon: Video, title: 'Técnicas de Aprendizaje', type: 'Video' }
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
