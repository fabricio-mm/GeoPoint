import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, XCircle } from 'lucide-react';
import { TimeRecord, TimeRecordType } from '@/types';
import './HistoryCalendar.css';

interface HistoryCalendarProps {
  records: TimeRecord[];
  view: 'week' | 'month';
}

type DayStatus = 'ok' | 'error' | 'pending' | 'empty' | 'future';

const ENTRY = 1;
const EXIT = 2;

const typeLabels: Record<TimeRecordType, string> = {
  1: 'Entrada',
  2: 'Saída',
};

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const weekDaysFull = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function HistoryCalendar({ records, view }: HistoryCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get records grouped by date
  const recordsByDate = useMemo(() => {
    const grouped: Record<string, TimeRecord[]> = {};
    records.forEach(record => {
      const dateKey = record.timestamp.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(record);
    });
    return grouped;
  }, [records]);

  // Get day status
  const getDayStatus = (date: Date): DayStatus => {
    const dateKey = date.toISOString().split('T')[0];
    const dayRecords = recordsByDate[dateKey];
    
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    if (dateOnly > today) return 'future';
    if (!dayRecords || dayRecords.length === 0) return 'empty';
    
    // Check if any record has validation error
    const hasError = dayRecords.some(r => !r.validated);
    if (hasError) return 'error';
    
    // Check if it's today and incomplete
    if (dateOnly.getTime() === today.getTime()) {
      const hasEntry = dayRecords.some(r => r.type === ENTRY);
      const hasExit = dayRecords.some(r => r.type === EXIT);
      if (hasEntry && !hasExit) return 'pending';
    }
    
    return 'ok';
  };

  // Generate week days
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Generate month days
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days: (Date | null)[] = [];
    
    // Add empty slots for days before the first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatWeekRange = (days: Date[]) => {
    const start = days[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const end = days[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return `${start} - ${end}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getSelectedDayRecords = () => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toISOString().split('T')[0];
    return recordsByDate[dateKey] || [];
  };

  const weekDaysData = getWeekDays();
  const monthDaysData = getMonthDays();

  const isToday = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const s = new Date(selectedDate);
    s.setHours(0, 0, 0, 0);
    return d.getTime() === s.getTime();
  };

  /** Derive a display label based on position in the day's sequence */
  const getRecordLabel = (record: TimeRecord, dayRecords: TimeRecord[]): string => {
    const sorted = [...dayRecords].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const index = sorted.findIndex(r => r.id === record.id);
    // Typical 4-punch day: Entry, Break Start, Break End, Exit
    const labels = ['Entrada', 'Início Intervalo', 'Fim Intervalo', 'Saída'];
    if (index >= 0 && index < labels.length) return labels[index];
    return typeLabels[record.type];
  };

  return (
    <div className="history-calendar">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={navigatePrevious}>
          <ChevronLeft size={20} />
        </button>
        <span className="calendar-title">
          {view === 'week' ? formatWeekRange(weekDaysData) : formatMonthYear(currentDate)}
        </span>
        <button className="calendar-nav-btn" onClick={navigateNext}>
          <ChevronRight size={20} />
        </button>
      </div>

      {view === 'week' && (
        <div className="calendar-week-view">
          {weekDaysData.map((day, index) => {
            const status = getDayStatus(day);
            const dateKey = day.toISOString().split('T')[0];
            const dayRecords = recordsByDate[dateKey] || [];
            
            return (
              <div 
                key={index}
                className={`week-day-block ${status} ${isToday(day) ? 'today' : ''} ${isSelected(day) ? 'selected' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="week-day-header">
                  <span className="week-day-name">{weekDaysFull[day.getDay()]}</span>
                  <span className="week-day-number">{day.getDate()}</span>
                </div>
                <div className="week-day-content">
                  {dayRecords.length > 0 ? (
                    <div className="week-day-records-preview">
                      {dayRecords.slice(0, 2).map((record, i) => (
                        <div key={i} className="week-day-record-item">
                          <span className="record-type-dot"></span>
                          <span>{getRecordLabel(record, dayRecords)}</span>
                          <span className="record-time">{formatTime(record.timestamp)}</span>
                        </div>
                      ))}
                      {dayRecords.length > 2 && (
                        <span className="week-day-more">+{dayRecords.length - 2} mais</span>
                      )}
                    </div>
                  ) : (
                    <span className="week-day-empty">Sem registros</span>
                  )}
                </div>
                {status === 'error' && (
                  <div className="week-day-status-indicator error">
                    <XCircle size={14} />
                  </div>
                )}
                {status === 'pending' && (
                  <div className="week-day-status-indicator pending">
                    <Clock size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {view === 'month' && (
        <div className="calendar-month-view">
          <div className="month-header">
            {weekDays.map(day => (
              <div key={day} className="month-header-day">{day}</div>
            ))}
          </div>
          <div className="month-grid">
            {monthDaysData.map((day, index) => {
              if (!day) {
                return <div key={index} className="month-day empty-slot"></div>;
              }
              
              const status = getDayStatus(day);
              
              return (
                <div 
                  key={index}
                  className={`month-day ${status} ${isToday(day) ? 'today' : ''} ${isSelected(day) ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <span className="month-day-number">{day.getDate()}</span>
                  {status === 'error' && <div className="month-day-dot error"></div>}
                  {status === 'pending' && <div className="month-day-dot pending"></div>}
                  {status === 'ok' && <div className="month-day-dot ok"></div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedDate && (
        <div className="calendar-detail-panel">
          <div className="detail-panel-header">
            <h3 className="detail-panel-title">
              {selectedDate.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </h3>
            <button className="detail-panel-close" onClick={() => setSelectedDate(null)}>
              ×
            </button>
          </div>
          <div className="detail-panel-content">
            {getSelectedDayRecords().length === 0 ? (
              <div className="detail-panel-empty">
                <Clock size={32} />
                <span>Nenhum registro neste dia</span>
              </div>
            ) : (
              <div className="detail-panel-records">
                {getSelectedDayRecords().map((record, index) => {
                  const dayRecords = getSelectedDayRecords();
                  const label = getRecordLabel(record, dayRecords);
                  return (
                    <div 
                      key={record.id} 
                      className={`detail-record-card type-${record.type}`}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className={`detail-record-icon type-${record.type}`}>
                        <Clock size={16} />
                      </div>
                      <div className="detail-record-info">
                        <span className="detail-record-type">{label}</span>
                        <span className="detail-record-time">{formatTime(record.timestamp)}</span>
                      </div>
                      {!record.validated && (
                        <span className="detail-record-badge error">
                          <XCircle size={12} />
                          Erro
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
