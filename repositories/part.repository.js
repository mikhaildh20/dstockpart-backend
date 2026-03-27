import db from "../config/db.js";

export const getParts = async () => {
    const result = await db.query("select prt_id as [Id], prt_code as [Code], prt_name as [Name] from dsc_parts;");
    return result;
}