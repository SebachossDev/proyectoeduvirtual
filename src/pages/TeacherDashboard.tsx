import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, BookOpen, PlusCircle, CheckCircle, Video, FileText, Link as LinkIcon, X, Trash2, Edit2, Users, GraduationCap, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';

export default function TeacherDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [course, setCourse] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<'CURSO' | 'PARTICIPANTES' | 'CALIFICACIONES'>('CURSO');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Modal State
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState<{ id: string, title: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [resourceForm, setResourceForm] = useState({ title: '', description: '', url: '', type: 'LINK', sessionId: '' });
    const [sessionForm, setSessionForm] = useState({ title: '', description: '', order: 0 });

    // Course Modal State
    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isDeleteCourseModalOpen, setIsDeleteCourseModalOpen] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [courseToDelete, setCourseToDelete] = useState<{ id: string, title: string } | null>(null);
    const [courseForm, setCourseForm] = useState({ title: '', description: '' });

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
            fetchCourses();
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const fetchCourses = async () => {
        try {
            const coursesRes = await fetch('http://localhost:3000/api/courses');
            const coursesData = await coursesRes.json();
            setCourses(coursesData);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const fetchCourseDetails = async (courseId: string) => {
        try {
            const sessionsRes = await fetch(`http://localhost:3000/api/courses/${courseId}/sessions`);
            const sessionsData = await sessionsRes.json();
            setSessions(sessionsData);
            if (sessionsData.length > 0) {
                setSelectedSessionId(prev => prev || sessionsData[0].id);
            }

            const enrollmentsRes = await fetch(`http://localhost:3000/api/courses/${courseId}/participants`);
            setEnrollments(await enrollmentsRes.json());
        } catch (error) {
            console.error('Error fetching course details:', error);
        }
    };

    const selectCourse = (c: any) => {
        setCourse(c);
        setSelectedSessionId(null);
        setActiveTab('CURSO');
        fetchCourseDetails(c.id);
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    // --- CURSOS ---
    const openCreateCourseModal = () => {
        setEditingCourseId(null);
        setCourseForm({ title: '', description: '' });
        setIsCourseModalOpen(true);
    };

    const openEditCourseModal = (c: any) => {
        setEditingCourseId(c.id);
        setCourseForm({ title: c.title, description: c.description || '' });
        setIsCourseModalOpen(true);
    };

    const confirmDeleteCourse = (id: string, title: string) => {
        setCourseToDelete({ id, title });
        setIsDeleteCourseModalOpen(true);
    };

    const handleDeleteCourse = async () => {
        if (!courseToDelete) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3000/api/courses/${courseToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchCourses();
                setIsDeleteCourseModalOpen(false);
                setCourseToDelete(null);
            }
        } catch (error) {
            console.error('Error deleting course', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = editingCourseId ? `http://localhost:3000/api/courses/${editingCourseId}` : 'http://localhost:3000/api/courses';
            const method = editingCourseId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...courseForm, teacherId: user?.id })
            });

            if (res.ok) {
                await fetchCourses();
                setIsCourseModalOpen(false);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Error: ${err.error || 'Revisa los datos'}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- RECURSOS ---
    const openCreateResourceModal = (sessionId?: string) => {
        setEditingId(null);
        setResourceForm({ title: '', description: '', url: '', type: 'LINK', sessionId: sessionId || selectedSessionId || '' });
        setIsResourceModalOpen(true);
    };

    const openEditResourceModal = (resource: any) => {
        setEditingId(resource.id);
        setResourceForm({
            title: resource.title,
            description: resource.description || '',
            url: resource.url,
            type: resource.type,
            sessionId: resource.sessionId
        });
        setIsResourceModalOpen(true);
    };

    const confirmDelete = (id: string, title: string) => {
        setResourceToDelete({ id, title });
        setIsDeleteModalOpen(true);
    };

    const handleDeleteResource = async () => {
        if (!resourceToDelete || !course) return;
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3000/api/resources/${resourceToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchCourseDetails(course.id);
                setIsDeleteModalOpen(false);
                setResourceToDelete(null);
            }
        } catch (error) {
            console.error('Error deleting', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveResource = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!course) return;
        setLoading(true);
        try {
            const url = editingId ? `http://localhost:3000/api/resources/${editingId}` : 'http://localhost:3000/api/resources';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(resourceForm)
            });

            if (res.ok) {
                await fetchCourseDetails(course.id);
                setIsResourceModalOpen(false);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`Error: ${err.error || 'Revisa los datos'}`);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- SESIONES ---
    const handleSaveSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!course) return;
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...sessionForm, courseId: course.id })
            });
            if (res.ok) {
                await fetchCourseDetails(course.id);
                setIsSessionModalOpen(false);
                setSessionForm({ title: '', description: '', order: sessions.length + 1 });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- CALIFICACIONES ---
    const updateGrade = async (enrollmentId: string, grade: string) => {
        if (!course) return;
        try {
            await fetch(`http://localhost:3000/api/enrollments/${enrollmentId}/grade`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grade: grade ? parseFloat(grade) : null })
            });
            fetchCourseDetails(course.id);
        } catch (e) {
            console.error(e);
        }
    };

    const getTypeIcon = (type: string) => {
        if (type === 'VIDEO') return <Video className="w-5 h-5" />;
        if (type === 'PDF') return <FileText className="w-5 h-5" />;
        return <LinkIcon className="w-5 h-5" />;
    };

    const activeSession = sessions.find(s => s.id === selectedSessionId);

    if (!course) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
                {/* Header for Dashboard */}
                <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 text-purple-500">
                                <BookOpen className="w-8 h-8" />
                                <h1 className="text-xl font-bold tracking-wide text-white border-l border-zinc-700 pl-4">
                                    Portal Docente
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm font-medium">
                            {user && (
                                <div className="flex items-center gap-3 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50">
                                    <span className="hidden md:inline text-zinc-300">{user.name}</span>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-inner">
                                        {user.name.substring(0, 2).toUpperCase()}
                                    </div>
                                </div>
                            )}
                            <button onClick={handleLogout} className="text-zinc-400 hover:text-red-500 transition-colors ml-2" title="Cerrar Sesión">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-6xl mx-auto p-8 w-full mt-4">
                    <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-purple-500" />
                            Mis Cursos
                        </h2>
                        <button
                            onClick={openCreateCourseModal}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-purple-500/25 transition-all"
                        >
                            <PlusCircle className="w-5 h-5" />
                            Crear Curso
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(c => (
                            <div key={c.id} className="relative group bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all flex flex-col h-full min-h-[220px]">
                                <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button onClick={(e) => { e.stopPropagation(); openEditCourseModal(c); }} className="p-1.5 bg-zinc-800 hover:bg-purple-500 hover:text-white rounded-md text-zinc-400 transition-colors" title="Editar">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); confirmDeleteCourse(c.id, c.title); }} className="p-1.5 bg-zinc-800 hover:bg-red-500 hover:text-white rounded-md text-zinc-400 transition-colors" title="Eliminar">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => selectCourse(c)}
                                    className="text-left flex flex-col h-full"
                                >
                                    <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 pr-12">{c.title}</h3>
                                    {c.description && <p className="text-zinc-400 text-sm line-clamp-2 mb-4 flex-1">{c.description}</p>}
                                    <div className="mt-auto pt-4 flex items-center text-purple-400 text-sm font-bold tracking-wider uppercase group-hover:translate-x-1 transition-transform">
                                        Entrar al curso <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </button>
                            </div>
                        ))}
                        {courses.length === 0 && (
                            <div className="col-span-full py-12 text-center text-zinc-500 border-2 border-dashed border-zinc-800 rounded-2xl">
                                No tienes cursos asignados actualmente. Comienza creando uno nuevo.
                            </div>
                        )}
                    </div>
                </main>

                {/* Modal: Crear/Editar Curso */}
                <AnimatePresence>
                    {isCourseModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                                <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                    <h3 className="text-lg font-bold text-white">{editingCourseId ? 'Editar Curso' : 'Crear Nuevo Curso'}</h3>
                                    <button onClick={() => setIsCourseModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <form onSubmit={handleSaveCourse} className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Curso</label>
                                        <input type="text" required value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors" placeholder="Ej. Desarrollo Web Avanzado" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción corta (Opcional)</label>
                                        <textarea rows={3} value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors resize-none" placeholder="Descripción breve del contenido..." />
                                    </div>
                                    <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3 mt-6">
                                        <button type="button" onClick={() => setIsCourseModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancelar</button>
                                        <button type="submit" disabled={loading} className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-purple-500/25 transition-all">
                                            {loading ? 'Guardando...' : (editingCourseId ? 'Guardar Cambios' : 'Crear Curso')}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Modal: Confirmación de Borrado de Curso */}
                <AnimatePresence>
                    {isDeleteCourseModalOpen && courseToDelete && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
                                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trash2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">¿Eliminar curso?</h3>
                                <p className="text-zinc-400 mb-6 text-sm">
                                    Estás a punto de eliminar <span className="text-white font-medium">"{courseToDelete.title}"</span>. Esta acción eliminará el curso y todo su contenido asociado (sesiones y recursos). No se puede deshacer.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <button onClick={() => { setIsDeleteCourseModalOpen(false); setCourseToDelete(null); }} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors flex-1" disabled={loading}>
                                        Cancelar
                                    </button>
                                    <button onClick={handleDeleteCourse} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-500/25 flex-1" disabled={loading}>
                                        {loading ? 'Eliminando...' : 'Sí, eliminar'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
            {/* Moodle-style Top Navbar (Dark Theme) */}
            <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-30">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setCourse(null)}
                            className="text-zinc-400 hover:text-white transition-colors bg-zinc-800/80 hover:bg-zinc-700 p-2 rounded-lg flex items-center justify-center -ml-2"
                            title="Volver a Mis Cursos"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180" />
                        </button>
                        <div className="flex items-center gap-3 text-purple-500 ml-2 border-l border-zinc-800 pl-4">
                            <BookOpen className="w-8 h-8 hidden sm:block" />
                            <h1 className="text-xl font-bold tracking-wide text-white">
                                {course?.title || 'Cargando Curso...'}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-medium">
                        {user && (
                            <div className="flex items-center gap-3 bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50">
                                <span className="hidden md:inline text-zinc-300">{user.name}</span>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-inner">
                                    {user.name.substring(0, 2).toUpperCase()}
                                </div>
                            </div>
                        )}
                        <button onClick={handleLogout} className="text-zinc-400 hover:text-red-500 transition-colors ml-2" title="Cerrar Sesión">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="px-6 flex gap-1 pt-2">
                    {[
                        { id: 'CURSO', label: 'Curso' },
                        { id: 'PARTICIPANTES', label: 'Participantes' },
                        { id: 'CALIFICACIONES', label: 'Calificaciones' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab.id
                                ? 'border-purple-500 text-purple-400'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden">

                {/* Course Sidebar (Only visible in CURSO tab) */}
                {activeTab === 'CURSO' && (
                    <div className={`bg-zinc-900 border-r border-zinc-800 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="font-bold text-zinc-400 text-sm tracking-wider uppercase">Índice del Curso</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {sessions.map((session) => (
                                <div key={session.id} className="mb-2">
                                    <button
                                        onClick={() => setSelectedSessionId(session.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium flex items-center justify-between transition-colors ${selectedSessionId === session.id
                                            ? 'bg-purple-500/10 text-purple-400 border-l-4 border-purple-500'
                                            : 'text-zinc-400 hover:bg-zinc-800 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <span className="truncate pr-2">{session.title}</span>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedSessionId === session.id ? 'rotate-90 text-purple-400' : 'text-zinc-600'}`} />
                                    </button>
                                </div>
                            ))}

                            <button
                                onClick={() => setIsSessionModalOpen(true)}
                                className="w-full mt-4 text-left px-3 py-2.5 border-2 border-dashed border-zinc-700 rounded-md text-sm font-medium text-zinc-400 hover:text-purple-400 hover:border-purple-500 hover:bg-purple-500/5 flex items-center justify-center gap-2 transition-colors"
                            >
                                <PlusCircle className="w-4 h-4" />
                                Añadir Sesión o Tema
                            </button>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto bg-zinc-950">
                    {/* View: CURSO */}
                    {activeTab === 'CURSO' && (
                        <div className="max-w-4xl mx-auto p-8">
                            <div className="flex justify-between items-end mb-8 border-b border-zinc-800 pb-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-white">{activeSession?.title || 'Selecciona un tema'}</h2>
                                    {activeSession?.description && (
                                        <p className="text-zinc-400 mt-2">{activeSession.description}</p>
                                    )}
                                </div>
                                {activeSession && (
                                    <button
                                        onClick={() => openCreateResourceModal()}
                                        className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-purple-500/25 transition-all"
                                    >
                                        <PlusCircle className="w-5 h-5" />
                                        Subir Material
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {activeSession?.resources?.length === 0 ? (
                                    <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-800 text-zinc-500 font-medium">
                                        No hay recursos en este tema aún.
                                    </div>
                                ) : (
                                    activeSession?.resources?.map((res: any) => (
                                        <div key={res.id} className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-purple-500/50 transition-colors flex items-start gap-5 cursor-pointer relative">

                                            <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditResourceModal(res)} className="p-1.5 bg-zinc-800 hover:bg-purple-500 hover:text-white rounded-md text-zinc-400 transition-colors" title="Editar">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => confirmDelete(res.id, res.title)} className="p-1.5 bg-zinc-800 hover:bg-red-500 hover:text-white rounded-md text-zinc-400 transition-colors" title="Eliminar">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors shrink-0">
                                                {getTypeIcon(res.type)}
                                            </div>

                                            <div className="flex-1 pr-16 mt-0.5">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-semibold bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase mb-2 inline-block">
                                                        {res.type}
                                                    </span>
                                                </div>
                                                <a href={res.url.startsWith('http') ? res.url : "#"} target={res.url.startsWith('http') ? "_blank" : "_self"} className="text-lg font-semibold text-white hover:text-purple-400 transition-colors line-clamp-1 block mb-1">
                                                    {res.title}
                                                </a>
                                                {res.description && (
                                                    <p className="text-sm text-zinc-400 line-clamp-2">
                                                        {res.description}
                                                    </p>
                                                )}
                                                {res.type !== 'LINK' && (
                                                    <p className="text-xs text-zinc-500 mt-2 font-medium">{res.url}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* View: PARTICIPANTES */}
                    {activeTab === 'PARTICIPANTES' && (
                        <div className="max-w-5xl mx-auto p-8">
                            <h2 className="text-2xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">Participantes matriculados</h2>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-zinc-800/50 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-xs">
                                        <tr>
                                            <th className="px-6 py-5">Nombre y Apellido</th>
                                            <th className="px-6 py-5">Código (ID)</th>
                                            <th className="px-6 py-5">Roles</th>
                                            <th className="px-6 py-5">Último acceso al curso</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {enrollments.map((enr) => (
                                            <tr key={enr.id} className="hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-xs shadow-inner">
                                                        {enr.student.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    {enr.student.name}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-400">{enr.student.code}</td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-full text-xs font-semibold border border-purple-500/20">
                                                        Estudiante
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-500">Nunca</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* View: CALIFICACIONES */}
                    {activeTab === 'CALIFICACIONES' && (
                        <div className="max-w-5xl mx-auto p-8">
                            <h2 className="text-2xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">Reporte de Calificador</h2>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-lg overflow-hidden overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-max">
                                    <thead className="bg-zinc-800/50 border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider text-xs">
                                        <tr>
                                            <th className="px-6 py-5">Estudiante</th>
                                            <th className="px-6 py-5">Código</th>
                                            <th className="px-6 py-5 text-right w-48">Calificación (0-100)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {enrollments.map((enr) => (
                                            <tr key={enr.id} className="hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
                                                        {enr.student.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    {enr.student.name}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-400">{enr.student.code}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <input
                                                        type="number"
                                                        min="0" max="100" step="0.1"
                                                        defaultValue={enr.grade}
                                                        onBlur={(e) => updateGrade(enr.id, e.target.value)}
                                                        className="w-24 bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-right focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
                                                        placeholder="-"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-zinc-500 mt-4 flex items-center gap-2">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Los cambios en las calificaciones se guardan automáticamente al quitar el foco de la celda.
                            </p>
                        </div>
                    )}
                </main>
            </div>

            {/* Modal: Crear Sesión */}
            <AnimatePresence>
                {isSessionModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                            <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                <h3 className="text-lg font-bold text-white">Añadir nueva sección</h3>
                                <button onClick={() => setIsSessionModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSaveSession} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre de la sección</label>
                                    <input type="text" required value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors" placeholder="Ej. Semana 2" />
                                </div>
                                <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setIsSessionModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancelar</button>
                                    <button type="submit" disabled={loading} className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-purple-500/25 transition-all">Añadir</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Crear/Editar Recurso */}
            <AnimatePresence>
                {isResourceModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                            <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                <h3 className="text-lg font-bold text-white">{editingId ? 'Editar Material' : 'Subir Nuevo Material'}</h3>
                                <button onClick={() => setIsResourceModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSaveResource} className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Título del Material</label>
                                    <input type="text" required value={resourceForm.title} onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors" placeholder="Ej. Guía de Programación" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-1">Descripción corta (Opcional)</label>
                                    <textarea rows={2} value={resourceForm.description} onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors resize-none" placeholder="Descripción breve del contenido..." />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Tipo</label>
                                        <select value={resourceForm.type} onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors">
                                            <option value="LINK">Enlace URL</option>
                                            <option value="PDF">Documento PDF</option>
                                            <option value="VIDEO">Archivo de Video</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Sección Destino</label>
                                        <select value={resourceForm.sessionId} onChange={(e) => setResourceForm({ ...resourceForm, sessionId: e.target.value })} required className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors">
                                            <option value="" disabled>Seleccione...</option>
                                            {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {resourceForm.type === 'LINK' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Enlace (URL)</label>
                                        <input type="url" required value={resourceForm.url} onChange={(e) => setResourceForm({ ...resourceForm, url: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors" placeholder="https://ejemplo.com/recurso" />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-400 mb-1">Cargar Archivo</label>
                                        <div className="relative border-2 border-dashed border-zinc-700/80 rounded-lg p-6 flex flex-col items-center justify-center bg-zinc-800/30 hover:bg-zinc-800/50 hover:border-purple-500/50 transition-all cursor-pointer min-h-[140px] group">
                                            {resourceForm.url && !resourceForm.url.startsWith('http') ? (
                                                <div className="flex flex-col items-center justify-center z-10 w-full">
                                                    <FileText className="w-10 h-10 mb-3 text-purple-400" />
                                                    <span className="font-medium text-white mb-3 text-center break-all px-4">{resourceForm.url}</span>
                                                    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setResourceForm({ ...resourceForm, url: '' }); }} className="flex items-center gap-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors z-20">
                                                        <Trash2 className="w-4 h-4" /> Eliminar Archivo
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <input type="file" accept={resourceForm.type === 'PDF' ? '.pdf' : 'video/*'} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[0]" onChange={(e) => { const f = e.target.files?.[0]; if (f) setResourceForm({ ...resourceForm, url: f.name }); }} />
                                                    <div className="flex flex-col items-center justify-center text-center">
                                                        <PlusCircle className="w-8 h-8 mb-2 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                                                        <span className="font-medium text-white mb-1">Cargar archivo de tu equipo</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 mt-6 flex justify-end gap-3 border-t border-zinc-800">
                                    <button type="button" onClick={() => setIsResourceModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancelar</button>
                                    <button type="submit" disabled={loading} className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-purple-500/25 transition-all">
                                        {loading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Publicar Material')}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Confirmación de Borrado */}
            <AnimatePresence>
                {isDeleteModalOpen && resourceToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 text-center">
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">¿Eliminar material?</h3>
                            <p className="text-zinc-400 mb-6 text-sm">
                                Estás a punto de eliminar <span className="text-white font-medium">"{resourceToDelete.title}"</span>. Esta acción no se puede deshacer y los alumnos perderán el acceso a este recurso.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={() => { setIsDeleteModalOpen(false); setResourceToDelete(null); }} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors flex-1" disabled={loading}>
                                    Cancelar
                                </button>
                                <button onClick={handleDeleteResource} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-500/25 flex-1" disabled={loading}>
                                    {loading ? 'Eliminando...' : 'Sí, eliminar'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
