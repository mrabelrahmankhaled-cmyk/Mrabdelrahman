'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase-browser';
import { useAuth } from '../context/AuthContext';

export const useSessionData = () => {
  const { centerId } = useAuth();
  
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [centerConfig, setCenterConfig] = useState(null);
  const [exams, setExams] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  // مرجع للحفاظ على طول الجلسات بدون التسبب في إعادة رندر الدالة
  const sessionsCountRef = useRef(0);
  useEffect(() => {
    sessionsCountRef.current = sessions.length;
  }, [sessions]);

  // دالة مستقرة تماماً لا تعتمد إلا على centerId
  const fetchData = useCallback(async (dateParam = null, isLoadMore = false) => {
    if (!centerId) return;
    
    if (isLoadMore) setLoadingMore(true);
    else {
      setLoading(true);
      setError(null);
    }

    try {
      const PAGE_SIZE = 50;
      let sessionsQuery = supabase
        .from('sessions')
        .select('*')
        .eq('center_id', centerId)
        .order('created_at', { ascending: false });

      if (dateParam && typeof dateParam === 'string') {
        const startDate = `${dateParam}T00:00:00.000Z`;
        const endDate = `${dateParam}T23:59:59.999Z`;
        sessionsQuery = sessionsQuery.or(`and(created_at.gte.${startDate},created_at.lte.${endDate}),is_completed.eq.false`);
      } else {
        const from = isLoadMore ? sessionsCountRef.current : 0;
        const to = from + PAGE_SIZE - 1;
        // في وضع الأرشيف، هنجيب المدى المطلوب مع ضمان ظهور المفتوح برضه
        sessionsQuery = sessionsQuery.range(from, to);
      }

      // ✅ PERFORMANCE FIX: Replaced the RAM-bomb while-loop.
      // Old code: SELECT * on all students in batches → 50MB+ RAM, 10+ round-trips.
      // New code: ONE query, only the 13 columns the session modal actually uses,
      //           filtered to active students only (inactive don't attend sessions).
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id, name, unique_id, parent_phone, phone,
          enrolled_courses, group_ids, wallet_balance,
          subscription_type, free_courses, center_only_courses,
          monthly_courses, is_active, course_discounts
        `)
        .eq('center_id', centerId)
        .eq('is_active', true)
        .limit(5000); // Safety cap — no center has >5000 active students

      if (studentsError) throw studentsError;
      const allStudents = studentsData || [];

      const [sRes, cRes, gRes, exRes, subRes] = await Promise.all([
        sessionsQuery,
        supabase.from('courses').select(`*, instructors (id, name)`).eq('center_id', centerId),
        supabase.from('groups').select('*, schedule(*)').eq('center_id', centerId),
        supabase.from('exams').select('*, sessions(id, is_completed)').eq('center_id', centerId),
        supabase.from('student_subscriptions').select('*').eq('center_id', centerId)
      ]);

      if (sRes.error) throw sRes.error;
      if (cRes.error) throw cRes.error;
      if (gRes.error) throw gRes.error;
      if (exRes.error) throw exRes.error;
      if (subRes.error) throw subRes.error;

      const newSessions = sRes.data || [];
      if (isLoadMore) {
        setSessions(prev => [...prev, ...newSessions]);
      } else {
        setSessions(newSessions);
      }
      
      setHasMore(newSessions.length === PAGE_SIZE);
      setCourses(cRes.data || []);
      setStudents(allStudents);
      setGroups(gRes.data || []);
      setExams(exRes.data || []);
      setSubscriptions(subRes.data || []);

    } catch (err) {
      console.error('Fetch Error:', err);
      setError(err.message || 'Error loading data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [centerId]);

  useEffect(() => {
    if (!centerId) return;
    const fetchSettings = async () => {
      const { data } = await supabase.from('center_settings').select('*').eq('center_id', centerId).maybeSingle();
      if (data) setCenterConfig(data);
    };
    fetchSettings();
  }, [centerId]);

  // fetchData depends only on centerId now

  const reloadData = (date = null) => {
    const validDate = typeof date === 'string' ? date : null;
    fetchData(validDate);
  };

  const loadMore = useCallback(() => fetchData(null, true), [fetchData]);
  const refreshData = fetchData; // already stable useCallback

  return {
    sessions, setSessions,
    courses, setCourses,
    students, setStudents,
    groups, setGroups,
    loading,
    loadingMore,
    hasMore,
    error,
    centerConfig,
    exams,
    subscriptions, setSubscriptions,
    reloadData,
    loadMore,
    refreshData
  };
};