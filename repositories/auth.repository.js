import db from "../config/db.js";

export const findUserByUsername = async (username) => {
    const result = await db.query(
        `SELECT 
            usr_id,
            usr_username,
            usr_fullname,
            usr_password,
            usr_positions,
            sec_id,
            created_at
        FROM dsc_users
        WHERE usr_username = @username`,
        [
            {
                name: "username",
                type: db.sql.VarChar(30),
                value: username,
            },
        ]
    );

    return result[0];
};
