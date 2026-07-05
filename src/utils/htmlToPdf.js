/**
 * HTML to PDF Converter - Pixel-Perfect HTML Replication
 * Uses Puppeteer server-side to generate exact visual copy of HTML report
 */

export const generateHtmlPdf = async (htmlContent, fileName = 'report.pdf') => {
  console.log('🚀 Starting PDF generation...');
  
  try {
    console.log('📤 Sending request to /api/generate-pdf...');
    console.log('📊 HTML content size:', htmlContent.length, 'characters');
    
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        htmlContent,
        fileName
      })
    });

    console.log('📥 Response received:', response.status, response.statusText);

    // ✅ STEP 5 — Client Safety & Error Visibility
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Server error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      // Show user-friendly error
      const errorMessage = errorData.details || errorData.error || 'Failed to generate PDF';
      throw new Error(`PDF generation failed: ${errorMessage}`);
    }

    // Get the PDF blob
    const pdfBlob = await response.blob();
    console.log('✅ PDF blob received:', pdfBlob.size, 'bytes');
    
    // Create download link
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    console.log('✅ PDF download initiated successfully');
    return true;
    
  } catch (error) {
    console.error('💥 HTML to PDF conversion error:', error);
    console.error('💥 Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    // Show user-friendly toast notification
    if (typeof window !== 'undefined' && window.alert) {
      alert(`فشل إنشاء ملف PDF: ${error.message}\n\nيرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.`);
    }
    
    throw error;
  }
};

/**
 * Capture HTML element and convert to PDF
 * @param {string} elementId - ID of the HTML element to capture
 * @param {string} fileName - Download filename
 */
export const captureElementAsPdf = async (elementId, fileName) => {
  console.log('🎯 Starting HTML capture for element:', elementId);
  
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('❌ Element not found:', elementId);
    throw new Error(`Element with ID "${elementId}" not found`);
  }

  console.log('✅ Element found, capturing HTML...');

  // Clone the element to avoid modifying the original
  const clonedElement = element.cloneNode(true);
  
  // Create a temporary container
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '0';
  tempContainer.style.width = element.offsetWidth + 'px';
  tempContainer.appendChild(clonedElement);
  document.body.appendChild(tempContainer);

  try {
    // Get the HTML content
    const htmlContent = tempContainer.innerHTML;
    console.log('✅ HTML content captured:', htmlContent.length, 'characters');
    
    // Add necessary styles
    const styles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          console.warn('⚠️ Could not access stylesheet:', e.message);
          return '';
        }
      })
      .join('\n');

    // ✅ Ensure HTML is wrapped in a full document shell
    const fullHtml = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Financial Report</title>
        <style>
          ${styles}
          
          /* 🧠 Smart print CSS - fix stupid page breaks */
          @media print {
            /* Table rows MUST NOT split */
            tr {
              break-inside: avoid;
              page-break-inside: avoid;
            }
            
            /* Table headers MUST repeat on new pages */
            thead {
              display: table-header-group;
            }
            
            /* Headers avoid being last line on page */
            h1, h2, h3, h4 {
              page-break-after: avoid;
            }
            
            /* Minimal breathing space between header and table */
            .font-black.text-gray-700.mb-4 {
              margin-bottom: 16px;
            }
            
            /* SMART: Conditional page break before main data table */
            .font-black.text-gray-700.mb-4 + .overflow-x-auto {
              page-break-before: auto;
            }
            
            /* Alternative: Break before table if preceded by heading */
            h3 + table,
            h2 + table,
            .font-black + table {
              page-break-before: auto;
            }
            
            /* LARGE blocks ALLOW splitting if taller than page */
            .grid, .rounded-2xl, .shadow-sm, .rounded-xl {
              break-inside: auto;
              page-break-inside: auto;
            }
            
            /* Summary cards wrappers allow natural flow */
            .grid.grid-cols-2.md\\:grid-cols-4,
            .grid.grid-cols-1.md\\:grid-cols-2 {
              break-inside: auto;
              page-break-inside: auto;
            }
            
            /* Special sections allow natural flow */
            .border-yellow-200, .border-green-200 {
              break-inside: auto;
              page-break-inside: auto;
            }
            
            /* Ensure body allows natural flow */
            body {
              page-break-before: auto;
              page-break-after: auto;
            }
            
            /* Hide print-only elements */
            .print\\:hidden {
              display: none !important;
            }
          }
          
          body { 
            margin: 0; 
            padding: 20px; 
            font-family: 'Cairo', sans-serif;
            direction: rtl;
            background: white;
          }
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          table { 
            page-break-inside: auto !important; 
          }
          tr { 
            page-break-inside: avoid !important; 
            page-break-after: auto !important; 
          }
          .print\\:hidden {
            display: none !important;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    console.log('✅ Full HTML document prepared:', fullHtml.length, 'characters');

    // Generate PDF
    await generateHtmlPdf(fullHtml, fileName);
    
  } finally {
    // Clean up
    document.body.removeChild(tempContainer);
    console.log('✅ Temporary container cleaned up');
  }
};
