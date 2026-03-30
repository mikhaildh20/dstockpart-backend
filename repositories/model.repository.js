import db from "../config/db.js";

export const getModels = async ({
    keyword = null,
    status = null,
    sort = "lne_code ASC",
    page = 1,
    limit = 10,
}) => {
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params = [
        { name: "offset", type: db.sql.Int, value: offset },
        { name: "limit", type: db.sql.Int, value: limit },
    ];

    if (keyword) {
        whereClause += " AND (mdl.mdl_code LIKE @keyword OR lne.lne_code LIKE @keyword)";
        params.push({
        name: "keyword",
        type: db.sql.VarChar(100),
        value: `%${keyword}%`,
        });
    }
 
    if (status !== null && status !== undefined && status !== "") {
        whereClause += " AND mdl.mdl_status = @status";
        params.push({
        name: "status",
        type: db.sql.Int,
        value: Number(status),
        });
    }

    let orderBy = "mdl.mdl_code ASC";

    const sortMap = {
        "mdl_code ASC": "mdl.mdl_code ASC",
        "mdl_code DESC": "mdl.mdl_code DESC",
        "lne_code ASC": "lne.lne_code ASC",
        "lne_code DESC": "lne.lne_code DESC",
    };

    if (sortMap[sort]) {
        orderBy = sortMap[sort];
    }

    const countQuery = `
        SELECT COUNT(1) AS TotalData
        FROM dsc_models mdl
        JOIN dsc_lines lne ON mdl.lne_id = lne.lne_id
        ${whereClause}
    `;

    const countResult = await db.query(countQuery, params);
    const totalData = countResult[0]?.TotalData || 0;

    const dataQuery = `
        SELECT
        ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS RowNumber,
        mdl.mdl_id AS Id,
        lne.lne_code AS Line,
        mdl.mdl_code AS Code,
        mdl.mdl_status AS Status
        FROM dsc_models mdl
        LEFT JOIN dsc_lines lne ON mdl.lne_id = lne.lne_id
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

export const createModel = async ({ code }) => {
    if (!code) {
        throw new Error("Model code is required");
    }

    const params = [
        {
            name: "code",
            type: db.sql.VarChar(50),
            value: code,
        }
    ];

    const query = `
        INSERT INTO dsc_models (mdl_code, mdl_status)
        OUTPUT INSERTED.mdl_id AS Id, INSERTED.mdl_code AS Code, INSERTED.mdl_status AS Status
        VALUES (@code, 1);
    `;

    const result = await db.query(query, params);

    return result[0];
}

export const getModelById = async ({ id }) => {
    const params = [
        {
            name: "id",
            type: db.sql.Int,
            value: Number(id),
        }
    ];

    const query = `
        SELECT 
            mdl_code AS Code,
            mdl_status AS Status
        FROM dsc_models
        WHERE mdl_id = @id
    `;

    const result = await db.query(query, params);

    return result[0];
}

export const updateModel = async ({ id, code }) => {
    if(!id){
        throw new Error("Model ID is required");
    }

    if(!code){
        throw new Error("Model code is required");
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
        UPDATE dsc_models
        SET mdl_code = @code
        WHERE mdl_id = @id
    `;

    await db.query(query, params);

    return { Id: id, Code: code };
};

export const toggleModelStatus = async ({ id }) => {
    if(!id){
        throw new Error("Model ID is required");
    }

    const params = [
        {
            name: "id",
            type: db.sql.Int,
            value: id,
        }
    ];

    const query = `
        UPDATE dsc_models
        SET mdl_status = CASE 
        WHEN mdl_status = 1 THEN 0 ELSE 1 
        END 
        OUTPUT
        INSERTED.mdl_status as NewStatus
        WHERE mdl_id = @id
    `;

    const result = await db.query(query, params);

    if(!result){
        throw new Error("Model not found");
    }

    const newStatus = result[0]?.NewStatus;

    return {
        NewStatus: newStatus,
        Message:
        newStatus === 1
            ? "Model enabled successfully."
            : "Model disabled successfully.",
    };
}
