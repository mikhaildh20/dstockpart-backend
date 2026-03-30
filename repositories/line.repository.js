import db from "../config/db.js";

export const getLines = async ({
    keyword = null,
    status = null,
    sort = "lne_code ASC",
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
        whereClause += " AND lne_code LIKE @keyword";
        params.push({
        name: "keyword",
        type: db.sql.VarChar(100),
        value: `%${keyword}%`,
        });
    }

    if (status !== null && status !== undefined && status !== "") {
        whereClause += " AND lne_status = @status";
        params.push({
        name: "status",
        type: db.sql.Int,
        value: Number(status),
        });
    }

    let orderBy = "lne_code ASC";
    if (sort === "lne_code DESC") orderBy = "lne_code DESC";
    if (sort === "lne_code ASC") orderBy = "lne_code ASC";

    const countQuery = `
        SELECT COUNT(1) AS TotalData
        FROM dsc_lines
        ${whereClause}
    `;

    const countResult = await db.query(countQuery, params);
    const totalData = countResult[0]?.TotalData || 0;

    const dataQuery = `
        SELECT
        ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS RowNumber,
        lne_id   AS Id,
        lne_code AS Code,
        lne_status AS Status
        FROM dsc_lines
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

export const createLine = async ({code}) => {
    if(!code){
        throw new Error("Line code is required");
    }

    const params = [
        {
            name: "code",
            type: db.sql.VarChar(50),
            value: code,
        }
    ];

    const query = `
        INSERT INTO dsc_lines (lne_code, lne_status)
        OUTPUT INSERTED.lne_id AS Id, INSERTED.lne_code AS Code, INSERTED.lne_status AS Status
        VALUES (@code, 1);
    `;

    const result = await db.query(query, params);

    return result[0];
}

export const getLineById = async (id) => {
    if(!id){
        throw new Error("Line ID is required");
    }

    const params = [
        {
            name: "id",
            type: db.sql.Int,
            value: Number(id),
        }
    ];

    const query = `
        SELECT lne_code AS Code
        FROM dsc_lines
        WHERE lne_id = @id
    `;

    const result = await db.query(query, params);

    return result[0];
}

export const updateLine = async ({ id, code }) => {
    if(!id){
        throw new Error("Line ID is required");
    }

    if(!code){
        throw new Error("Line code is required");
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
        }
    ];

    const query = `
        UPDATE dsc_lines
        SET lne_code = @code, updated_at = GETDATE()
        WHERE lne_id = @id
    `;

    await db.query(query, params);

    return { Id: id, Code: code };
}

export const toggleLineStatus = async ({ id }) => {
    if (!id) {
        throw new Error("Id is required");
    }

    const params = [
        {
        name: "id",
        type: db.sql.Int,
        value: id,
        },
    ];

    const query = `
        UPDATE dsc_lines
        SET lne_status = CASE 
        WHEN lne_status = 1 THEN 0
        ELSE 1
        END
        OUTPUT 
        INSERTED.lne_status AS NewStatus
        WHERE lne_id = @id
    `;

    const result = await db.query(query, params);

    if (!result.length) {
        throw new Error("Line not found");
    }

    const newStatus = result[0].NewStatus;

    return {
        NewStatus: newStatus,
        Message:
        newStatus === 1
            ? "Line enabled successfully."
            : "Line disabled successfully.",
    };
};