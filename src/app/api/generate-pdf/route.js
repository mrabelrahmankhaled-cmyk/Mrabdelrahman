import puppeteer from 'puppeteer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request) {
  console.log('🚀 PDF Generation API - Entry point');
  
  try {
    const { htmlContent, fileName } = await request.json();
    
    // ✅ STEP 2 — Validate Incoming HTML
    if (!htmlContent) {
      console.log('❌ Missing HTML content');
      return NextResponse.json({ 
        error: 'HTML content is required',
        details: 'No htmlContent provided in request body'
      }, { status: 400 });
    }

    if (htmlContent.length < 100) {
      console.log('❌ HTML content too short:', htmlContent.length);
      return NextResponse.json({ 
        error: 'HTML content is too short',
        details: `Received ${htmlContent.length} characters, minimum 100 required`
      }, { status: 400 });
    }

    console.log('✅ HTML content received:', htmlContent.length, 'characters');

    // ✅ STEP 3 — Puppeteer Configuration (No Guessing)
    console.log('🌐 Launching Puppeteer browser...');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log('✅ Browser launched successfully');
    const page = await browser.newPage();
    
    // ✅ STEP 4 — Deterministic Rendering
    console.log('📄 Setting page content...');
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    console.log('✅ Content set, generating PDF...');
    
    // Generate PDF with exact HTML replication
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      scale: 1
    });

    console.log('✅ PDF generated successfully:', pdfBuffer.length, 'bytes');
    
    await browser.close();
    console.log('✅ Browser closed');

    // Return PDF with proper headers
    const response = new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName || 'report.pdf'}"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

    console.log('✅ PDF response sent successfully');
    return response;

  } catch (error) {
    console.error('💥 PDF generation error:', error);
    console.error('💥 Full error stack:', error.stack);
    
    // Return structured JSON errors
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
