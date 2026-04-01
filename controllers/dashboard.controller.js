import * as dashboardService from "../services/dashboard.service.js";
import { success, error } from "../response/DtoResponse.js";

export const getDashboardModels = async (req, res) => {
    try {
        const result = await dashboardService.getDashboardModels();
        return res.status(200).json(
            success(result, "Dashboard models retrieved successfully")
        );
    } catch (err) {
        console.error("GET DASHBOARD MODELS ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error retrieving dashboard models")
        );
    }
};

export const getDashboardShifts = async (req, res) => {
    try {
        const result = await dashboardService.getDashboardShifts();
        return res.status(200).json(
            success(result, "Dashboard shifts retrieved successfully")
        );
    } catch (err) {
        console.error("GET DASHBOARD SHIFTS ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error retrieving dashboard shifts")
        );
    }
};

export const getDashboardByModel = async (req, res) => {
    try {
        const result = await dashboardService.getDashboardByModel({
            modelId: req.params.modelId,
            shiftId: req.query.shiftId || req.query.ShiftId || null,
            date: req.query.date || req.query.Date || null,
        });
        return res.status(200).json(
            success(result, "Dashboard data retrieved successfully")
        );
    } catch (err) {
        console.error("GET DASHBOARD DATA ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error retrieving dashboard data")
        );
    }
};
