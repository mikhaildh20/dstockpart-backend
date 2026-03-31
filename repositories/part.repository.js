import db from "../config/db.js";

export const getParts = async ({
    keyword = null,
    status = null,
    sort = "prt_code ASC",
    page = 1,
    limit = 10,
    modelDetail = false,
    modelId = null,
}) => {
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    let joinClause = "";
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
        whereClause += " AND (prt.prt_code LIKE @keyword OR prt.prt_name LIKE @keyword)";
        params.push({
            name: "keyword",
            type: db.sql.VarChar(100),
            value: `%${keyword}%`,
        });
    }

    if (status !== null && status !== undefined && status !== "") {
        whereClause += " AND prt.prt_status = @status";
        params.push({
            name: "status",
            type: db.sql.Int,
            value: Number(status),
        });
    }

    if (modelDetail && modelId !== null && modelId !== undefined && modelId !== "") {
        joinClause = `
            LEFT JOIN dsc_model_part_details mpd
                ON prt.prt_id = mpd.prt_id
                AND mpd.mdl_id = @modelId
        `;

        params.push({
            name: "modelId",
            type: db.sql.Int,
            value: Number(modelId),
        });
    }

    let orderBy = "prt.prt_code ASC";

    const sortMap = {
        "prt_code ASC": "prt.prt_code ASC",
        "prt_code DESC": "prt.prt_code DESC",
        "prt_name ASC": "prt.prt_name ASC",
        "prt_name DESC": "prt.prt_name DESC",
    };

    if (sortMap[sort]) {
        orderBy = sortMap[sort];
    }

    const countQuery = `
        SELECT COUNT(1) AS TotalData
        FROM dsc_parts prt
        ${joinClause}
        ${whereClause}
    `;

    const countResult = await db.query(countQuery, params);
    const totalData = countResult[0]?.TotalData || 0;

    const dataQuery = `
        SELECT
            ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS RowNumber,
            prt.prt_id   AS Id,
            prt.prt_code AS Code,
            prt.prt_name AS Name,
            ${modelDetail ? `
            CASE 
                WHEN mpd.mpd_id IS NOT NULL THEN 'Active' 
                ELSE 'Available' 
            END AS Status
            ` : `
            prt.prt_status AS Status
            `}
        FROM dsc_parts prt
        ${joinClause}
        ${whereClause}
        ORDER BY ${orderBy}
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;

    const dataResult = await db.query(dataQuery, params);

    return {
        TotalData: totalData,
        Data: dataResult,
    };
};

export const createParts = async ({code, name}) => {
    if (!code || !name) {
        throw new Error("Code and Name are required");
    }

    const params = [
        {
            name: "code",
            type: db.sql.VarChar(50),
            value: code,
        },
        {
            name: "name",
            type: db.sql.VarChar(100),
            value: name,
        }
    ];

    const query = `
        INSERT INTO dsc_parts (prt_code, prt_name, prt_status)
        OUTPUT INSERTED.prt_id AS Id, INSERTED.prt_code AS Code, INSERTED.prt_name AS Name, INSERTED.prt_status AS Status
        VALUES (@code, @name, 1);
    `;

    const result = await db.query(query, params);
    return result[0];
};

export const getPartById = async (id) => {
    if (!id) {
        throw new Error("Part ID is required");
    }

    const params = [
        {
            name: "id",
            type: db.sql.Int,
            value: Number(id),
        }
    ];

    const query = `
        SELECT prt_code AS Code, prt_name AS Name
        FROM dsc_parts
        WHERE prt_id = @id
    `;

    const result = await db.query(query, params);
    return result[0];
};

export const updatePart = async ({ id, code, name }) => {
    if (!id) {
        throw new Error("Part ID is required");
    }

    if (!code || !name) {
        throw new Error("Code and Name are required");
    }

    const params = [
        {
            name: "id",
            type: db.sql.Int,
            value: Number(id),
        },
        {
            name: "code",
            type: db.sql.VarChar(50),
            value: code,
        },
        {
            name: "name",
            type: db.sql.VarChar(100),
            value: name,
        }
    ];

    const query = `
        UPDATE dsc_parts
        SET prt_code = @code, prt_name = @name, updated_at = GETDATE()
        WHERE prt_id = @id
    `;

    await db.query(query, params);

    return { Id: id, Code: code, Name: name };
}

export const togglePartStatus = async ({id}) => {
    if (!id) {
        throw new Error("Part ID is required");
    }

    const params = [
        {
            name: "id",
            type: db.sql.Int,
            value: Number(id),
        }
    ];

    const query = `
        UPDATE dsc_parts
        SET prt_status = CASE 
        WHEN prt_status = 1 THEN 0
        ELSE 1
        END
        OUTPUT 
        INSERTED.prt_status AS NewStatus
        WHERE prt_id = @id
    `;

    const result = await db.query(query, params);
    
    if (!result.length) {
        throw new Error("Part not found");
    }

    const newStatus = result[0].NewStatus;

    return {
        NewStatus: newStatus,
        Message:
        newStatus === 1
            ? "Part enabled successfully."
            : "Part disabled successfully.",
    };
};

export const assignPartsToModel = async ({ modelId, assignIds = [], unassignIds = [] }) => {
    if (!modelId) {
        throw new Error("Model ID is required");
    }

    const safeAssignIds = assignIds.map(Number).filter(n => !isNaN(n));
    const safeUnassignIds = unassignIds.map(Number).filter(n => !isNaN(n));

    // 🔥 ASSIGN (INSERT, anti duplicate)
    if (safeAssignIds.length > 0) {
        const insertQuery = `
            INSERT INTO dsc_model_part_details (mdl_id, prt_id)
            SELECT @modelId, v.prt_id
            FROM (VALUES ${safeAssignIds.map(id => `(${id})`).join(",")}) AS v(prt_id)
            WHERE NOT EXISTS (
                SELECT 1 FROM dsc_model_part_details d
                WHERE d.mdl_id = @modelId AND d.prt_id = v.prt_id
            )
        `;

        const params = [
            {
                name: "modelId",
                type: db.sql.Int,
                value: Number(modelId),
            },
        ];

        await db.query(insertQuery, params);
    }

    // 🔥 UNASSIGN (DELETE)
    if (safeUnassignIds.length > 0) {
        const deleteQuery = `
            DELETE FROM dsc_model_part_details
            WHERE mdl_id = @modelId
            AND prt_id IN (${safeUnassignIds.join(",")})
        `;

        const params = [
            {
                name: "modelId",
                type: db.sql.Int,
                value: Number(modelId),
            },
        ];

        await db.query(deleteQuery, params);
    }

    return {
        Assigned: safeAssignIds.length,
        Unassigned: safeUnassignIds.length,
    };
};

export const getPartSectionDetails = async ({ id }) => {
    if (!id) {
        throw new Error("Part detail ID is required");
    }

    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
        throw new Error("Part detail ID must be a number");
    }

    const contextParams = [
        {
            name: "id",
            type: db.sql.Int,
            value: numericId,
        },
    ];

    const contextQuery = `
        SELECT TOP 1
            mpd.mpd_id AS MpdId,
            mpd.prt_id AS PartId,
            mpd.mdl_id AS ModelId,
            prt.prt_code AS PartCode,
            prt.prt_name AS PartName,
            mdl.mdl_code AS ModelCode
        FROM dsc_model_part_details mpd
        INNER JOIN dsc_parts prt
            ON prt.prt_id = mpd.prt_id
        LEFT JOIN dsc_models mdl
            ON mdl.mdl_id = mpd.mdl_id
        WHERE mpd.mpd_id = @id OR mpd.prt_id = @id
        ORDER BY
            CASE WHEN mpd.mpd_id = @id THEN 0 ELSE 1 END,
            mpd.mpd_id DESC
    `;

    const contextResult = await db.query(contextQuery, contextParams);
    const context = contextResult[0];

    if (!context) {
        throw new Error("Part is not assigned to any model yet");
    }

    const sectionParams = [
        {
            name: "mpdId",
            type: db.sql.Int,
            value: Number(context.MpdId),
        },
    ];

    const sectionQuery = `
        SELECT
            sec.sec_id AS Id,
            sec.sec_code AS Code,
            sec.sec_name AS Name,
            mpsd.sequence AS Sequence,
            CASE
                WHEN mpsd.mpsd_id IS NOT NULL THEN 'Active'
                ELSE 'Available'
            END AS Status
        FROM dsc_sections sec
        LEFT JOIN dsc_model_part_section_details mpsd
            ON mpsd.sec_id = sec.sec_id
            AND mpsd.mpd_id = @mpdId
        ORDER BY
            CASE WHEN mpsd.sequence IS NULL THEN 1 ELSE 0 END,
            mpsd.sequence ASC,
            sec.sec_code ASC
    `;

    const sections = await db.query(sectionQuery, sectionParams);

    return {
        MpdId: context.MpdId,
        PartId: context.PartId,
        ModelId: context.ModelId,
        PartCode: context.PartCode,
        PartName: context.PartName,
        ModelCode: context.ModelCode,
        Sections: sections,
    };
};

export const savePartSectionDetails = async ({ mpdId, sectionIds = [] }) => {
    if (!mpdId) {
        throw new Error("MPD ID is required");
    }

    const numericMpdId = Number(mpdId);
    if (Number.isNaN(numericMpdId)) {
        throw new Error("MPD ID must be a number");
    }

    const safeSectionIds = [...new Set(
        (Array.isArray(sectionIds) ? sectionIds : [])
            .map((item) => Number(item))
            .filter((item) => !Number.isNaN(item))
    )];

    const existsParams = [
        {
            name: "mpdId",
            type: db.sql.Int,
            value: numericMpdId,
        },
    ];

    const existsQuery = `
        SELECT TOP 1 mpd_id AS MpdId
        FROM dsc_model_part_details
        WHERE mpd_id = @mpdId
    `;

    const mpdExists = await db.query(existsQuery, existsParams);
    if (!mpdExists.length) {
        throw new Error("Model-part detail not found");
    }

    const currentQuery = `
        SELECT
            mpsd_id AS MpsdId,
            sec_id AS SecId,
            sequence AS Sequence
        FROM dsc_model_part_section_details
        WHERE mpd_id = @mpdId
    `;
    const currentRows = await db.query(currentQuery, existsParams);

    const currentSectionIds = currentRows.map((row) => Number(row.SecId));
    const toAssign = safeSectionIds.filter((secId) => !currentSectionIds.includes(secId));
    const toUnassign = currentSectionIds.filter((secId) => !safeSectionIds.includes(secId));

    if (toAssign.length > 0) {
        const assignValues = toAssign
            .map((secId) => `(${numericMpdId}, ${secId}, 0)`)
            .join(",");

        const assignQuery = `
            INSERT INTO dsc_model_part_section_details (mpd_id, sec_id, sequence)
            VALUES ${assignValues}
        `;
        await db.query(assignQuery);
    }

    if (toUnassign.length > 0) {
        const unassignRows = currentRows.filter((row) => toUnassign.includes(Number(row.SecId)));
        const mpsdIds = unassignRows.map((row) => Number(row.MpsdId));

        const refCheckQuery = `
            SELECT
                sec.sec_code AS SectionCode,
                SUM(CASE WHEN wc.wip_id IS NOT NULL THEN 1 ELSE 0 END) AS CurrentRefCount,
                SUM(CASE WHEN wl.log_id IS NOT NULL THEN 1 ELSE 0 END) AS LogRefCount
            FROM dsc_model_part_section_details mpsd
            INNER JOIN dsc_sections sec
                ON sec.sec_id = mpsd.sec_id
            LEFT JOIN dsc_wip_current wc
                ON wc.mpsd_id = mpsd.mpsd_id
            LEFT JOIN dsc_wip_logs wl
                ON wl.mpsd_id = mpsd.mpsd_id
            WHERE mpsd.mpsd_id IN (${mpsdIds.join(",")})
            GROUP BY sec.sec_code
        `;

        const refs = await db.query(refCheckQuery);
        const blocked = refs.filter((row) =>
            Number(row.CurrentRefCount || 0) > 0 || Number(row.LogRefCount || 0) > 0
        );

        if (blocked.length > 0) {
            const blockedCodes = blocked.map((row) => row.SectionCode).join(", ");
            throw new Error(
                `Section cannot be unassigned because it is referenced by WIP data: ${blockedCodes}`
            );
        }

        const unassignQuery = `
            DELETE FROM dsc_model_part_section_details
            WHERE mpd_id = @mpdId
                AND sec_id IN (${toUnassign.join(",")})
        `;
        await db.query(unassignQuery, existsParams);
    }

    if (safeSectionIds.length > 0) {
        for (let index = 0; index < safeSectionIds.length; index += 1) {
            const seqParams = [
                {
                    name: "mpdId",
                    type: db.sql.Int,
                    value: numericMpdId,
                },
                {
                    name: "secId",
                    type: db.sql.Int,
                    value: safeSectionIds[index],
                },
                {
                    name: "sequence",
                    type: db.sql.Int,
                    value: index + 1,
                },
            ];

            const seqQuery = `
                UPDATE dsc_model_part_section_details
                SET sequence = @sequence
                WHERE mpd_id = @mpdId
                    AND sec_id = @secId
            `;
            await db.query(seqQuery, seqParams);
        }
    }

    return {
        MpdId: numericMpdId,
        TotalAssigned: safeSectionIds.length,
        Assigned: toAssign.length,
        Unassigned: toUnassign.length,
    };
};
