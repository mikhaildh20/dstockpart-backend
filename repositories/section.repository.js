import db from "../config/db.js";

export const getSections = async () => {
    const result = await db.query("select sec_id as [Id], sec_code as [Code], sec_name as [Name] from dsc_sections;");
    return result;
}