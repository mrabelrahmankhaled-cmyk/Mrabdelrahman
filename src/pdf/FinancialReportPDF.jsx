import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet,
  Font,
  Image,
  PDFDownloadLink
} from '@react-pdf/renderer';

// Register Arabic font
Font.register({
  family: 'Cairo',
  fonts: [
    { src: '/fonts/Cairo-Regular.ttf', fontWeight: 400, fontStyle: 'normal' },
    { src: '/fonts/Cairo-SemiBold.ttf', fontWeight: 600, fontStyle: 'normal' },
    { src: '/fonts/Cairo-Bold.ttf', fontWeight: 700, fontStyle: 'normal' },
    { src: '/fonts/Cairo-Black.ttf', fontWeight: 900, fontStyle: 'normal' },
  ]
});

// Styles for RTL Arabic PDF - Smart Center9.pdf Reference Design
const styles = StyleSheet.create({
  page: {
    direction: 'rtl',
    fontFamily: 'Cairo',
    fontSize: 11,
    fontStyle: 'normal',
    padding: 25,
    backgroundColor: '#ffffff',
    lineHeight: 1.5
  },
  
  // ========== CLEAN PROFESSIONAL HEADER ==========
  header: {
    textAlign: 'center',
    marginBottom: 30,
    borderBottom: '1.5pt solid #1e40af',
    paddingBottom: 15
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 12,
    objectFit: 'contain'
  },
  centerName: {
    fontSize: 22,
    fontWeight: 900,
    color: '#1e40af',
    marginBottom: 6
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4
  },
  extractionDate: {
    fontSize: 9,
    color: '#6b7280',
    fontStyle: 'normal'
  },
  
  // ========== CLEAN SUMMARY SECTION ==========
  summarySection: {
    marginBottom: 25
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20
  },
  summaryCard: {
    flex: 1,
    padding: 15,
    borderRadius: 6,
    textAlign: 'center',
    border: '1pt solid #d1d5db',
    backgroundColor: '#ffffff'
  },
  summaryCardIncome: {
    borderTop: '2pt solid #3b82f6'
  },
  summaryCardTeacher: {
    borderTop: '2pt solid #10b981'
  },
  summaryCardCenter: {
    borderTop: '2pt solid #8b5cf6'
  },
  summaryCardDebt: {
    borderTop: '2pt solid #ef4444'
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 2,
    lineHeight: 1
  },
  summaryValueIncome: { color: '#1e40af' },
  summaryValueTeacher: { color: '#059669' },
  summaryValueCenter: { color: '#6d28d9' },
  summaryValueDebt: { color: '#dc2626' },
  summaryUnit: {
    fontSize: 7,
    color: '#9ca3af'
  },
  
  // ========== PROFESSIONAL TABLE DESIGN ==========
  tableSection: {
    marginBottom: 20
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
    border: '1pt solid #e5e7eb'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1pt solid #d1d5db',
    backgroundColor: '#ffffff'
  },
  tableHeader: {
    backgroundColor: '#1e40af',
    color: '#ffffff',
    fontWeight: 700
  },
  tableHeaderCell: {
    padding: 10,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 700,
    border: '1pt solid #1e40af',
    backgroundColor: '#1e40af',
    color: '#ffffff'
  },
  tableRow: {
    pageBreakInside: 'avoid'
  },
  tableRowEven: {
    backgroundColor: '#f9fafb'
  },
  tableRowOdd: {
    backgroundColor: '#ffffff'
  },
  tableCell: {
    padding: 8,
    border: '1pt solid #e5e7eb',
    fontSize: 9,
    color: '#374151',
    verticalAlign: 'middle'
  },
  tableCellDate: {
    textAlign: 'center',
    fontWeight: 500,
    width: '14%',
    minWidth: 60
  },
  tableCellCourse: {
    textAlign: 'center',
    fontWeight: 600,
    color: '#1f2937',
    width: '18%',
    minWidth: 80
  },
  tableCellGroup: {
    textAlign: 'center',
    color: '#1e40af',
    fontWeight: 500,
    width: '14%',
    minWidth: 60
  },
  tableCellAttendance: {
    textAlign: 'center',
    fontWeight: 700,
    width: '10%',
    minWidth: 40
  },
  tableCellInstructor: {
    textAlign: 'center',
    color: '#4b5563',
    width: '18%',
    minWidth: 80
  },
  tableCellAmount: {
    textAlign: 'center',
    fontWeight: 600,
    color: '#059669',
    width: '13%',
    minWidth: 50
  },
  tableCellDebt: {
    textAlign: 'center',
    fontWeight: 700,
    width: '13%',
    minWidth: 50
  },
  debtCell: {
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    fontWeight: 700
  },
  
  // ========== CLEAN NOTES SECTION ==========
  notesSection: {
    marginTop: 25,
    padding: 15,
    backgroundColor: '#f9fafb',
    border: '1pt solid #e5e7eb',
    borderRadius: 4
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  notesContent: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.6
  },
  
  // ========== PROFESSIONAL FOOTER ==========
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 25,
    right: 25,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTop: '1pt solid #e5e7eb',
    paddingTop: 10
  }
});

