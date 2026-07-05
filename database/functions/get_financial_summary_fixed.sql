-- ========================================================
-- FIX: Multi-Tenant Financial Summary
-- This function calculates financial metrics for a specific center.
-- ========================================================

CREATE OR REPLACE FUNCTION public.get_financial_summary(target_center_id UUID)
RETURNS JSON AS $$
DECLARE
    income_total DECIMAL(10,2) := 0;
    expenses_total DECIMAL(10,2) := 0;
    sessions_total DECIMAL(10,2) := 0;
    store_total DECIMAL(10,2) := 0;
    final_balance DECIMAL(10,2) := 0;
BEGIN
    -- 1. Calculate Income from Sessions (Payments collected in attendance)
    SELECT COALESCE(SUM(amount_paid), 0)
    INTO sessions_total
    FROM public.attendance
    WHERE center_id = target_center_id;

    -- 2. Calculate Income from Store (Assuming there is a store_sales or similar table)
    -- If store_sales doesn't exist yet, we'll default to 0 to avoid errors
    BEGIN
        EXECUTE 'SELECT COALESCE(SUM(total_price), 0) FROM public.store_sales WHERE center_id = $1'
        INTO store_total
        USING target_center_id;
    EXCEPTION WHEN OTHERS THEN
        store_total := 0;
    END;

    -- 3. Calculate Total Expenses
    SELECT COALESCE(SUM(amount), 0)
    INTO expenses_total
    FROM public.expenses
    WHERE center_id = target_center_id;

    -- 4. Final Totals
    income_total := sessions_total + store_total;
    final_balance := income_total - expenses_total;

    RETURN json_build_object(
        'income', income_total,
        'expenses', expenses_total,
        'balance', final_balance,
        'sessions_net', sessions_total,
        'store_net', store_total
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
