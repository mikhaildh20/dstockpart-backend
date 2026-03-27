import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findUserByUsername } from "../repositories/auth.repository.js";

export const login = async ({ username, password }) => {
  if (!username || !password) {
    throw new Error("Username and password are required.");
  }

  const user = await findUserByUsername(username);

  if (!user) throw new Error("User not found.");

  const match = await bcrypt.compare(password, user.usr_password);
  if (!match) throw new Error("Incorrect password.");

  const token = jwt.sign(
    {
      id: user.usr_id,
      username: user.usr_username,
      fullname: user.usr_fullname,
      role: user.usr_positions,
      secId: user.sec_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user.usr_id,
      username: user.usr_username,
      fullname: user.usr_fullname,
      position: user.usr_positions,
      secId: user.sec_id,
    },
    message: "Login successful",
  };
};

export const getCurrentUser = async (user) => {
  return {
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    position: user.role,
    secId: user.secId,
  };
};
