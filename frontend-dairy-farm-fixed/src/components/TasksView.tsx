import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Calendar,
  Clock,
  User,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Heart,
  Droplets,
  Wheat,
  Tag,
  LayoutGrid,
  List,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { taskService, animalService } from '../services';
import { Task, Animal } from '../types';
import { useAuth } from '../context/AuthContext';

export const TasksView: React.FC = () => {
  const { farmId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  // View toggle: List view or Calendar view (Section 13)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filters per Section 13: Assigned to, category, priority, status
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New task modal (Section 13: title, description, category, animal ID (optional), due date, priority, assign to)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'Vaccination' as
      | 'Vaccination'
      | 'Heat check'
      | 'Pregnancy Diagnosis (PD)'
      | 'Hoof trimming'
      | 'Dry-off'
      | 'General',
    animalId: '',
    dueDate: '',
    priority: 'High' as 'High' | 'Medium' | 'Low',
    assignedTo: 'Dr. Imran Qureshi',
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (farmId != null) loadData();
  }, [farmId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        taskService.list(farmId as number),
        animalService.list({ pageSize: 100 }),
      ]);
      setTasks(tRes.data);
      setAnimals(aRes.data);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setErrorMessage(err.message || 'Failed to load tasks from the backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (taskId: string, currentStatus: Task['status']) => {
    const nextStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
    try {
      await taskService.updateStatus();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)));
      showToast(nextStatus === 'Completed' ? 'Task marked as completed' : 'Task reopened');
    } catch (err: any) {
      setErrorMessage(err.message || 'Updating task status is not supported by the backend.');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const animal = animals.find((a) => a.id === newTask.animalId);
      await taskService.create(farmId as number, {
        farmId: String(farmId),
        title: newTask.title,
        description: newTask.description,
        category: newTask.category as any,
        dueDate: newTask.dueDate,
        priority: newTask.priority,
        status: 'Pending',
        assignedToName: newTask.assignedTo,
        animalId: newTask.animalId || undefined,
        animalTag: animal?.earTag || animal?.animalId || undefined,
      });

      setShowAddModal(false);
      showToast('Task added to schedule');
      setNewTask({
        title: '',
        description: '',
        category: 'Vaccination',
        animalId: '',
        dueDate: '',
        priority: 'High',
        assignedTo: 'Dr. Imran Qureshi',
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (assignedFilter !== 'all') {
      const name = t.assignedTo || t.assignedToName || '';
      if (!name.toLowerCase().includes(assignedFilter.toLowerCase())) return false;
    }
    if (categoryFilter !== 'all') {
      if (t.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    }
    if (priorityFilter !== 'all') {
      if (t.priority !== priorityFilter) return false;
    }
    if (statusFilter !== 'all') {
      const isOverdue = t.status === 'Pending' && t.dueDate < new Date().toISOString().slice(0, 10);
      if (statusFilter === 'Overdue') return isOverdue;
      if (statusFilter === 'Completed') return t.status === 'Completed';
      if (statusFilter === 'Pending') return t.status === 'Pending' && !isOverdue;
    }
    return true;
  });

  // Calendar dates generation for 7 days
  const today = new Date();
  const calendarDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - today.getDay() + index);
    return {
      label: index === today.getDay() ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' }),
      date: date.toISOString().slice(0, 10),
    };
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-700" />
              <span>Farm Tasks &amp; Herd Lifecycle Schedule</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Heat detection &bull; Pregnancy diagnosis (PD) &bull; Vaccinations &bull; Hoof trimming &bull; Dry-off schedule
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Calendar View / List View Toggle (Section 13) */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md flex items-center space-x-1 text-xs font-semibold transition ${
                viewMode === 'list' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md flex items-center space-x-1 text-xs font-semibold transition ${
                viewMode === 'calendar' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filters Bar (Section 13: Assigned to, category, priority, status) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 border-b border-slate-100 pb-2">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter Tasks</span>
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Categories</option>
              <option value="Heat check">Heat Check</option>
              <option value="Pregnancy Diagnosis (PD)">Pregnancy Diagnosis (PD)</option>
              <option value="Vaccination">Vaccination</option>
              <option value="Hoof trimming">Hoof Trimming</option>
              <option value="Dry-off">Dry-Off</option>
              <option value="General">General / Routine</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Assigned To</label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Staff</option>
              <option value="Imran">Dr. Imran Qureshi (Vet)</option>
              <option value="Akram">Muhammad Akram (Feeder)</option>
              <option value="Sajid">Sajid Mehmood (Stockman)</option>
              <option value="Asif">Asif Raza (Milker)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: LIST VIEW                                                         */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
              No tasks match the selected filter criteria.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isDone = task.status === 'Completed';
              const isOverdue = !isDone && task.dueDate < new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl border p-3.5 sm:p-4 shadow-2xs transition flex items-start justify-between gap-3 ${
                    isDone
                      ? 'border-slate-200 bg-slate-50/50 opacity-70'
                      : isOverdue
                      ? 'border-rose-300 bg-rose-50/20'
                      : 'border-slate-200 hover:border-emerald-500'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      disabled
                      title="Task status updates are not supported by the backend"
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-emerald-600 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold leading-tight ${
                            isDone ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </span>

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            task.priority === 'High'
                              ? 'bg-rose-100 text-rose-800'
                              : task.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {task.priority} Priority
                        </span>

                        {/* Category Badge */}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {task.category}
                        </span>

                        {/* Linked Animal Tag (Section 13) */}
                        {(task.animalTag || task.animalId) && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {task.animalTag || task.animalId}
                          </span>
                        )}

                        {isOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                            OVERDUE
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 flex-wrap pt-0.5">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span className={isOverdue ? 'font-bold text-rose-700' : ''}>
                            Due: {task.dueDate}
                          </span>
                        </span>
                        {(task.assignedTo || task.assignedToName) && (
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Assigned: {task.assignedTo || task.assignedToName}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CALENDAR VIEW (Section 13)                                        */}
      {/* ========================================================================= */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">Weekly Task Calendar (13 May – 19 May 2024)</span>
            <span className="text-[11px] text-slate-500">7-Day Herd Care Schedule</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-[400px]">
            {calendarDays.map((day) => {
              const dayTasks = tasks.filter((t) => t.dueDate === day.date);
              const isToday = day.date === new Date().toISOString().slice(0, 10);

              return (
                <div key={day.date} className={`p-2.5 space-y-2 ${isToday ? 'bg-emerald-50/40' : ''}`}>
                  <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
                    <div>
                      <div className={`text-xs font-bold ${isToday ? 'text-emerald-800' : 'text-slate-800'}`}>
                        {day.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{day.date}</div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{dayTasks.length}</span>
                  </div>

                  <div className="space-y-1.5">
                    {dayTasks.length === 0 ? (
                      <div className="text-[10px] text-slate-400 py-3 text-center">No tasks</div>
                    ) : (
                      dayTasks.map((t) => {
                        const isDone = t.status === 'Completed';
                        return (
                          <div
                            key={t.id}
                            disabled
                            title="Task status updates are not supported by the backend"
                            className={`p-2 rounded-lg text-xs cursor-pointer border transition ${
                              isDone
                                ? 'bg-slate-50 border-slate-200 opacity-60 text-slate-500'
                                : t.priority === 'High'
                                ? 'bg-rose-50 border-rose-200 text-rose-950 hover:bg-rose-100'
                                : 'bg-white border-slate-200 text-slate-900 hover:border-emerald-500'
                            }`}
                          >
                            <div className={`font-semibold text-[11px] ${isDone ? 'line-through' : ''}`}>
                              {t.title}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center justify-between mt-1">
                              <span>{t.category}</span>
                              {t.animalTag && <span className="font-mono font-bold">{t.animalTag}</span>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE TASK (Section 13 Exact Specification)                       */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Farm Task</h3>
                <p className="text-xs text-slate-500">Schedule care action and assign to farm staff</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ultrasonic PD for Cow 1002"
                  value={newTask.title}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Protocol Details</label>
                <textarea
                  rows={2}
                  value={newTask.description}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Optional protocol instructions..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="Heat check">Heat Check</option>
                    <option value="Pregnancy Diagnosis (PD)">Pregnancy Diagnosis (PD)</option>
                    <option value="Vaccination">Vaccination</option>
                    <option value="Hoof trimming">Hoof Trimming</option>
                    <option value="Dry-off">Dry-Off Protocol</option>
                    <option value="General">General Care</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Linked Animal (Optional)</label>
                  <select
                    value={newTask.animalId}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, animalId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="">-- No specific animal --</option>
                    {animals.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.earTag || a.animalId} ({a.name || a.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Priority *</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask((prev) => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assign To *</label>
                <select
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, assignedTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                >
                  <option value="Dr. Imran Qureshi">Dr. Imran Qureshi (Veterinarian)</option>
                  <option value="Muhammad Akram">Muhammad Akram (Nutritionist / Feeder)</option>
                  <option value="Sajid Mehmood">Sajid Mehmood (Herd Manager)</option>
                  <option value="Asif Raza">Asif Raza (Milking Parlor Supervisor)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs transition"
                >
                  Schedule Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