// Main PDF Document Component
const FinancialReportPDF = ({ reportData, centerConfig, filteredRows, dynamicTotals }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ========== CLEAN PROFESSIONAL HEADER ========== */}
        <View style={styles.header}>
          {centerConfig?.logo_url && (
            <Image src={centerConfig.logo_url} style={styles.logo} />
          )}
          <Text style={styles.centerName}>
            {centerConfig?.center_name || "SMART CENTER"}
          </Text>
          <Text style={styles.reportTitle}>{reportData?.title}</Text>
          <Text style={styles.extractionDate}>
            مستخرج بتاريخ {reportData?.date}
          </Text>
        </View>

        {/* ========== CLEAN SUMMARY CARDS ========== */}
        <View style={styles.summarySection}>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.summaryCardIncome]}>
              <Text style={styles.summaryLabel}>إجمالي الدخل</Text>
              <Text style={[styles.summaryValue, styles.summaryValueIncome]}>
                {dynamicTotals?.income?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.summaryUnit}>جنيه مصري</Text>
            </View>
            
            <View style={[styles.summaryCard, styles.summaryCardTeacher]}>
              <Text style={styles.summaryLabel}>صافي المدرسين</Text>
              <Text style={[styles.summaryValue, styles.summaryValueTeacher]}>
                {dynamicTotals?.teacher?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.summaryUnit}>مستحقات خارجية</Text>
            </View>
            
            <View style={[styles.summaryCard, styles.summaryCardCenter]}>
              <Text style={styles.summaryLabel}>نصيب السنتر</Text>
              <Text style={[styles.summaryValue, styles.summaryValueCenter]}>
                {dynamicTotals?.center?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.summaryUnit}>الربح الصافي</Text>
            </View>
            
            <View style={[styles.summaryCard, styles.summaryCardDebt]}>
              <Text style={styles.summaryLabel}>إجمالي الديون</Text>
              <Text style={[styles.summaryValue, styles.summaryValueDebt]}>
                {dynamicTotals?.debt?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.summaryUnit}>مبالغ لم تُحصل</Text>
            </View>
          </View>
        </View>

        {/* ========== PROFESSIONAL TABLE SECTION ========== */}
        <View style={styles.tableSection}>
          <View style={styles.sectionHeader}>
            تفاصيل الحصص المالية
          </View>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>التاريخ</Text>
              <Text style={styles.tableHeaderCell}>المادة</Text>
              <Text style={styles.tableHeaderCell}>المجموعة</Text>
              <Text style={styles.tableHeaderCell}>الحضور</Text>
              <Text style={styles.tableHeaderCell}>المدرس</Text>
              <Text style={styles.tableHeaderCell}>صافي المدرس</Text>
              <Text style={styles.tableHeaderCell}>الديون</Text>
            </View>
            
            {/* Table Rows with Clean Zebra Striping */}
            {filteredRows?.map((row, index) => (
              <View 
                key={index} 
                style={[
                  styles.tableRow, 
                  index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd
                ]}
              >
                <Text style={[styles.tableCell, styles.tableCellDate]}>
                  {formatDate(row.created_at)}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellCourse]}>
                  {row.course?.name || '---'}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellGroup]}>
                  {row.group?.name || '---'}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellAttendance]}>
                  {row.stats?.count || 0}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellInstructor]}>
                  {row.course?.instructor || '---'}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellAmount]}>
                  {row.stats?.teacherTotal?.toFixed(2) || '0.00'}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  styles.tableCellDebt,
                  row.debt > 0 ? styles.debtCell : null
                ]}>
                  {row.debt?.toFixed(2) || '0.00'}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ========== CLEAN NOTES SECTION ========== */}
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>
            ملاحظات هامة
          </Text>
          <Text style={styles.notesContent}>
            • جميع المبالغ محسوبة بالجنيه المصري
            • الخصومات والإعفاءات محسوبة تلقائياً من بيانات الطلاب
            • هذا التقرير صالح للأغراض المحاسبية والإدارية
          </Text>
        </View>

        {/* ========== PROFESSIONAL FOOTER ========== */}
        <View style={styles.footer}>
          <Text>نظام إدارة المراكز التعليمية - تقرير مالي معتمد</Text>
          <Text>جميع الحقوق محفوظة © {new Date().getFullYear()}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default FinancialReportPDF;
export { PDFDownloadLink };
