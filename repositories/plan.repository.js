import db from "../config/db.js";

const isShiftPassedForDate = async ({ shiftId, planDate }) => {
    const params = [
        {
            name: "shiftId",
            type: db.sql.Int,
            value: Number(shiftId),
        },
        {
            name: "planDate",
            type: db.sql.Date,
            value: planDate,
        },
    ];

    const query = `
        SELECT
            CASE
                WHEN GETDATE() > CASE
                    WHEN CAST(sft_end AS TIME) > CAST(sft_start AS TIME)
                        THEN DATEADD(
                            SECOND,
                            DATEDIFF(SECOND, CAST('00:00:00' AS TIME), CAST(sft_end AS TIME)),
                            CAST(@planDate AS DATETIME)
                        )
                    ELSE DATEADD(
                        DAY,
                        1,
                        DATEADD(
                            SECOND,
                            DATEDIFF(SECOND, CAST('00:00:00' AS TIME), CAST(sft_end AS TIME)),
                            CAST(@planDate AS DATETIME)
                        )
                    )
                END
                THEN 1
                ELSE 0
            END AS IsPassed
        FROM dsc_shifts
        WHERE sft_id = @shiftId
    `;

    const result = await db.query(query, params);
    return result[0]?.IsPassed === 1;
};

export const getCurrentShift = async () => {
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

    const current = await db.query(query);
    if (current.length > 0) {
        return current[0];
    }

    const fallbackQuery = `
        SELECT TOP 1
            sft_id AS Id,
            sft_code AS Code,
            sft_name AS Name,
            CONVERT(VARCHAR(5), CAST(sft_start AS TIME), 108) AS StartTime,
            CONVERT(VARCHAR(5), CAST(sft_end AS TIME), 108) AS EndTime
        FROM dsc_shifts
        ORDER BY sft_id ASC
    `;

    const fallback = await db.query(fallbackQuery);
    return fallback[0] || null;
};

export const getPlanModels = async () => {
    const query = `
        SELECT
            mdl_id AS Id,
            mdl_code AS Code
        FROM dsc_models
        WHERE mdl_status = 1
        ORDER BY mdl_code ASC
    `;

    return db.query(query);
};

export const getPartsByModel = async ({ modelId }) => {
    if (!modelId) {
        throw new Error("Model ID is required");
    }

    const params = [
        {
            name: "modelId",
            type: db.sql.Int,
            value: Number(modelId),
        },
    ];

    const query = `
        SELECT
            mpd.mpd_id AS MpdId,
            prt.prt_id AS PartId,
            prt.prt_code AS PartCode,
            prt.prt_name AS PartName
        FROM dsc_model_part_details mpd
        INNER JOIN dsc_parts prt
            ON prt.prt_id = mpd.prt_id
        WHERE mpd.mdl_id = @modelId
            AND prt.prt_status = 1
        ORDER BY prt.prt_code ASC
    `;

    return db.query(query, params);
};

