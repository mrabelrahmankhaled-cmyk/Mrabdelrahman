import { redirect } from 'next/navigation';

/**
 * /admin/finance لا تحتوي على صفحة مستقلة.
 * يتم التوجيه تلقائياً إلى صفحة المديونيات.
 */
export default function FinancePage() {
    redirect('/admin/finance/debts');
}
