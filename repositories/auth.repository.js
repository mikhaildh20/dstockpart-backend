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

export const upsertUserCredential = async ({
  username,
  fullname,
  passwordHash,
  position,
  secId,
}) => {
  const result = await db.query(
    `IF EXISTS (SELECT 1 FROM dsc_users WHERE usr_username = @username)
      BEGIN
        UPDATE dsc_users
        SET
          usr_fullname = @fullname,
          usr_password = @passwordHash,
          usr_positions = @position,
          sec_id = @secId
        WHERE usr_username = @username;
      END
    ELSE
      BEGIN
        INSERT INTO dsc_users (
          usr_username,
          usr_fullname,
          usr_password,
          usr_positions,
          sec_id
        )
        VALUES (
          @username,
          @fullname,
          @passwordHash,
          @position,
          @secId
        );
      END

    SELECT
      usr_id,
      usr_username,
      usr_fullname,
      usr_positions,
      sec_id,
      created_at
    FROM dsc_users
    WHERE usr_username = @username;`,
    [
      {
        name: "username",
        type: db.sql.VarChar(30),
        value: username,
      },
      {
        name: "fullname",
        type: db.sql.VarChar(100),
        value: fullname,
      },
      {
        name: "passwordHash",
        type: db.sql.VarChar(db.sql.MAX),
        value: passwordHash,
      },
      {
        name: "position",
        type: db.sql.VarChar(15),
        value: position,
      },
      {
        name: "secId",
        type: db.sql.Int,
        value: secId ?? null,
      },
    ]
  );

  return result[0];
};
