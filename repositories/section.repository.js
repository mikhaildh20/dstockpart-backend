import db from "../config/db.js";

export const getSections = async ({
    keyword = null,
    status = null,
    sort = "sec_code ASC",
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
        whereClause += " AND (sec_code LIKE @keyword OR sec_name LIKE @keyword)";
        params.push({
            name: "keyword",
            type: db.sql.VarChar(100),
            value: `%${keyword}%`,
        });
    }

    if (status !== null && status !== undefined && status !== "") {
        whereClause += " AND sec_status = @status";
        params.push({
            name: "status",
            type: db.sql.Int,
            value: Number(status),
        });
    }

    let orderBy = "sec_code ASC";

    const sortMap = {
        "sec_code ASC": "sec_code ASC",
        "sec_code DESC": "sec_code DESC",
        "sec_name ASC": "sec_name ASC",
        "sec_name DESC": "sec_name DESC",
    };

    if (sortMap[sort]) {
        orderBy = sortMap[sort];
    }

    const countQuery = `
        SELECT COUNT(1) AS TotalData
        FROM dsc_sections
        ${whereClause}
    `;

    const countResult = await db.query(countQuery, params);
    const totalData = countResult[0]?.TotalData || 0;

    const dataQuery = `
        SELECT
            ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS RowNumber,
            sec_id   AS Id,
            sec_code AS Code,
            sec_name AS Name,
            sec_status AS Status
        FROM dsc_sections
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

export const createSections = async ({code, name}) => {
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
        INSERT INTO dsc_sections (sec_code, sec_name, sec_status)
        OUTPUT INSERTED.sec_id AS Id, INSERTED.sec_code AS Code, INSERTED.sec_name AS Name, INSERTED.sec_status AS Status
        VALUES (@code, @name, 1);
    `;

    const result = await db.query(query, params);
    return result[0];
};

export const getSectionById = async (id) => {
    if (!id) {
        throw new Error("Section ID is required");
    }

    const params = [
        {
            name: "id",
            type: db.sql.Int,
            value: Number(id),
        }
    ];

    const query = `
        SELECT sec_code AS Code, sec_name AS Name
        FROM dsc_sections
        WHERE sec_id = @id
    `;

    const result = await db.query(query, params);
    return result[0];
};

export const updateSection = async ({ id, code, name }) => {
    if (!id) {
        throw new Error("Section ID is required");
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
        UPDATE dsc_sections
        SET sec_code = @code, sec_name = @name, updated_at = GETDATE()
        WHERE sec_id = @id
    `;

    await db.query(query, params);

    return { Id: id, Code: code, Name: name };
}

export const toggleSectionStatus = async ({id}) => {
    if (!id) {
        throw new Error("Section ID is required");
    }

    const params = [
        {
            name: "id",
            type: db.sql.Int,
            value: Number(id),
        }
    ];

    const query = `
        UPDATE dsc_sections
        SET sec_status = CASE 
        WHEN sec_status = 1 THEN 0
        ELSE 1
        END
        OUTPUT 
        INSERTED.sec_status AS NewStatus
        WHERE sec_id = @id
    `;

    const result = await db.query(query, params);
    
    if (!result.length) {
        throw new Error("Section not found");
    }

    const newStatus = result[0].NewStatus;

    return {
        NewStatus: newStatus,
        Message:
        newStatus === 1
            ? "Section enabled successfully."
            : "Section disabled successfully.",
    };
};