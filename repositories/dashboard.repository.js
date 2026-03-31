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

export const getDashboardByModel = async ({ modelId }) => {
    if (!modelId) {
        throw new Error("Model ID is required");
    }

    const shift = await getCurrentShift();
    if (!shift?.Id) {
        throw new Error("Current shift is not available");
    }

    const baseParams = [
        { name: "modelId", type: db.sql.Int, value: Number(modelId) },
        { name: "shiftId", type: db.sql.Int, value: Number(shift.Id) },
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
        CurrentAgg AS (
            SELECT
                mpsd.mpd_id AS MpdId,
                ISNULL(SUM(CASE WHEN cur.side = 'R' THEN cur.qty ELSE 0 END), 0) AS CurrentR,
                ISNULL(SUM(CASE WHEN cur.side = 'L' THEN cur.qty ELSE 0 END), 0) AS CurrentL
            FROM dsc_model_part_section_details mpsd
            LEFT JOIN dsc_wip_current cur
                ON cur.mpsd_id = mpsd.mpsd_id
                AND cur.sft_id = @shiftId
            GROUP BY mpsd.mpd_id
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
                ISNULL(MAX(CASE WHEN cur.side = 'R' THEN cur.qty END), 0) AS FinishR,
                ISNULL(MAX(CASE WHEN cur.side = 'L' THEN cur.qty END), 0) AS FinishL
            FROM LastSeq ls
            LEFT JOIN dsc_wip_current cur
                ON cur.mpsd_id = ls.MpsdId
                AND cur.sft_id = @shiftId
            WHERE ls.rn = 1
            GROUP BY ls.MpdId
        ),
        PlanAgg AS (
            SELECT
                wpl.mpd_id AS MpdId,
                ISNULL(MAX(CASE WHEN wpl.side = 'R' THEN wpl.planned_qty END), 0) AS PlanR,
                ISNULL(MAX(CASE WHEN wpl.side = 'L' THEN wpl.planned_qty END), 0) AS PlanL
            FROM dsc_wip_plannings wpl
            WHERE wpl.sft_id = @shiftId
            GROUP BY wpl.mpd_id
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
            ON pa.MpdId = pb.MpdId
        LEFT JOIN CurrentAgg ca
            ON ca.MpdId = pb.MpdId
        LEFT JOIN FinishAgg fa
            ON fa.MpdId = pb.MpdId
        ORDER BY pb.DisplaySequence ASC, pb.PartCode ASC
    `;

    const parts = await db.query(partsQuery, baseParams);

    const sectionsQuery = `
        SELECT
            mpsd.mpsd_id AS MpsdId,
            mpd.mpd_id AS MpdId,
            prt.prt_code AS PartCode,
            prt.prt_name AS PartName,
            sec.sec_code AS SectionCode,
            sec.sec_name AS SectionName,
            mpsd.sequence AS Sequence,
            ISNULL(MAX(CASE WHEN cur.side = 'R' THEN cur.qty END), 0) AS CurrentR,
            ISNULL(MAX(CASE WHEN cur.side = 'L' THEN cur.qty END), 0) AS CurrentL
        FROM dsc_model_part_section_details mpsd
        INNER JOIN dsc_model_part_details mpd
            ON mpd.mpd_id = mpsd.mpd_id
        INNER JOIN dsc_parts prt
            ON prt.prt_id = mpd.prt_id
        INNER JOIN dsc_sections sec
            ON sec.sec_id = mpsd.sec_id
        LEFT JOIN dsc_wip_current cur
            ON cur.mpsd_id = mpsd.mpsd_id
            AND cur.sft_id = @shiftId
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

    return {
        ModelId: model.ModelId,
        ModelCode: model.ModelCode,
        LineCode: model.LineCode,
        ShiftId: shift.Id,
        ShiftCode: shift.Code,
        ShiftName: shift.Name,
        ShiftStart: shift.StartTime,
        ShiftEnd: shift.EndTime,
        Parts: parts,
        Sections: sections,
    };
};