export const getPlans = async ({
    keyword = null,
    planDate = null,
    modelSummary = false,
    sort = "created_at DESC",
    page = 1,
    limit = 10,
}) => {
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params = [
        {
            name: "offset",
            type: db.sql.Int,
            value: offset,
        },
        {
            name: "limit",
            type: db.sql.Int,
            value: limit,
        },
    ];

    if (keyword) {
        whereClause += `
            AND (
                mdl.mdl_code LIKE @keyword
                OR prt.prt_code LIKE @keyword
                OR prt.prt_name LIKE @keyword
                OR sft.sft_code LIKE @keyword
                OR sft.sft_name LIKE @keyword
            )
        `;
        params.push({
            name: "keyword",
            type: db.sql.VarChar(100),
            value: `%${keyword}%`,
        });
    }

    if (planDate) {
        whereClause += " AND CAST(wpl.created_at AS DATE) = CONVERT(DATE, @planDate)";
        params.push({
            name: "planDate",
            type: db.sql.VarChar(10),
            value: planDate,
        });
    }

    if (modelSummary) {
        const sortMapSummary = {
            "created_at DESC": "MAX(wpl.created_at) DESC",
            "created_at ASC": "MAX(wpl.created_at) ASC",
            "model ASC": "mdl.mdl_code ASC",
            "model DESC": "mdl.mdl_code DESC",
            "shift ASC": "sft.sft_code ASC",
            "shift DESC": "sft.sft_code DESC",
        };
        const orderBySummary = sortMapSummary[sort] || sortMapSummary["created_at DESC"];

        const countQuerySummary = `
            SELECT COUNT(1) AS TotalData
            FROM (
                SELECT
                    mdl.mdl_id,
                    wpl.sft_id,
                    CAST(MAX(wpl.created_at) AS DATE) AS PlanDate
                FROM dsc_wip_plannings wpl
                INNER JOIN dsc_model_part_details mpd
                    ON mpd.mpd_id = wpl.mpd_id
                INNER JOIN dsc_models mdl
                    ON mdl.mdl_id = mpd.mdl_id
                INNER JOIN dsc_parts prt
                    ON prt.prt_id = mpd.prt_id
                INNER JOIN dsc_shifts sft
                    ON sft.sft_id = wpl.sft_id
                ${whereClause}
                GROUP BY mdl.mdl_id, wpl.sft_id
            ) grouped
        `;

        const countResultSummary = await db.query(countQuerySummary, params);
        const totalDataSummary = countResultSummary[0]?.TotalData || 0;

        const dataQuerySummary = `
            SELECT
                ROW_NUMBER() OVER (ORDER BY ${orderBySummary}) AS RowNumber,
                MIN(wpl.wpl_id) AS Id,
                MIN(wpl.mpd_id) AS MpdId,
                wpl.sft_id AS ShiftId,
                mdl.mdl_id AS ModelId,
                mdl.mdl_code AS ModelCode,
                sft.sft_code AS ShiftCode,
                sft.sft_name AS ShiftName,
                SUM(CASE WHEN wpl.side = 'R' THEN wpl.planned_qty ELSE 0 END) AS QtyR,
                SUM(CASE WHEN wpl.side = 'L' THEN wpl.planned_qty ELSE 0 END) AS QtyL,
                CAST(MAX(wpl.created_at) AS DATE) AS PlanDate,
                MAX(wpl.created_at) AS CreatedAt
            FROM dsc_wip_plannings wpl
            INNER JOIN dsc_model_part_details mpd
                ON mpd.mpd_id = wpl.mpd_id
            INNER JOIN dsc_models mdl
                ON mdl.mdl_id = mpd.mdl_id
            INNER JOIN dsc_parts prt
                ON prt.prt_id = mpd.prt_id
            INNER JOIN dsc_shifts sft
                ON sft.sft_id = wpl.sft_id
            ${whereClause}
            GROUP BY
                wpl.sft_id,
                mdl.mdl_id,
                mdl.mdl_code,
                sft.sft_code,
                sft.sft_name
            ORDER BY ${orderBySummary}
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `;

        const dataSummary = await db.query(dataQuerySummary, params);

        return {
            TotalData: totalDataSummary,
            Data: dataSummary,
        };
    }

    const sortMap = {
        "created_at DESC": "MAX(wpl.created_at) DESC",
        "created_at ASC": "MAX(wpl.created_at) ASC",
        "model ASC": "mdl.mdl_code ASC",
        "model DESC": "mdl.mdl_code DESC",
        "part ASC": "prt.prt_code ASC",
        "part DESC": "prt.prt_code DESC",
        "shift ASC": "sft.sft_code ASC",
        "shift DESC": "sft.sft_code DESC",
    };

    const orderBy = sortMap[sort] || sortMap["created_at DESC"];

    const countQuery = `
        SELECT COUNT(1) AS TotalData
        FROM (
            SELECT
                wpl.mpd_id,
                wpl.sft_id
            FROM dsc_wip_plannings wpl
            INNER JOIN dsc_model_part_details mpd
                ON mpd.mpd_id = wpl.mpd_id
            INNER JOIN dsc_models mdl
                ON mdl.mdl_id = mpd.mdl_id
            INNER JOIN dsc_parts prt
                ON prt.prt_id = mpd.prt_id
            INNER JOIN dsc_shifts sft
                ON sft.sft_id = wpl.sft_id
            ${whereClause}
            GROUP BY wpl.mpd_id, wpl.sft_id
        ) grouped
    `;

    const countResult = await db.query(countQuery, params);
    const totalData = countResult[0]?.TotalData || 0;

    const dataQuery = `
        SELECT
            ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS RowNumber,
            MIN(wpl.wpl_id) AS Id,
            wpl.mpd_id AS MpdId,
            wpl.sft_id AS ShiftId,
            mdl.mdl_id AS ModelId,
            mdl.mdl_code AS ModelCode,
            prt.prt_id AS PartId,
            prt.prt_code AS PartCode,
            prt.prt_name AS PartName,
            sft.sft_code AS ShiftCode,
            sft.sft_name AS ShiftName,
            ISNULL(MAX(CASE WHEN wpl.side = 'R' THEN wpl.planned_qty END), 0) AS QtyR,
            ISNULL(MAX(CASE WHEN wpl.side = 'L' THEN wpl.planned_qty END), 0) AS QtyL,
            COALESCE(
                MAX(CASE WHEN wpl.side = 'R' THEN wpl.reason END),
                MAX(CASE WHEN wpl.side = 'L' THEN wpl.reason END),
                ''
            ) AS Reason,
            MAX(wpl.created_at) AS CreatedAt
        FROM dsc_wip_plannings wpl
        INNER JOIN dsc_model_part_details mpd
            ON mpd.mpd_id = wpl.mpd_id
        INNER JOIN dsc_models mdl
            ON mdl.mdl_id = mpd.mdl_id
        INNER JOIN dsc_parts prt
            ON prt.prt_id = mpd.prt_id
        INNER JOIN dsc_shifts sft
            ON sft.sft_id = wpl.sft_id
        ${whereClause}
        GROUP BY
            wpl.mpd_id,
            wpl.sft_id,
            mdl.mdl_id,
            mdl.mdl_code,
            prt.prt_id,
            prt.prt_code,
            prt.prt_name,
            sft.sft_code,
            sft.sft_name
        ORDER BY ${orderBy}
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const dataResult = await db.query(dataQuery, params);

    return {
        TotalData: totalData,
        Data: dataResult,
    };
};

export const getPlanById = async ({ id }) => {
    if (!id) {
        throw new Error("Plan ID is required");
    }

    const idParams = [
        {
            name: "id",
            type: db.sql.Int,
            value: Number(id),
        },
    ];

    const baseQuery = `
        SELECT TOP 1
            wpl_id AS WplId,
            mpd_id AS MpdId,
            sft_id AS ShiftId,
            CAST(created_at AS DATE) AS PlanDate
        FROM dsc_wip_plannings
        WHERE wpl_id = @id
    `;

    const base = await db.query(baseQuery, idParams);
    if (!base.length) {
        throw new Error("Plan not found");
    }

    const metaParams = [
        {
            name: "mpdId",
            type: db.sql.Int,
            value: Number(base[0].MpdId),
        },
        {
            name: "shiftId",
            type: db.sql.Int,
            value: Number(base[0].ShiftId),
        },
    ];

    const metaQuery = `
        SELECT TOP 1
            mdl.mdl_id AS ModelId,
            mdl.mdl_code AS ModelCode,
            sft.sft_id AS ShiftId,
            sft.sft_code AS ShiftCode,
            sft.sft_name AS ShiftName,
            CONVERT(VARCHAR(5), CAST(sft.sft_start AS TIME), 108) AS ShiftStart,
            CONVERT(VARCHAR(5), CAST(sft.sft_end AS TIME), 108) AS ShiftEnd
        FROM dsc_model_part_details mpd
        INNER JOIN dsc_models mdl
            ON mdl.mdl_id = mpd.mdl_id
        INNER JOIN dsc_shifts sft
            ON sft.sft_id = @shiftId
        WHERE mpd.mpd_id = @mpdId
    `;

    const metaResult = await db.query(metaQuery, metaParams);
    const meta = metaResult[0];
    if (!meta) {
        throw new Error("Plan metadata not found");
    }

    const partsParams = [
        {
            name: "modelId",
            type: db.sql.Int,
            value: Number(meta.ModelId),
        },
        {
            name: "shiftId",
            type: db.sql.Int,
            value: Number(base[0].ShiftId),
        },
        {
            name: "planDate",
            type: db.sql.Date,
            value: base[0].PlanDate,
        },
    ];

    const partsQuery = `
        SELECT
            mpd.mpd_id AS MpdId,
            prt.prt_code AS PartCode,
            prt.prt_name AS PartName,
            ISNULL(MAX(CASE WHEN wpl.side = 'R' THEN wpl.planned_qty END), 0) AS QtyR,
            ISNULL(MAX(CASE WHEN wpl.side = 'L' THEN wpl.planned_qty END), 0) AS QtyL,
            COALESCE(
                MAX(CASE WHEN wpl.side = 'R' THEN wpl.reason END),
                MAX(CASE WHEN wpl.side = 'L' THEN wpl.reason END),
                ''
            ) AS Reason
        FROM dsc_model_part_details mpd
        INNER JOIN dsc_parts prt
            ON prt.prt_id = mpd.prt_id
        LEFT JOIN dsc_wip_plannings wpl
            ON wpl.mpd_id = mpd.mpd_id
            AND wpl.sft_id = @shiftId
            AND CAST(wpl.created_at AS DATE) = @planDate
        WHERE mpd.mdl_id = @modelId
        GROUP BY mpd.mpd_id, prt.prt_code, prt.prt_name
        ORDER BY prt.prt_code ASC
    `;

    const parts = await db.query(partsQuery, partsParams);
    const isPassed = await isShiftPassedForDate({
        shiftId: base[0].ShiftId,
        planDate: base[0].PlanDate,
    });

    return {
        Id: Number(id),
        ModelId: meta.ModelId,
        ModelCode: meta.ModelCode,
        ShiftId: meta.ShiftId,
        ShiftCode: meta.ShiftCode,
        ShiftName: meta.ShiftName,
        ShiftStart: meta.ShiftStart,
        ShiftEnd: meta.ShiftEnd,
        PlanDate: base[0].PlanDate,
        CanEdit: !isPassed,
        Parts: parts,
    };
};

const upsertPlanSides = async ({
    mpdId,
    shiftId,
    qtyR,
    qtyL,
    reason,
    createdBy,
}) => {
    const params = [
        {
            name: "mpdId",
            type: db.sql.Int,
            value: Number(mpdId),
        },
        {
            name: "shiftId",
            type: db.sql.Int,
            value: Number(shiftId),
        },
        {
            name: "qtyR",
            type: db.sql.Int,
            value: Number(qtyR),
        },
        {
            name: "qtyL",
            type: db.sql.Int,
            value: Number(qtyL),
        },
        {
            name: "reason",
            type: db.sql.VarChar(100),
            value: reason || null,
        },
        {
            name: "createdBy",
            type: db.sql.VarChar(100),
            value: createdBy || "system",
        },
    ];

    const query = `
        UPDATE dsc_wip_plannings
        SET
            planned_qty = @qtyR,
            reason = @reason,
            created_by = @createdBy,
            updated_at = GETDATE()
        WHERE mpd_id = @mpdId
            AND sft_id = @shiftId
            AND side = 'R';

        IF @@ROWCOUNT = 0
        BEGIN
            INSERT INTO dsc_wip_plannings (mpd_id, sft_id, side, planned_qty, reason, created_by)
            VALUES (@mpdId, @shiftId, 'R', @qtyR, @reason, @createdBy);
        END

        UPDATE dsc_wip_plannings
        SET
            planned_qty = @qtyL,
            reason = @reason,
            created_by = @createdBy,
            updated_at = GETDATE()
        WHERE mpd_id = @mpdId
            AND sft_id = @shiftId
            AND side = 'L';

        IF @@ROWCOUNT = 0
        BEGIN
            INSERT INTO dsc_wip_plannings (mpd_id, sft_id, side, planned_qty, reason, created_by)
            VALUES (@mpdId, @shiftId, 'L', @qtyL, @reason, @createdBy);
        END
    `;

    await db.query(query, params);
};

const normalizeItems = (items = []) => {
    return (Array.isArray(items) ? items : [])
        .map((item) => ({
            mpdId: Number(item.mpdId),
            qtyR: Number(item.qtyR),
            qtyL: Number(item.qtyL),
        }))
        .filter(
            (item) =>
                !Number.isNaN(item.mpdId) &&
                !Number.isNaN(item.qtyR) &&
                !Number.isNaN(item.qtyL)
        );
};

export const createPlan = async ({
    mpdId,
    shiftId,
    qtyR,
    qtyL,
    reason,
    createdBy,
    items = [],
}) => {
    if (!shiftId) {
        throw new Error("Shift ID is required");
    }

    const normalizedItems = normalizeItems(items);
    const bulkItems = normalizedItems.length > 0
        ? normalizedItems
        : [{ mpdId: Number(mpdId), qtyR: Number(qtyR), qtyL: Number(qtyL) }];

    if (bulkItems.length === 0 || bulkItems.some((item) => Number.isNaN(item.mpdId))) {
        throw new Error("At least one valid part plan is required");
    }

    const mpdIds = [...new Set(bulkItems.map((item) => item.mpdId))];
    const duplicateParams = [
        {
            name: "shiftId",
            type: db.sql.Int,
            value: Number(shiftId),
        },
    ];

    const duplicateQuery = `
        SELECT TOP 1 wpl_id AS Id
        FROM dsc_wip_plannings
        WHERE sft_id = @shiftId
            AND mpd_id IN (${mpdIds.join(",")})
            AND CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)
    `;

    const duplicate = await db.query(duplicateQuery, duplicateParams);
    if (duplicate.length > 0) {
        throw new Error("A plan for one or more selected parts and this shift has already been created today.");
    }

    for (const item of bulkItems) {
        await upsertPlanSides({
            mpdId: item.mpdId,
            shiftId,
            qtyR: item.qtyR,
            qtyL: item.qtyL,
            reason,
            createdBy,
        });
    }

    return {
        TotalSaved: bulkItems.length,
        ShiftId: Number(shiftId),
    };
};

export const updatePlan = async ({
    id,
    mpdId,
    shiftId,
    qtyR,
    qtyL,
    reason,
    items = [],
    createdBy,
}) => {
    if (!id) {
        throw new Error("Plan ID is required");
    }

    const oldParams = [
        {
            name: "id",
            type: db.sql.Int,
            value: Number(id),
        },
    ];

    const oldQuery = `
        SELECT TOP 1
            mpd_id AS MpdId,
            sft_id AS ShiftId,
            CAST(created_at AS DATE) AS PlanDate
        FROM dsc_wip_plannings
        WHERE wpl_id = @id
    `;

    const oldResult = await db.query(oldQuery, oldParams);
    if (!oldResult.length) {
        throw new Error("Plan not found");
    }

    const planDate = oldResult[0].PlanDate;
    const isPassed = await isShiftPassedForDate({
        shiftId: Number(oldResult[0].ShiftId),
        planDate,
    });
    if (isPassed) {
        throw new Error("This plan can no longer be edited because the shift time has passed.");
    }

    const normalizedItems = normalizeItems(items);
    const bulkItems = normalizedItems.length > 0
        ? normalizedItems
        : [{ mpdId: Number(mpdId), qtyR: Number(qtyR), qtyL: Number(qtyL) }];

    const targetShiftId = Number(shiftId || oldResult[0].ShiftId);
    if (Number.isNaN(targetShiftId)) {
        throw new Error("Shift ID is required");
    }

    if (bulkItems.length === 0 || bulkItems.some((item) => Number.isNaN(item.mpdId))) {
        throw new Error("At least one valid part plan is required");
    }

    for (const item of bulkItems) {
        await upsertPlanSides({
            mpdId: item.mpdId,
            shiftId: targetShiftId,
            qtyR: item.qtyR,
            qtyL: item.qtyL,
            reason,
            createdBy: createdBy || "system",
        });
    }

    return {
        Id: Number(id),
        ShiftId: targetShiftId,
        TotalSaved: bulkItems.length,
    };
};
