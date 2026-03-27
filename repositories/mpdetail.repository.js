import db from "../config/db.js";

export const getMPDetails = async () => {
    const result = await db.query("select mpd.mpd_id as [Id], mdl.mdl_code as [Model], prt.prt_code as [Part] from dsc_model_part_details mpd join dsc_models mdl on mpd.mdl_id = mdl.mdl_id join dsc_parts prt on mpd.prt_id = prt.prt_id;");
    return result;
}