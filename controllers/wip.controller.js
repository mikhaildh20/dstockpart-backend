import * as wipService from "../services/wip.service.js";
import { success, error } from "../response/DtoResponse.js";
import { publishDashboardUpdate } from "../realtime/publisher.js";

export const getWipModels = async (req, res) => {
    try {
        const result = await wipService.getWipModels({
            keyword: req.query.Search || req.query.keyword || "",
            sort: req.query.Urut || req.query.sort || "mdl_code ASC",
            page: Number(req.query.PageNumber || req.query.page || 1),
            limit: Number(req.query.PageSize || req.query.limit || 10),
        });

        return res.status(200).json(
            success(result, "WIP models retrieved successfully")
        );
    } catch (err) {
        console.error("GET WIP MODELS ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error retrieving WIP models")
        );
    }
};

export const getWipModelDetail = async (req, res) => {
    try {
        const result = await wipService.getWipModelDetail({
            modelId: req.params.modelId,
        });

        return res.status(200).json(
            success(result, "WIP detail retrieved successfully")
        );
    } catch (err) {
        console.error("GET WIP DETAIL ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error retrieving WIP detail")
        );
    }
};

export const saveWipCurrent = async (req, res) => {
    try {
        const actorFullname = req.user?.fullname || "system";
        const result = await wipService.saveWipCurrent({
            shiftId: req.body.shiftId || req.body.ShiftId,
            items: req.body.items || req.body.Items || [],
            updatedBy: actorFullname,
        });
        publishDashboardUpdate({ source: "wip:update" });

        return res.status(200).json(
            success(result, "Current stock updated successfully")
        );
    } catch (err) {
        console.error("SAVE WIP CURRENT ERROR:", err);
        const message = err.message || "Error saving current stock";
        const statusCode = message.includes("can no longer be submitted") ? 400 : 500;
        return res.status(statusCode).json(
            error(message)
        );
    }
};

export const getWipLogs = async (req, res) => {
    try {
        const result = await wipService.getWipLogs({
            modelId: req.params.modelId,
            date: req.query.Date || req.query.date || "",
        });

        return res.status(200).json(
            success(result, "WIP logs retrieved successfully")
        );
    } catch (err) {
        console.error("GET WIP LOGS ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error retrieving WIP logs")
        );
    }
};
