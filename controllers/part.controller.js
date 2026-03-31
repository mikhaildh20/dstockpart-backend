import * as partService from "../services/part.service.js";
import {success, error} from "../response/DtoResponse.js";

export const getParts = async (req, res) => {
    try {
        const result = await partService.getParts({
            keyword: req.query.Search || req.query.keyword || "",
            status: req.query.Status || req.query.status || "",
            sort: req.query.Urut || req.query.sort || "prt_code ASC",
            page: Number(req.query.PageNumber || req.query.page || 1),
            limit: Number(req.query.PageSize || req.query.limit || 10),

            modelDetail:
                req.query.modelDetail === "true" ||
                req.query.ModelDetail === "true",

            modelId: req.query.modelId || req.query.ModelId || null,
        });
        
        return res.status(200).json(
        success(result, "Parts retrieved successfully")
        );
    } catch (err) {
        console.error("GET PARTS ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error retrieving parts")
        );
    }
};

export const createPart = async (req, res) => {
    try{
        const result = await partService.createPart({
            code: req.body.Code || req.body.code,
            name: req.body.Name || req.body.name,
        });
        
        return res.status(201).json(
        success(result, "Part created successfully")
        );
    } catch (err) {
        console.error("CREATE PART ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error creating part")
        );
    }
};

export const getPartById = async (req, res) => {
    try {
        const result = await partService.getPartById({
            id: req.params.id,
        });

        return res.status(200).json(
        success(result, "Part retrieved successfully")
        );
    } catch (err) {
        console.error("GET PART BY ID ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error retrieving part")
        );
    }
};

export const updatePart = async (req, res) => {
    try {
        const result = await partService.updatePart({
            id: req.body.id,
            code: req.body.Code || req.body.code,
            name: req.body.Name || req.body.name,
        });

        return res.status(200).json(
        success(result, "Part updated successfully")
        );
    } catch (err) {
        console.error("UPDATE PART ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error updating part")
        );
    }
};

export const togglePartStatus = async (req, res) => {
    try {
        const result = await partService.togglePartStatus({
            id: req.body.id,
        });
        
        return res.status(200).json(
        success(result, "Part status toggled successfully")
        );
    } catch (err) {
        console.error("TOGGLE PART STATUS ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error toggling part status")
        );
    }
};


export const assignPartsToModel = async (req, res) => {
    try {
        const result = await partService.assignsPartsToModel({
            modelId: req.body.modelId || req.body.ModelId,
            assignIds: req.body.assignIds || req.body.AssignIds || [],
            unassignIds: req.body.unassignIds || req.body.UnassignIds || [],
        });

        return res.status(200).json(
            success(result, "Part assignment updated successfully")
        );
    } catch (err) {
        console.error("ASSIGN PARTS ERROR:", err);

        return res.status(500).json(
            error(err.message || "Error assigning parts to model")
        );
    }
};