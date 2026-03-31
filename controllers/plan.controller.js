import * as planService from "../services/plan.service.js";
import { success, error } from "../response/DtoResponse.js";
import { publishDashboardUpdate } from "../realtime/publisher.js";

export const getPlans = async (req, res) => {
    try {
        const result = await planService.getPlans({
            keyword: req.query.Search || req.query.keyword || "",
            planDate: req.query.PlanDate || req.query.planDate || "",
            modelSummary:
                req.query.modelSummary === "true" ||
                req.query.ModelSummary === "true",
            sort: req.query.Urut || req.query.sort || "created_at DESC",
            page: Number(req.query.PageNumber || req.query.page || 1),
            limit: Number(req.query.PageSize || req.query.limit || 10),
        });

        return res.status(200).json(
            success(result, "Plans retrieved successfully")
        );
    } catch (err) {
        console.error("GET PLANS ERROR:", err);

        return res.status(500).json(
            error(err.message || "Error retrieving plans")
        );
    }
};

export const getCurrentShift = async (req, res) => {
    try {
        const result = await planService.getCurrentShift();

        return res.status(200).json(
            success(result, "Current shift retrieved successfully")
        );
    } catch (err) {
        console.error("GET CURRENT SHIFT ERROR:", err);

        return res.status(500).json(
            error(err.message || "Error retrieving current shift")
        );
    }
};

export const getPlanModels = async (req, res) => {
    try {
        const result = await planService.getPlanModels();

        return res.status(200).json(
            success(result, "Plan models retrieved successfully")
        );
    } catch (err) {
        console.error("GET PLAN MODELS ERROR:", err);

        return res.status(500).json(
            error(err.message || "Error retrieving models")
        );
    }
};

export const getPartsByModel = async (req, res) => {
    try {
        const result = await planService.getPartsByModel({
            modelId: req.params.modelId,
        });

        return res.status(200).json(
            success(result, "Parts by model retrieved successfully")
        );
    } catch (err) {
        console.error("GET PARTS BY MODEL ERROR:", err);

        return res.status(500).json(
            error(err.message || "Error retrieving parts by model")
        );
    }
};

export const getPlanById = async (req, res) => {
    try {
        const result = await planService.getPlanById({
            id: req.params.id,
        });

        return res.status(200).json(
            success(result, "Plan retrieved successfully")
        );
    } catch (err) {
        console.error("GET PLAN BY ID ERROR:", err);

        return res.status(500).json(
            error(err.message || "Error retrieving plan")
        );
    }
};

export const createPlan = async (req, res) => {
    try {
        const actorFullname = req.user?.fullname || req.body.createdBy || req.body.CreatedBy || "system";

        const result = await planService.createPlan({
            mpdId: req.body.mpdId || req.body.MpdId,
            shiftId: req.body.shiftId || req.body.ShiftId,
            qtyR: req.body.qtyR ?? req.body.QtyR,
            qtyL: req.body.qtyL ?? req.body.QtyL,
            reason: req.body.reason || req.body.Reason || null,
            createdBy: actorFullname,
            items: req.body.items || req.body.Items || [],
        });
        publishDashboardUpdate({ source: "plan:create" });

        return res.status(201).json(
            success(result, "Plan created successfully")
        );
    } catch (err) {
        console.error("CREATE PLAN ERROR:", err);

        const message = err.message || "Error creating plan";
        const statusCode = message.includes("already been created today") ? 400 : 500;

        return res.status(statusCode).json(
            error(message)
        );
    }
};

export const updatePlan = async (req, res) => {
    try {
        const actorFullname = req.user?.fullname || req.body.createdBy || req.body.CreatedBy || "system";

        const result = await planService.updatePlan({
            id: req.body.id,
            mpdId: req.body.mpdId || req.body.MpdId,
            shiftId: req.body.shiftId || req.body.ShiftId,
            qtyR: req.body.qtyR ?? req.body.QtyR,
            qtyL: req.body.qtyL ?? req.body.QtyL,
            reason: req.body.reason || req.body.Reason || null,
            items: req.body.items || req.body.Items || [],
            createdBy: actorFullname,
        });
        publishDashboardUpdate({ source: "plan:update" });

        return res.status(200).json(
            success(result, "Plan updated successfully")
        );
    } catch (err) {
        console.error("UPDATE PLAN ERROR:", err);

        const message = err.message || "Error updating plan";
        const statusCode = (message.includes("required") || message.includes("can no longer be edited")) ? 400 : 500;

        return res.status(statusCode).json(
            error(message)
        );
    }
};
