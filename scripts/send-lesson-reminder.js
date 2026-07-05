#!/usr/bin/env node

// Load environment variables from .env (server-side)
require('dotenv').config();

// Debug: Test if .env is being loaded
console.log('🔍 DEBUG - Environment variables loaded:');
console.log('- TEST_VAR:', process.env.TEST_VAR || '❌ Not found');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌ Not found');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ Not found');
console.log('- NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL ? '✅' : '❌ Not found');

const { createClient } = require('@supabase/supabase-js');

// Use server-side environment variables (no NEXT_PUBLIC_)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Check if environment variables are loaded
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('- SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  console.error('- NEXT_PUBLIC_APP_URL:', APP_URL ? '✅' : '❌');
  console.error('\n💡 Make sure these are set in your .env file:');
  console.error('SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('NEXT_PUBLIC_APP_URL=http://localhost:3000');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendLessonReminders() {
  try {
    console.log('🔍 Checking for lessons starting in 10 minutes...');
    console.log(`🌐 Using APP_URL: ${APP_URL}`);
    
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);
    const tenMinutesAnd30SecondsFromNow = new Date(now.getTime() + 10.5 * 60 * 1000);
    
    // Convert to time strings for comparison
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
    const targetTimeStart = tenMinutesFromNow.toTimeString().slice(0, 8);
    const targetTimeEnd = tenMinutesAnd30SecondsFromNow.toTimeString().slice(0, 8);
    
    const currentDay = now.getDay() === 6 ? 0 : now.getDay() + 1; // JS to Saudi system
    
    console.log(`📅 Current day: ${currentDay}, Time: ${currentTime}`);
    console.log(`🎯 Target time window: ${targetTimeStart} - ${targetTimeEnd}`);
    
    // Find lessons starting in the target window
    const { data: lessons, error } = await supabase
      .from('schedules')
      .select(`
        id,
        start_time,
        day_of_week,
        groups!inner(
          courses!inner(name, instructor),
          students!inner(id)
        ),
        rooms(name)
      `)
      .eq('day_of_week', currentDay)
      .gte('start_time', targetTimeStart)
      .lte('start_time', targetTimeEnd);

    if (error) {
      console.error('❌ Error fetching lessons:', error);
      return;
    }

    if (!lessons || lessons.length === 0) {
      console.log('✅ No lessons starting in 10 minutes');
      return;
    }

    console.log(`📚 Found ${lessons.length} lesson(s) starting soon:`);
    
    for (const lesson of lessons) {
      console.log(`\n🎓 ${lesson.groups.courses.name} with ${lesson.groups.courses.instructor}`);
      console.log(`⏰ Starts at: ${lesson.start_time} (Room: ${lesson.rooms?.name || 'N/A'})`);
      console.log(`👥 Students: ${lesson.groups.students.length}`);
      
      try {
        const response = await fetch(`${APP_URL}/api/notifications/lesson-reminder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lessonId: lesson.id,
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          console.log(`✅ Reminder sent successfully: ${result.message}`);
        } else {
          console.log(`❌ Failed to send reminder: ${result.error}`);
        }
      } catch (error) {
        console.error(`❌ Error sending reminder for lesson ${lesson.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
sendLessonReminders();
