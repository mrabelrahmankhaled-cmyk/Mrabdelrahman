'use client';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * 💧 AuthHydrator
 * هه المكون وظيفته ينقل البيانات اللي السيرفر جابها (Server-side) 
 * للـ AuthContext اللي شغال على الكلاينت (Client-side)
 * ده بيمنع الـ Race Condition وبيخلي السايدبار يشوف الداتا فوراً
 */
export default function AuthHydrator({ user, role, centerId }) {
    const { setCenterId, setRole, setUser, activateCenter } = useAuth();

    useEffect(() => {
        if (centerId) {
            console.log('💧 AuthHydrator: Seeding context with server data:', centerId);
            
            // نمرر الـ user والـ role مباشرة عشان الـ context يلحق يجيب الصلاحيات
            activateCenter(centerId, user, role);
            
            if (role) setRole(role);
            if (user) setUser(user);
        }
    }, [centerId, role, user]);

    return null;
}
