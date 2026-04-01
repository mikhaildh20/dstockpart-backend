import db from "../config/db.js";

const getCurrentShift = async () => {
    const query = `
        DECLARE @now TIME = CAST(GETDATE() AS TIME);

        SELECT TOP 1
            sft_id AS Id,
            sft_code AS Code,
            sft_name AS Name,
            CONVERT(VARCHAR(5), CAST(sft_start AS TIME), 108) AS StartTime,
            CONVERT(VARCHAR(5), CAST(sft_end AS TIME), 108) AS EndTime
        FROM dsc_shifts
        WHERE
            (
                CAST(sft_end AS TIME) > CAST(sft_start AS TIME)
                AND @now >= CAST(sft_start AS TIME)
                AND @now < CAST(sft_end AS TIME)
            )
            OR
            (
                CAST(sft_end AS TIME) <= CAST(sft_start AS TIME)
                AND (
                    @now >= CAST(sft_start AS TIME)
                    OR @now < CAST(sft_end AS TIME)
                )
            )
        ORDER BY sft_id ASC
    `;

    const rows = await db.query(query);
    return rows[0] || null;
};

export const getDashboardModels = async () => {
    const query = `
        SELECT
            mdl.mdl_id AS Id,
            mdl.mdl_code AS Code,
            lne.lne_code AS LineCode
        FROM dsc_models mdl
        LEFT JOIN dsc_lines lne
            ON lne.lne_id = mdl.lne_id
        WHERE mdl.mdl_status = 1
        ORDER BY mdl.mdl_code ASC
    `;

    return db.query(query);
};

export const getDashboardShifts = async () => {
    const query = `
        SELECT
            sft_id AS Id,
            sft_code AS Code,
            sft_name AS Name,
            CONVERT(VARCHAR(5), CAST(sft_start AS TIME), 108) AS StartTime,
            CONVERT(VARCHAR(5), CAST(sft_end AS TIME), 108) AS EndTime
        FROM dsc_shifts
        ORDER BY sft_id ASC
    `;

    return db.query(query);
};

