'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { 
  FaCheckCircle, FaTimesCircle
} from 'react-icons/fa';

// Import our new modular components and hooks
import { useSessionData } from '../../../hooks/useSessionData';
import { useAttendance } from '../../../hooks/useAttendance';
import { useScanner } from '../../../hooks/useScanner';
import { 
  calculateTotalStudentDebt, 
  getSessionDisplayStats, 
  getAvailableGrades, 
  filterCoursesByGrade,
  calculateShareDistribution,
  calculateSessionDebt
} from '../../../utils/sessionCalculations';

import { SessionsHeader } from '../../../components/sessions/SessionsHeader';
import { CreateSessionForm } from '../../../components/sessions/CreateSessionForm';
import { SessionCard } from '../../../components/sessions/SessionCard';
import { SessionModal } from '../../../components/sessions/SessionModal';
import { PrintableReport } from '../../../components/sessions/PrintableReport';

export default function SessionsPage({ userRole }) { // ← نستقبل userRole كـ prop
