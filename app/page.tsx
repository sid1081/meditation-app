'use client';

import React, { useState, createContext, useContext, useEffect } from 'react';
import { Calendar, Plus, BarChart, Loader2 } from 'lucide-react';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MeditationContextType {
  sessions: Record<number, Record<string, { count: number; duration: number }>>;
  addSession: (userId: number, sessionDate: Date, duration: string) => Promise<boolean>;
  date: Date;
  setDate: (date: Date) => void;
  users: Array<{ id: number; name: string; color: string }>;
  isLoading: boolean;
}

const MeditationContext = createContext<MeditationContextType | undefined>(undefined);

const MeditationApp = () => {
  const [activeView, setActiveView] = useState('tracker');
  const [date, setDate] = useState(new Date());
  const [sessions, setSessions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const users = [
    { id: 1, name: 'Sid', color: 'bg-purple-600' },
    { id: 2, name: 'Roshani', color: 'bg-blue-600' },
    { id: 3, name: 'Uday', color: 'bg-green-600' },
    { id: 4, name: 'Kriti', color: 'bg-orange-600' }
  ];

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      
      const data = await response.json();
      const sessionMap = {};
      data.forEach(session => {
        if (!sessionMap[session.userId]) {
          sessionMap[session.userId] = {};
        }
        if (!sessionMap[session.userId][session.date]) {
          sessionMap[session.userId][session.date] = { count: 0, duration: 0 };
        }
        sessionMap[session.userId][session.date].count += 1;
        sessionMap[session.userId][session.date].duration += session.duration;
      });
      
      setSessions(sessionMap);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));

    } finally {
      setIsLoading(false);
    }
  };

  const addSession = async (userId, sessionDate, duration) => {
    try {
      const dateStr = sessionDate.toISOString().split('T')[0];
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          date: dateStr,
          duration: parseInt(duration)
        })
      });
      
      if (!response.ok) throw new Error('Failed to add session');
      await fetchSessions();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      return false;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Alert variant="destructive" className="w-96">
          <AlertDescription>
            {error}
            <Button variant="outline" className="mt-4 w-full" onClick={fetchSessions}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <MeditationContext.Provider value={{ sessions, addSession, date, setDate, users, isLoading }}>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-purple-600 mr-4" />
              <h1 className="text-xl font-semibold">Meditation Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant={activeView === 'tracker' ? 'default' : 'outline'}
                onClick={() => setActiveView('tracker')}
              >
                Tracker
              </Button>
              <Button 
                variant={activeView === 'analytics' ? 'default' : 'outline'}
                onClick={() => setActiveView('analytics')}
              >
                <BarChart className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </nav>

        {isLoading ? (
          <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          activeView === 'tracker' ? <TrackerView /> : <AnalyticsView />
        )}
      </div>
    </MeditationContext.Provider>
  );
};

const TrackerView = () => {
  const { sessions, addSession, date, setDate, users } = useContext(MeditationContext)!;
  const [duration, setDuration] = useState('');
  const [selectedUser, setSelectedUser] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSession = async () => {
    setIsSubmitting(true);
    const success = await addSession(selectedUser, date, duration);
    if (success) {
      setDuration('');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="p-6">
      <div className="flex justify-end mb-6 space-x-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              {date.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && setDate(newDate)}
              className="rounded-md border"
            />
          </PopoverContent>
        </Popover>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Meditation Session</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Meditator</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(Number(e.target.value))}
                  disabled={isSubmitting}
                >
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <Button 
              onClick={handleAddSession} 
              disabled={isSubmitting || !duration}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isSubmitting ? 'Adding...' : 'Add Session'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {users.map(user => (
          <div key={user.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${user.color}`}></div>
              <h2 className="font-medium">{user.name}</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Sessions</span>
                <span className="font-medium text-black">
                  {sessions[user.id]?.[date.toISOString().split('T')[0]]?.count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Duration</span>
                <span className="font-medium text-black">
                  {sessions[user.id]?.[date.toISOString().split('T')[0]]?.duration || 0} min
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnalyticsView = () => {
  const { sessions, users } = useContext(MeditationContext)!;

  const getTotalStats = () => {
    return users.map(user => {
      const userSessions = sessions[user.id] || {};
      const totalDuration = Object.values(userSessions).reduce((sum, day) => sum + day.duration, 0);
      const totalSessions = Object.values(userSessions).reduce((sum, day) => sum + day.count, 0);
      
      return {
        name: user.name,
        totalMinutes: totalDuration,
        totalSessions: totalSessions,
        averageMinutes: totalSessions ? Math.round(totalDuration / totalSessions) : 0
      };
    });
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-semibold mb-6">Meditation Analytics</h2>
        
        <div className="h-96 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={getTotalStats()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalMinutes" name="Total Minutes" fill="#9333ea" />
              <Bar dataKey="totalSessions" name="Total Sessions" fill="#2563eb" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getTotalStats().map((stat, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-4">{stat.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Time</span>
                  <span>{stat.totalMinutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Sessions</span>
                  <span>{stat.totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Session</span>
                  <span>{stat.averageMinutes} min</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MeditationApp;
