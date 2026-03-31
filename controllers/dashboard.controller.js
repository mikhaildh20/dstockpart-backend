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

export const getDashboardByModel = async (req, res) => {
    try {
        const result = await dashboardService.getDashboardByModel({
            modelId: req.params.modelId,
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
