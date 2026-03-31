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