export const getDashboardByModel = async ({ modelId, shiftId = null, date = null }) => {
    if (!modelId) {
        throw new Error("Model ID is required");
    }

    const shift = shiftId
        ? (
            await db.query(
                `
                SELECT TOP 1
                    sft_id AS Id,
                    sft_code AS Code,
                    sft_name AS Name,
                    CONVERT(VARCHAR(5), CAST(sft_start AS TIME), 108) AS StartTime,
                    CONVERT(VARCHAR(5), CAST(sft_end AS TIME), 108) AS EndTime
                FROM dsc_shifts
                WHERE sft_id = @shiftId
            `,
                [{ name: "shiftId", type: db.sql.Int, value: Number(shiftId) }]
            )
        )[0]
        : await getCurrentShift();

    if (!shift?.Id) {
        throw new Error("Selected shift is not available");
    }

    const targetDate = date || new Date().toISOString().slice(0, 10);
    const targetMonth = targetDate.slice(0, 7);
    const [year, month] = targetMonth.split("-").map(Number);
    const monthStart = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

    const baseParams = [
        { name: "modelId", type: db.sql.Int, value: Number(modelId) },
        { name: "shiftId", type: db.sql.Int, value: Number(shift.Id) },
        { name: "targetDate", type: db.sql.Date, value: targetDate },
        { name: "monthStart", type: db.sql.Date, value: monthStart },
        { name: "monthEnd", type: db.sql.Date, value: monthEnd },
    ];

    const modelQuery = `
        SELECT TOP 1
            mdl.mdl_id AS ModelId,
            mdl.mdl_code AS ModelCode,
            lne.lne_code AS LineCode
        FROM dsc_models mdl
        LEFT JOIN dsc_lines lne
            ON lne.lne_id = mdl.lne_id
        WHERE mdl.mdl_id = @modelId
    `;

    const modelRows = await db.query(modelQuery, baseParams);
    const model = modelRows[0];
    if (!model) {
        throw new Error("Model not found");
    }

    const partsQuery = `
        WITH PartBase AS (
            SELECT
                mpd.mpd_id AS MpdId,
                prt.prt_code AS PartCode,
                prt.prt_name AS PartName,
                MIN(ISNULL(mpsd.sequence, 99999)) AS DisplaySequence
            FROM dsc_model_part_details mpd
            INNER JOIN dsc_parts prt
                ON prt.prt_id = mpd.prt_id
            LEFT JOIN dsc_model_part_section_details mpsd
                ON mpsd.mpd_id = mpd.mpd_id
            WHERE mpd.mdl_id = @modelId
            GROUP BY mpd.mpd_id, prt.prt_code, prt.prt_name
        ),
        LatestSectionLogs AS (
            SELECT
                mpsd.mpd_id AS MpdId,
                lg.mpsd_id AS MpsdId,
                lg.side AS Side,
                lg.qty AS Qty,
                ROW_NUMBER() OVER (
                    PARTITION BY lg.mpsd_id, lg.side
                    ORDER BY lg.created_at DESC, lg.log_id DESC
                ) AS rn
            FROM dsc_wip_logs lg
            INNER JOIN dsc_model_part_section_details mpsd
                ON mpsd.mpsd_id = lg.mpsd_id
            INNER JOIN dsc_model_part_details mpd
                ON mpd.mpd_id = mpsd.mpd_id
            WHERE mpd.mdl_id = @modelId
                AND lg.sft_id = @shiftId
                AND CAST(lg.created_at AS DATE) = @targetDate
        ),
        CurrentAgg AS (
            SELECT
                MpdId,
                ISNULL(SUM(CASE WHEN Side = 'R' THEN Qty ELSE 0 END), 0) AS CurrentR,
                ISNULL(SUM(CASE WHEN Side = 'L' THEN Qty ELSE 0 END), 0) AS CurrentL
            FROM LatestSectionLogs
            WHERE rn = 1
            GROUP BY MpdId
        ),
        LastSeq AS (
            SELECT
                mpsd.mpd_id AS MpdId,
                mpsd.mpsd_id AS MpsdId,
                ROW_NUMBER() OVER (
                    PARTITION BY mpsd.mpd_id
                    ORDER BY mpsd.sequence DESC, mpsd.mpsd_id DESC
                ) AS rn
            FROM dsc_model_part_section_details mpsd
        ),
        FinishAgg AS (
            SELECT
                ls.MpdId,
                ISNULL(MAX(CASE WHEN lsl.Side = 'R' THEN lsl.Qty END), 0) AS FinishR,
                ISNULL(MAX(CASE WHEN lsl.Side = 'L' THEN lsl.Qty END), 0) AS FinishL
            FROM LastSeq ls
            LEFT JOIN LatestSectionLogs lsl
                ON lsl.MpsdId = ls.MpsdId
                AND lsl.rn = 1
            WHERE ls.rn = 1
            GROUP BY ls.MpdId
        ),
        PlanAgg AS (
            SELECT
                mpd.mdl_id AS ModelId,
                ISNULL(MAX(CASE WHEN wpl.side = 'R' THEN wpl.planned_qty END), 0) AS PlanR,
                ISNULL(MAX(CASE WHEN wpl.side = 'L' THEN wpl.planned_qty END), 0) AS PlanL
            FROM dsc_wip_plannings wpl
            INNER JOIN dsc_model_part_details mpd
                ON mpd.mpd_id = wpl.mpd_id
            WHERE wpl.sft_id = @shiftId
                AND mpd.mdl_id = @modelId
                AND CAST(wpl.created_at AS DATE) = @targetDate
            GROUP BY mpd.mdl_id
        )
        SELECT
            pb.MpdId,
            pb.PartCode,
            pb.PartName,
            pb.DisplaySequence,
            ISNULL(pa.PlanR, 0) AS PlanR,
            ISNULL(pa.PlanL, 0) AS PlanL,
            ISNULL(ca.CurrentR, 0) AS CurrentR,
            ISNULL(ca.CurrentL, 0) AS CurrentL,
            ISNULL(fa.FinishR, 0) AS FinishR,
            ISNULL(fa.FinishL, 0) AS FinishL
        FROM PartBase pb
        LEFT JOIN PlanAgg pa
            ON pa.ModelId = @modelId
        LEFT JOIN CurrentAgg ca
            ON ca.MpdId = pb.MpdId
        LEFT JOIN FinishAgg fa
            ON fa.MpdId = pb.MpdId
        ORDER BY pb.DisplaySequence ASC, pb.PartCode ASC
    `;

    const parts = await db.query(partsQuery, baseParams);

    const sectionsQuery = `
        WITH LatestSectionLogs AS (
            SELECT
                lg.mpsd_id AS MpsdId,
                lg.side AS Side,
                lg.qty AS Qty,
                ROW_NUMBER() OVER (
                    PARTITION BY lg.mpsd_id, lg.side
                    ORDER BY lg.created_at DESC, lg.log_id DESC
                ) AS rn
            FROM dsc_wip_logs lg
            INNER JOIN dsc_model_part_section_details mpsd
                ON mpsd.mpsd_id = lg.mpsd_id
            INNER JOIN dsc_model_part_details mpd
                ON mpd.mpd_id = mpsd.mpd_id
            WHERE mpd.mdl_id = @modelId
                AND lg.sft_id = @shiftId
                AND CAST(lg.created_at AS DATE) = @targetDate
        )
        SELECT
            mpsd.mpsd_id AS MpsdId,
            mpd.mpd_id AS MpdId,
            prt.prt_code AS PartCode,
            prt.prt_name AS PartName,
            sec.sec_code AS SectionCode,
            sec.sec_name AS SectionName,
            mpsd.sequence AS Sequence,
            ISNULL(MAX(CASE WHEN lsl.Side = 'R' THEN lsl.Qty END), 0) AS CurrentR,
            ISNULL(MAX(CASE WHEN lsl.Side = 'L' THEN lsl.Qty END), 0) AS CurrentL
        FROM dsc_model_part_section_details mpsd
        INNER JOIN dsc_model_part_details mpd
            ON mpd.mpd_id = mpsd.mpd_id
        INNER JOIN dsc_parts prt
            ON prt.prt_id = mpd.prt_id
        INNER JOIN dsc_sections sec
            ON sec.sec_id = mpsd.sec_id
        LEFT JOIN LatestSectionLogs lsl
            ON lsl.MpsdId = mpsd.mpsd_id
            AND lsl.rn = 1
        WHERE mpd.mdl_id = @modelId
        GROUP BY
            mpsd.mpsd_id,
            mpd.mpd_id,
            prt.prt_code,
            prt.prt_name,
            sec.sec_code,
            sec.sec_name,
            mpsd.sequence
        ORDER BY
            prt.prt_code ASC,
            mpsd.sequence ASC
    `;

    const sections = await db.query(sectionsQuery, baseParams);

    const monthlyPlanQuery = `
        WITH CalendarDays AS (
            SELECT CAST(@monthStart AS DATE) AS SummaryDate
            UNION ALL
            SELECT DATEADD(DAY, 1, SummaryDate)
            FROM CalendarDays
            WHERE SummaryDate < CAST(@monthEnd AS DATE)
        ),
        DailyPlan AS (
            SELECT
                CAST(wpl.created_at AS DATE) AS SummaryDate,
                ISNULL(MAX(CASE WHEN wpl.side = 'R' THEN wpl.planned_qty END), 0) AS QtyR,
                ISNULL(MAX(CASE WHEN wpl.side = 'L' THEN wpl.planned_qty END), 0) AS QtyL
            FROM dsc_wip_plannings wpl
            INNER JOIN dsc_model_part_details mpd
                ON mpd.mpd_id = wpl.mpd_id
            WHERE mpd.mdl_id = @modelId
                AND wpl.sft_id = @shiftId
                AND CAST(wpl.created_at AS DATE) BETWEEN @monthStart AND @monthEnd
            GROUP BY CAST(wpl.created_at AS DATE)
        )
        SELECT
            cal.SummaryDate AS SummaryDate,
            ISNULL(dp.QtyR, 0) AS QtyR,
            ISNULL(dp.QtyL, 0) AS QtyL
        FROM CalendarDays cal
        LEFT JOIN DailyPlan dp
            ON dp.SummaryDate = cal.SummaryDate
        ORDER BY cal.SummaryDate ASC
        OPTION (MAXRECURSION 31)
    `;

    const monthlyActualQuery = `
        WITH CalendarDays AS (
            SELECT CAST(@monthStart AS DATE) AS SummaryDate
            UNION ALL
            SELECT DATEADD(DAY, 1, SummaryDate)
            FROM CalendarDays
            WHERE SummaryDate < CAST(@monthEnd AS DATE)
        ),
        PartBase AS (
            SELECT
                mpd.mpd_id AS MpdId,
                prt.prt_code AS PartCode,
                prt.prt_name AS PartName,
                MIN(ISNULL(mpsd.sequence, 99999)) AS DisplaySequence
            FROM dsc_model_part_details mpd
            INNER JOIN dsc_parts prt
                ON prt.prt_id = mpd.prt_id
            LEFT JOIN dsc_model_part_section_details mpsd
                ON mpsd.mpd_id = mpd.mpd_id
            WHERE mpd.mdl_id = @modelId
            GROUP BY mpd.mpd_id, prt.prt_code, prt.prt_name
        ),
        LastSeq AS (
            SELECT
                mpsd.mpd_id AS MpdId,
                mpsd.mpsd_id AS MpsdId,
                ROW_NUMBER() OVER (
                    PARTITION BY mpsd.mpd_id
                    ORDER BY mpsd.sequence DESC, mpsd.mpsd_id DESC
                ) AS rn
            FROM dsc_model_part_section_details mpsd
            INNER JOIN dsc_model_part_details mpd
                ON mpd.mpd_id = mpsd.mpd_id
            WHERE mpd.mdl_id = @modelId
        ),
        LatestFinishLogs AS (
            SELECT
                CAST(lg.created_at AS DATE) AS SummaryDate,
                ls.MpdId,
                lg.side AS Side,
                lg.qty AS Qty,
                ROW_NUMBER() OVER (
                    PARTITION BY CAST(lg.created_at AS DATE), ls.MpdId, lg.side
                    ORDER BY lg.created_at DESC, lg.log_id DESC
                ) AS rn
            FROM dsc_wip_logs lg
            INNER JOIN LastSeq ls
                ON ls.MpsdId = lg.mpsd_id
                AND ls.rn = 1
            WHERE lg.sft_id = @shiftId
                AND CAST(lg.created_at AS DATE) BETWEEN @monthStart AND @monthEnd
        ),
        DailyActual AS (
            SELECT
                SummaryDate,
                MpdId,
                ISNULL(MAX(CASE WHEN Side = 'R' THEN Qty END), 0) AS QtyR,
                ISNULL(MAX(CASE WHEN Side = 'L' THEN Qty END), 0) AS QtyL
            FROM LatestFinishLogs
            WHERE rn = 1
            GROUP BY SummaryDate, MpdId
        )
        SELECT
            cal.SummaryDate AS SummaryDate,
            pb.MpdId,
            pb.PartCode,
            pb.PartName,
            pb.DisplaySequence,
            ISNULL(da.QtyR, 0) AS QtyR,
            ISNULL(da.QtyL, 0) AS QtyL
        FROM CalendarDays cal
        CROSS JOIN PartBase pb
        LEFT JOIN DailyActual da
            ON da.SummaryDate = cal.SummaryDate
            AND da.MpdId = pb.MpdId
        ORDER BY cal.SummaryDate ASC, pb.DisplaySequence ASC, pb.PartCode ASC
        OPTION (MAXRECURSION 31)
    `;

    const monthlyPlan = await db.query(monthlyPlanQuery, baseParams);
    const monthlyActual = await db.query(monthlyActualQuery, baseParams);
    const planSummary = {
        QtyR: Number(parts[0]?.PlanR || 0),
        QtyL: Number(parts[0]?.PlanL || 0),
        Total: Number(parts[0]?.PlanR || 0) + Number(parts[0]?.PlanL || 0),
    };

    return {
        ModelId: model.ModelId,
        ModelCode: model.ModelCode,
        LineCode: model.LineCode,
        ShiftId: shift.Id,
        ShiftCode: shift.Code,
        ShiftName: shift.Name,
        ShiftStart: shift.StartTime,
        ShiftEnd: shift.EndTime,
        FilterDate: targetDate,
        FilterMonth: targetMonth,
        Parts: parts,
        Sections: sections,
        PlanSummary: planSummary,
        MonthlyPlan: monthlyPlan,
        MonthlyActual: monthlyActual,
    };
};
