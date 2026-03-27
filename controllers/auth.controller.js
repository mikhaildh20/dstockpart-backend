import * as authService from "../services/auth.service.js";

export const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const me = async (req, res) => {
  try {
    const result = await authService.getCurrentUser(req.user);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
