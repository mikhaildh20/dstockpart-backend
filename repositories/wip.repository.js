import db from "../config/db.js";

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
    if (current.length > 0) return current[0];

    const fallback = await db.query(`
        SELECT TOP 1
            sft_id AS Id,
            sft_code AS Code,
            sft_name AS Name,
            CONVERT(VARCHAR(5), CAST(sft_start AS TIME), 108) AS StartTime,
            CONVERT(VARCHAR(5), CAST(sft_end AS TIME), 108) AS EndTime
        FROM dsc_shifts
        ORDER BY sft_id ASC
    `);

    return fallback[0] || null;
};

export const getWipModels = async ({
    keyword = null,
    sort = "mdl_code ASC",
    page = 1,
    limit = 10,
}) => {
    const offset = (page - 1) * limit;
    const currentShift = await getCurrentShift();

    if (!currentShift?.Id) {
        return { TotalData: 0, Data: [] };
    }

    let whereClause = "WHERE 1=1";
    const params = [
        { name: "shiftId", type: db.sql.Int, value: Number(currentShift.Id) },
        { name: "offset", type: db.sql.Int, value: offset },
        { name: "limit", type: db.sql.Int, value: limit },
    ];

    if (keyword) {
        whereClause += `
            AND (
                mdl.mdl_code LIKE @keyword
                OR latest.LastInputBy LIKE @keyword
            )
        `;
        params.push({
            name: "keyword",
            type: db.sql.VarChar(100),
            value: `%${keyword}%`,
        });
    }

    const sortMap = {
        "mdl_code ASC": "mdl.mdl_code ASC",
        "mdl_code DESC": "mdl.mdl_code DESC",
        "updated_at DESC": "latest.LastInputAt DESC",
        "updated_at ASC": "latest.LastInputAt ASC",
    };
    const orderBy = sortMap[sort] || sortMap["mdl_code ASC"];

    const countQuery = `
        SELECT COUNT(1) AS TotalData
        FROM (
            SELECT mdl.mdl_id
            FROM dsc_models mdl
            INNER JOIN dsc_model_part_details mpd
                ON mpd.mdl_id = mdl.mdl_id
            OUTER APPLY (
                SELECT TOP 1
                    lg.created_by AS LastInputBy,
                    lg.created_at AS LastInputAt
                FROM dsc_wip_logs lg
                INNER JOIN dsc_model_part_section_details mpsd
                    ON mpsd.mpsd_id = lg.mpsd_id
                INNER JOIN dsc_model_part_details mpd2
                    ON mpd2.mpd_id = mpsd.mpd_id
                WHERE mpd2.mdl_id = mdl.mdl_id
                    AND lg.sft_id = @shiftId
                ORDER BY lg.created_at DESC
            ) latest
            ${whereClause}
            GROUP BY mdl.mdl_id
        ) x
    `;

    const countResult = await db.query(countQuery, params);
    const totalData = countResult[0]?.TotalData || 0;

    const dataQuery = `
        SELECT
            ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS RowNumber,
            mdl.mdl_id AS Id,
            mdl.mdl_code AS ModelCode,
            @shiftId AS ShiftId,
            '${currentShift.Code}' AS ShiftCode,
            '${currentShift.Name}' AS ShiftName,
            ISNULL(SUM(CASE WHEN cur.side = 'R' THEN cur.qty ELSE 0 END), 0) AS TotalQtyR,
            ISNULL(SUM(CASE WHEN cur.side = 'L' THEN cur.qty ELSE 0 END), 0) AS TotalQtyL,
            latest.LastInputBy,
            latest.LastInputAt
        FROM dsc_models mdl
        INNER JOIN dsc_model_part_details mpd
            ON mpd.mdl_id = mdl.mdl_id
        LEFT JOIN dsc_model_part_section_details mpsd
            ON mpsd.mpd_id = mpd.mpd_id
        LEFT JOIN dsc_wip_current cur
            ON cur.mpsd_id = mpsd.mpsd_id
            AND cur.sft_id = @shiftId
        OUTER APPLY (
            SELECT TOP 1
                lg.created_by AS LastInputBy,
                lg.created_at AS LastInputAt
            FROM dsc_wip_logs lg
            INNER JOIN dsc_model_part_section_details mpsd2
                ON mpsd2.mpsd_id = lg.mpsd_id
            INNER JOIN dsc_model_part_details mpd2
                ON mpd2.mpd_id = mpsd2.mpd_id
            WHERE mpd2.mdl_id = mdl.mdl_id
                AND lg.sft_id = @shiftId
            ORDER BY lg.created_at DESC
        ) latest
        ${whereClause}
        GROUP BY
            mdl.mdl_id,
            mdl.mdl_code,
            latest.LastInputBy,
            latest.LastInputAt
        ORDER BY ${orderBy}
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const data = await db.query(dataQuery, params);
    return { TotalData: totalData, Data: data };
};

export const getWipModelDetail = async ({ modelId }) => {
    if (!modelId) throw new Error("Model ID is required");

    const currentShift = await getCurrentShift();
    if (!currentShift?.Id) throw new Error("Current shift is not available");

    const params = [
        { name: "modelId", type: db.sql.Int, value: Number(modelId) },
        { name: "shiftId", type: db.sql.Int, value: Number(currentShift.Id) },
    ];

    const modelResult = await db.query(
        `
        SELECT TOP 1
            mdl_id AS Id,
            mdl_code AS Code
        FROM dsc_models
        WHERE mdl_id = @modelId
    `,
        [{ name: "modelId", type: db.sql.Int, value: Number(modelId) }]
    );
    const model = modelResult[0];
    if (!model) throw new Error("Model not found");

    const details = await db.query(
        `
        SELECT
            mpsd.mpsd_id AS MpsdId,
            mpsd.mpd_id AS MpdId,
            prt.prt_code AS PartCode,
            prt.prt_name AS PartName,
            sec.sec_code AS SectionCode,
            sec.sec_name AS SectionName,
            mpsd.sequence AS Sequence,
            ISNULL(MAX(CASE WHEN cur.side = 'R' THEN cur.qty END), 0) AS QtyR,
            ISNULL(MAX(CASE WHEN cur.side = 'L' THEN cur.qty END), 0) AS QtyL
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
            mpsd.mpd_id,
            prt.prt_code,
            prt.prt_name,
            sec.sec_code,
            sec.sec_name,
            mpsd.sequence
        ORDER BY
            prt.prt_code ASC,
            mpsd.sequence ASC
    `,
        params
    );

    return {
        ModelId: model.Id,
        ModelCode: model.Code,
        ShiftId: currentShift.Id,
        ShiftCode: currentShift.Code,
        ShiftName: currentShift.Name,
        ShiftStart: currentShift.StartTime,
        ShiftEnd: currentShift.EndTime,
        CanInput: true,
        Sections: details,
    };
};

export const saveWipCurrent = async ({
    shiftId,
    items = [],
    updatedBy = "system",
}) => {
    if (!shiftId) throw new Error("Shift ID is required");
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("At least one current stock row is required");
    }

    const normalized = items
        .map((item) => ({
            mpsdId: Number(item.mpsdId),
            qtyR: Number(item.qtyR ?? 0),
            qtyL: Number(item.qtyL ?? 0),
        }))
        .filter((item) => !Number.isNaN(item.mpsdId));

    const activeShift = await getCurrentShift();
    if (!activeShift?.Id || Number(activeShift.Id) !== Number(shiftId)) {
        throw new Error("Current stock can no longer be submitted because the shift time has passed.");
    }

    for (const item of normalized) {
        const params = [
            { name: "mpsdId", type: db.sql.Int, value: item.mpsdId },
            { name: "shiftId", type: db.sql.Int, value: Number(shiftId) },
            { name: "qtyR", type: db.sql.Int, value: item.qtyR },
            { name: "qtyL", type: db.sql.Int, value: item.qtyL },
            { name: "updatedBy", type: db.sql.VarChar(100), value: updatedBy || "system" },
        ];

        const query = `
            UPDATE dsc_wip_current
            SET qty = @qtyR, updated_at = GETDATE(), updated_by = @updatedBy
            WHERE mpsd_id = @mpsdId AND sft_id = @shiftId AND side = 'R';
            IF @@ROWCOUNT = 0
            BEGIN
                INSERT INTO dsc_wip_current (mpsd_id, sft_id, side, qty, updated_by)
                VALUES (@mpsdId, @shiftId, 'R', @qtyR, @updatedBy);
            END

            UPDATE dsc_wip_current
            SET qty = @qtyL, updated_at = GETDATE(), updated_by = @updatedBy
            WHERE mpsd_id = @mpsdId AND sft_id = @shiftId AND side = 'L';
            IF @@ROWCOUNT = 0
            BEGIN
                INSERT INTO dsc_wip_current (mpsd_id, sft_id, side, qty, updated_by)
                VALUES (@mpsdId, @shiftId, 'L', @qtyL, @updatedBy);
            END

            INSERT INTO dsc_wip_logs (mpsd_id, sft_id, side, qty, created_by)
            VALUES (@mpsdId, @shiftId, 'R', @qtyR, @updatedBy);

            INSERT INTO dsc_wip_logs (mpsd_id, sft_id, side, qty, created_by)
            VALUES (@mpsdId, @shiftId, 'L', @qtyL, @updatedBy);
        `;

        await db.query(query, params);
    }

    return {
        ShiftId: Number(shiftId),
        TotalUpdated: normalized.length,
    };
};

export const getWipLogs = async ({ modelId, date = null }) => {
    if (!modelId) throw new Error("Model ID is required");

    let whereClause = "WHERE mpd.mdl_id = @modelId";
    const params = [
        { name: "modelId", type: db.sql.Int, value: Number(modelId) },
    ];

    if (date) {
        whereClause += " AND CAST(lg.created_at AS DATE) = CONVERT(DATE, @date)";
        params.push({
            name: "date",
            type: db.sql.VarChar(10),
            value: date,
        });
    }

    const query = `
        SELECT
            lg.log_id AS Id,
            prt.prt_code AS PartCode,
            sec.sec_code AS SectionCode,
            sec.sec_name AS SectionName,
            lg.side AS Side,
            lg.qty AS Qty,
            lg.created_at AS CreatedAt,
            lg.created_by AS CreatedBy,
            sft.sft_code AS ShiftCode
        FROM dsc_wip_logs lg
        INNER JOIN dsc_model_part_section_details mpsd
            ON mpsd.mpsd_id = lg.mpsd_id
        INNER JOIN dsc_model_part_details mpd
            ON mpd.mpd_id = mpsd.mpd_id
        INNER JOIN dsc_parts prt
            ON prt.prt_id = mpd.prt_id
        INNER JOIN dsc_sections sec
            ON sec.sec_id = mpsd.sec_id
        INNER JOIN dsc_shifts sft
            ON sft.sft_id = lg.sft_id
        ${whereClause}
        ORDER BY lg.created_at DESC
    `;

    return db.query(query, params);
};
