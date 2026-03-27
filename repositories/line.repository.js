import db from "../config/db.js";

export const getLines = async () => {
    const result = await db.query("select lne_id as [Id], lne_code as [Code] from dsc_lines;");
    return result;
}