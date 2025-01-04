'use client';

import React, { useState, createContext, useContext, useEffect } from 'react';
import { Calendar, Plus, BarChart, Loader2, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { Calendar as CalendarComponent } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AuthForm } from './AuthForm';

interface SessionData {
  count: number;
  duration: number;
  userName?: string;
}

interface MeditationContextType {
  sessions: Record<string, Record<string, SessionData>>;
  addSession: (sessionDate: Date, duration: string) => Promise<boolean>;
  date: Date;
  setDate: (date: Date) => void;
  isLoading: boolean;
}

const MeditationContext = createContext<MeditationContextType | undefined>(undefined);

const MeditationApp = () => {
  const { data: session } = useSession();
  const [activeView, setActiveView] = useState('tracker');
  const [date, setDate] = useState(new Date());
  const [sessions, setSessions] = useState<Record<string, Record<string, SessionData>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const sessionMap: Record<string, Record<string, SessionData>> = {};
      data.forEach(meditationSession => {
        const userId = meditationSession.userId;
        if (!sessionMap[userId]) {
          sessionMap[userId] = {};
        }
        if (!sessionMap[userId][meditationSession.date]) {
          sessionMap[userId][meditationSession.date] = { 
            count: 0, 
            duration: 0,
            userName: meditationSession.userName
          };
        }
        sessionMap[userId][meditationSession.date].count += 1;
        sessionMap[userId][meditationSession.date].duration += meditationSession.duration;
      });
      
      setSessions(sessionMap);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const addSession = async (sessionDate: Date, duration: string) => {
    if (!session?.user) {
      setError('Please sign in to add a session');
      return false;
    }
    try {
      const dateStr = sessionDate.toISOString().split('T')[0];
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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

  const SignInView = () => {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <Calendar className="h-8 w-8 text-purple-600 mr-3" />
            <h1 className="text-2xl font-semibold">Meditation Tracker</h1>
          </div>
          <AuthForm onClose={() => {}} />
        </div>
      </div>
    );
  };

  if (!session?.user) {
    return <SignInView />;
  }

  return (
    <MeditationContext.Provider value={{ sessions, addSession, date, setDate, isLoading }}>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-purple-600 mr-4" />
              <h1 className="text-xl font-semibold">Meditation Tracker</h1>
            </div>
            <div className="flex items-center flex-wrap justify-center sm:justify-end gap-2 sm:gap-4">
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
              <Button variant="outline" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </nav>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="text-sm text-gray-500">Loading sessions...</p>
            </div>
          </div>
        ) : (
          activeView === 'tracker' ? <TrackerView /> : <AnalyticsView />
        )}
      </div>
    </MeditationContext.Provider>
  );
};

const TrackerView = () => {
  const { sessions, addSession, date, setDate } = useContext(MeditationContext)!;
  // const { data: session } = useSession();
  const [duration, setDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSession = async () => {
    setIsSubmitting(true);
    const success = await addSession(date, duration);
    if (success) {
      setDuration('');
    }
    setIsSubmitting(false);
  };

  const getUniqueUsers = () => {
    const userMap = new Map();
    const colors = [
      'bg-purple-600',
      'bg-blue-600',
      'bg-emerald-600',
      'bg-orange-600'
    ];
    Object.entries(sessions).forEach(([userId, userSessions]) => {
      const sessionData = Object.values(userSessions)[0];
      if (sessionData) {
        const colorIndex = userMap.size % colors.length;
        userMap.set(userId, {
          id: userId,
          name: sessionData.userName || 'Unknown User',
          color: colors[colorIndex]
        });
      }
    });
    return Array.from(userMap.values());
  };

  const users = getUniqueUsers();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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
  const { sessions } = useContext(MeditationContext)!;

  const getTotalStats = () => {
    return Object.entries(sessions).map(([userId, userSessions]) => {
      console.log(userId);
      const totalDuration = Object.values(userSessions).reduce((sum, day) => sum + day.duration, 0);
      const totalSessions = Object.values(userSessions).reduce((sum, day) => sum + day.count, 0);
      const sessionData = Object.values(userSessions)[0];
      
      return {
        name: sessionData?.userName || 'Unknown User',
        totalMinutes: totalDuration,
        totalSessions: totalSessions,
        averageMinutes: totalSessions ? Math.round(totalDuration / totalSessions) : 0
      };
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
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
            <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
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
