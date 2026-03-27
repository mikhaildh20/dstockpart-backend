import db from "../config/db.js";

export const getModels = async () => {
    const result = await db.query("select mdl.mdl_id as [Id], lne.lne_code as [Line], mdl.mdl_code as [Code] from dsc_models mdl join dsc_lines lne on mdl.lne_id = lne.lne_id;");
    return result;
}