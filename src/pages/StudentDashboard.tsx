import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
    LogOut, Backpack, User,
    BookOpen, Calculator, Users, FileSpreadsheet, Code,
    X, FileText, Video, Link as LinkIcon, Calendar, ArrowLeft, Bot, Send, Sparkles, Database, Layers, ChevronRight, Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
    const [backpackItems, setBackpackItems] = useState<any[]>([]);
    const [backpackFilter, setBackpackFilter] = useState<'ALL' | 'DOCUMENT' | 'AI_INSIGHT' | 'NOTE'>('ALL');
    const [backpackSearch, setBackpackSearch] = useState('');
    const [noteDraft, setNoteDraft] = useState('');
    const [isWritingNote, setIsWritingNote] = useState(false);
    const [viewingItem, setViewingItem] = useState<any>(null);

    // Inside Course View State
    const [viewTab, setViewTab] = useState<'materials' | 'chat'>('materials');
    const [resources, setResources] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages, isChatLoading]);

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
        setChatMessages([{
            role: 'assistant',
            content: `¡Hola! Soy el Experto enfocado en ${course.title}. Monitoreo la documentación técnica que el docente sube aquí. ¿Qué dudas tienes de este material?`
        }]);

        // Registrar acceso
        if (user) {
            fetch(`http://localhost:3000/api/courses/${course.id}/access/${user.id}`, { method: 'PUT' })
                .catch(err => console.error('Error registrando acceso', err));
        }

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

    const fetchBackpack = async () => {
        if (!user) return;
        try {
            const res = await fetch(`http://localhost:3000/api/backpack/${user.id}?type=${backpackFilter}`);
            if (res.ok) {
                const data = await res.json();
                setBackpackItems(data);
            }
        } catch (error) {
            console.error('Error fetching backpack', error);
        }
    };

    useEffect(() => {
        if (isBackpackOpen) {
            fetchBackpack();
        }
    }, [isBackpackOpen, backpackFilter]);

    const handleSaveToBackpack = async (type: string, title: string, content?: string, resourceId?: string) => {
        if (!user) return;
        try {
            const body = {
                studentId: user.id,
                type,
                title,
                content,
                courseId: selectedCourse?.id,
                resourceId
            };
            const res = await fetch('http://localhost:3000/api/backpack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                if (isBackpackOpen) fetchBackpack();
                alert('¡Guardado en tu Mochila Virtual!');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveNote = () => {
        if (!noteDraft.trim()) return;
        handleSaveToBackpack('NOTE', noteDraft.substring(0, 30) + '...', noteDraft);
        setNoteDraft('');
        setIsWritingNote(false);
    };

    const handleDeleteBackpackItem = async (itemId: string) => {
        try {
            const res = await fetch(`http://localhost:3000/api/backpack/${itemId}`, { method: 'DELETE' });
            if (res.ok) fetchBackpack();
        } catch (error) {
            console.error(error);
        }
    };

    const forceDownload = async (e: React.MouseEvent, url: string, filename: string) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename || 'descarga';
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Error downloading file:', error);
            window.open(url, '_blank');
        }
    };

    const handleSendChatMessage = async () => {
        if (!chatInput.trim() || !user || !selectedCourse) return;

        const originalText = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', content: originalText }]);
        setChatInput('');
        setIsChatLoading(true);

        try {
            const res = await fetch('http://localhost:3000/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    studentId: user.id, 
                    courseId: selectedCourse.id, 
                    query: originalText 
                })
            });
            const data = await res.json();
            
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response || data.error || 'Error procesando respuesta aislada.'
            }]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsChatLoading(false);
        }
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
                                                    onClick={() => setViewingItem({
                                                        id: res.id,
                                                        type: 'DOCUMENT',
                                                        title: res.title,
                                                        savedAt: res.createdAt,
                                                        course: selectedCourse,
                                                        content: null,
                                                        resource: res
                                                    })}
                                                    className="bg-[#141416] border border-zinc-800/80 hover:border-cyan-500/30 rounded-2xl p-5 flex items-center justify-between group transition-all cursor-pointer shadow-sm"
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
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleSaveToBackpack('DOCUMENT', res.title, undefined, res.id); }}
                                                            className="w-10 h-10 rounded-xl bg-zinc-800/80 hover:bg-purple-500/20 text-zinc-400 hover:text-purple-400 flex items-center justify-center transition-colors shadow-sm"
                                                            title="Guardar en Mochila"
                                                        >
                                                            <Backpack className="w-5 h-5" />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => forceDownload(e, res.url, res.title)}
                                                            className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-400 flex items-center justify-center transition-colors"
                                                            title="Descargar material"
                                                        >
                                                            <Download className="w-5 h-5" />
                                                        </button>
                                                    </div>
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
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-white font-medium text-sm">Estás hablando con el Experto de {selectedCourse?.title}</h4>
                                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] rounded border border-green-500/30 uppercase mt-0.5">Aislamiento RAG Mantenido</span>
                                        </div>
                                        <p className="text-[11px] text-purple-300/70 mt-1 font-light">Todas las respuestas se basan estrictamente en la base de datos de documentos cargada para esta asignatura.</p>
                                    </div>
                                </div>

                                {/* Chat Messages Area */}
                                <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
                                    {chatMessages.map((msg, idx) => (
                                        <div key={idx} className={`flex items-start gap-4 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 mt-2 shadow-lg ${msg.role === 'user' ? 'bg-purple-600 shadow-purple-500/20' : 'bg-blue-500 shadow-blue-500/20'}`}>
                                                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                            </div>
                                            <div className={`group relative ${msg.role === 'user' ? 'pl-14' : 'pr-14'}`}>
                                                <div className={`border rounded-2xl p-5 text-sm leading-relaxed shadow-sm
                                                    ${msg.role === 'user' ? 'bg-purple-600/10 border-purple-500/20 text-purple-100 rounded-tr-sm whitespace-pre-wrap' : 'bg-[#141416] border-zinc-800/80 text-zinc-300 rounded-tl-sm'}
                                                `} style={{ overflowWrap: 'anywhere' }}>
                                                    {msg.role === 'user' ? (
                                                        msg.content
                                                    ) : (
                                                        <div className="react-markdown-container">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkMath]}
                                                                rehypePlugins={[rehypeKatex]}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                </div>
                                                {msg.role === 'assistant' && (
                                                    <button 
                                                        onClick={() => handleSaveToBackpack('AI_INSIGHT', `Respuesta IA en ${selectedCourse.title}`, msg.content)}
                                                        className="absolute right-0 top-4 opacity-0 group-hover:opacity-100 p-2 bg-[#1a1a1c] border border-purple-500/30 rounded-xl text-purple-400 hover:bg-purple-500/20 transition-all shadow-md"
                                                        title="Guardar Insight"
                                                    >
                                                        <Backpack className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {isChatLoading && (
                                        <div className="flex items-start gap-4 max-w-3xl">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/50 flex items-center justify-center text-white/50 shrink-0 mt-2 animate-pulse">
                                                <Bot className="w-5 h-5" />
                                            </div>
                                            <div className="bg-[#141416] border border-zinc-800/80 rounded-2xl rounded-tl-sm p-5 flex gap-2 w-24 items-center">
                                                <div className="w-2 h-2 rounded-full bg-blue-500/60 animate-bounce"></div>
                                                <div className="w-2 h-2 rounded-full bg-blue-500/60 animate-bounce" style={{ animationDelay: '0.2s'}}></div>
                                                <div className="w-2 h-2 rounded-full bg-blue-500/60 animate-bounce" style={{ animationDelay: '0.4s'}}></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
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
                                                if (e.key === 'Enter') handleSendChatMessage();
                                            }}
                                        />
                                        <button 
                                            onClick={handleSendChatMessage}
                                            disabled={isChatLoading || !chatInput.trim()}
                                            className="absolute right-3 w-10 h-10 rounded-xl bg-purple-600 disabled:opacity-50 hover:bg-purple-500 flex items-center justify-center text-white transition-all shadow-md"
                                        >
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
                {isBackpackOpen && (
                    <motion.div
                        initial={{ x: 350, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 350, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed right-0 top-0 bottom-0 w-[420px] bg-[#161618] border-l border-zinc-800/50 flex flex-col shadow-2xl z-20"
                    >
                        <header className="p-6 border-b border-zinc-800/50">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="text-purple-400">
                                        <Backpack className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-white text-lg">Mochila Virtual</h3>
                                </div>
                                <button onClick={() => setIsBackpackOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Global Search */}
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    placeholder="Buscar en tu mochila..."
                                    value={backpackSearch}
                                    onChange={(e) => setBackpackSearch(e.target.value)}
                                    className="w-full bg-[#1a1a1c] border border-zinc-800 rounded-xl py-2.5 pl-4 pr-10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition-all"
                                />
                            </div>

                            {/* Filter Chips */}
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {['ALL', 'DOCUMENT', 'AI_INSIGHT', 'NOTE'].map((filterType) => (
                                    <button
                                        key={filterType}
                                        onClick={() => setBackpackFilter(filterType as any)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${backpackFilter === filterType ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-[#1a1a1c] text-zinc-500 border border-zinc-800 hover:text-zinc-300'}`}
                                    >
                                        {filterType === 'ALL' ? 'Todos' : filterType === 'DOCUMENT' ? '📚 Docs' : filterType === 'AI_INSIGHT' ? '🧠 Insights IA' : '📝 Notas'}
                                    </button>
                                ))}
                            </div>
                        </header>

                        <div className="p-6 flex-1 overflow-y-auto bg-[#0d0d0f]/50">
                            {/* Create Note Inline */}
                            <div className="mb-6">
                                {isWritingNote ? (
                                    <div className="bg-[#1a1a1c] border border-purple-500/30 rounded-xl p-3 shadow-lg">
                                        <textarea
                                            value={noteDraft}
                                            onChange={(e) => setNoteDraft(e.target.value)}
                                            placeholder="Escribe tu apunte aquí (Markdown soportado)..."
                                            className="w-full bg-transparent text-sm text-zinc-300 focus:outline-none resize-none h-24 placeholder:text-zinc-600 mb-2"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => { setIsWritingNote(false); setNoteDraft(''); }} className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-white transition-colors">Cancelar</button>
                                            <button onClick={handleSaveNote} className="px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors">Guardar Nota</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsWritingNote(true)} className="w-full border border-dashed border-zinc-800 hover:border-purple-500/50 rounded-xl p-3 flex items-center justify-center gap-2 text-zinc-500 hover:text-purple-400 text-sm font-medium transition-all">
                                        <Sparkles className="w-4 h-4" /> Nueva Nota Personal
                                    </button>
                                )}
                            </div>

                            {/* Feed de Mochila */}
                            <div className="space-y-3">
                                {backpackItems.length === 0 ? (
                                    <p className="text-center text-zinc-600 text-sm mt-10">Mochila vacía. Guarda apuntes, insights o documentos aquí.</p>
                                ) : (
                                    backpackItems.filter(i => (i.title || '').toLowerCase().includes(backpackSearch.toLowerCase()) || (i.content || '').toLowerCase().includes(backpackSearch.toLowerCase())).map((item) => (
                                        <div key={item.id} onClick={() => setViewingItem(item)} className="bg-[#1a1a1c] border border-zinc-800/80 rounded-2xl p-4 cursor-pointer hover:border-purple-500/30 transition-all group relative">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center text-purple-400 shrink-0 group-hover:bg-purple-500/10 transition-all">
                                                    {item.type === 'DOCUMENT' ? <FileText className="w-5 h-5"/> : item.type === 'AI_INSIGHT' ? <Bot className="w-5 h-5"/> : <BookOpen className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-6">
                                                    <h4 className="text-[13px] font-semibold text-zinc-200 group-hover:text-white transition-colors leading-tight truncate">{item.title}</h4>
                                                    {item.content && <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">{item.content}</p>}
                                                    <p className="text-[10px] text-purple-400/60 mt-2 font-medium">{new Date(item.savedAt).toLocaleDateString('es-ES')} {item.course ? `• ${item.course.title}` : ''}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteBackpackItem(item.id); }}
                                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-all"
                                                title="Eliminar de la mochila"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Viewing Item Modal */}
            <AnimatePresence>
                {viewingItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:absolute print:inset-0 print:p-0 print:bg-transparent print:backdrop-blur-none print:items-start"
                        onClick={() => setViewingItem(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#161618] border border-zinc-800/80 rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] print:max-w-none print:w-full print:shadow-none print:border-none print:rounded-none print:max-h-none print:overflow-visible print:p-0 print:block"
                        >
                          <div id="pdf-content" className="flex flex-col flex-1 overflow-hidden print:block print:overflow-visible" style={{ backgroundColor: '#161618', color: '#e2e8f0', padding: '10px' }}>
                            <div className="flex justify-between items-start mb-6 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                        {viewingItem.type === 'DOCUMENT' ? <FileText className="w-6 h-6"/> : viewingItem.type === 'AI_INSIGHT' ? <Bot className="w-6 h-6"/> : <BookOpen className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white leading-tight">{viewingItem.title}</h2>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            {new Date(viewingItem.savedAt).toLocaleString('es-ES')} {viewingItem.course ? `• ${viewingItem.course.title}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setViewingItem(null)} className="no-print text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar print:overflow-visible print:pr-0 print:h-auto print:block">
                                                {viewingItem.content && (
                                                    <div className="text-zinc-300 text-[15px] leading-relaxed mb-4" style={{ overflowWrap: 'anywhere' }}>
                                                        <div className="react-markdown-container">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkMath]}
                                                                rehypePlugins={[rehypeKatex]}
                                                            >
                                                                {viewingItem.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {viewingItem.resource?.url && (
                                                    <div className="w-full h-[400px] mt-4 border border-zinc-800/50 rounded-xl overflow-hidden bg-zinc-900/50 relative group">
                                                        {viewingItem.resource.type?.toUpperCase() === 'VIDEO' || viewingItem.resource.url.includes('mp4') ? (
                                                            <video src={viewingItem.resource.url} controls className="w-full h-full object-contain" />
                                                        ) : (
                                                            <iframe src={viewingItem.resource.url} className="w-full h-full border-none bg-white/5" title={viewingItem.title} />
                                                        )}
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-xs px-3 py-1.5 rounded-lg text-zinc-300 pointer-events-none backdrop-blur-md">Vista Previa</div>
                                                    </div>
                                                )}

                                                {!viewingItem.content && !viewingItem.resource?.url && (
                                                    <div className="py-6 text-center text-zinc-500 italic">
                                                        Este elemento no tiene contenido detallado para visualizar.
                                                    </div>
                                                )}
                                            </div>

                                            {viewingItem.content && !viewingItem.resource?.url && (
                                                <div className="mt-6 pt-4 border-t border-zinc-800/50 shrink-0 flex gap-3 no-print">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Capturar el HTML renderizado del contenedor markdown
                                                            const markdownEl = document.querySelector('#pdf-content .react-markdown-container');
                                                            if (!markdownEl) return;
                                                            const renderedHtml = markdownEl.innerHTML;

                                                            // Abrir ventana nueva limpia con el contenido
                                                            const printWin = window.open('', '_blank', 'width=800,height=600');
                                                            if (!printWin) { alert('Permite las ventanas emergentes para descargar el PDF.'); return; }

                                                            printWin.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${viewingItem.title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #161618; color: #e2e8f0; padding: 40px; line-height: 1.7;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .header { border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { font-size: 22px; color: #c084fc; margin-bottom: 4px; }
        .header p { font-size: 13px; color: #a1a1aa; }
        p { margin-bottom: 0.75rem; }
        ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        li { margin-bottom: 0.25rem; }
        h1, h2, h3, h4 { font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #fff; }
        h1 { font-size: 1.5rem; } h2 { font-size: 1.3rem; } h3 { font-size: 1.1rem; }
        code { background: rgba(255,255,255,0.1); padding: 0.125rem 0.3rem; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
        pre { background: rgba(0,0,0,0.4); padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 0.75rem; border: 1px solid rgba(255,255,255,0.1); }
        pre code { background: transparent; padding: 0; }
        strong { font-weight: bold; color: #f1f5f9; }
        em { font-style: italic; color: #cbd5e1; }
        blockquote { border-left: 3px solid #7c3aed; padding-left: 1rem; margin: 1rem 0; color: #a1a1aa; }
        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
        th, td { border: 1px solid #3f3f46; padding: 8px 12px; text-align: left; }
        th { background: rgba(124, 58, 237, 0.2); color: #c084fc; }
        .katex { font-size: 1.1em; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #3f3f46; text-align: center; font-size: 11px; color: #71717a; }
        @media print {
            body { background: #161618 !important; }
            @page { margin: 1.5cm; }
        }
        .print-btn { display: block; margin: 20px auto; padding: 12px 32px; background: #7c3aed; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
        .print-btn:hover { background: #6d28d9; }
        @media print { .print-btn { display: none !important; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${viewingItem.title}</h1>
        <p>${new Date(viewingItem.savedAt).toLocaleString('es-ES')}${viewingItem.course ? ' • ' + viewingItem.course.title : ''}</p>
    </div>
    <div class="content">${renderedHtml}</div>
    <div class="footer">Generado desde EduVirtual — Plataforma de AI Educativa</div>
    <button class="print-btn" onclick="window.print()">📄 Guardar como PDF</button>
</body>
</html>`);
                                                            printWin.document.close();
                                                        }}
                                                        className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 text-sm"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Descargar Respuesta como PDF (.pdf)
                                                    </button>
                                                </div>
                                            )}
                          </div>

                                            {viewingItem.resource?.url && (
                                                <div className="mt-6 pt-4 border-t border-zinc-800/50 shrink-0 flex gap-3 no-print">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleSaveToBackpack('DOCUMENT', viewingItem.title, undefined, viewingItem.resource.id); }}
                                                        className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                                                    >
                                                        <Backpack className="w-4 h-4 text-purple-400" />
                                                        Mochila
                                                    </button>
                                                    <a 
                                                        href={viewingItem.resource.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex-1 py-2.5 px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                                                    >
                                                        <LinkIcon className="w-4 h-4" />
                                                        Ver Completo
                                                    </a>
                                                    <button 
                                                        onClick={(e) => forceDownload(e, viewingItem.resource.url, viewingItem.title)}
                                                        className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 text-sm"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Descargar
                                                    </button>
                                                </div>
                                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
