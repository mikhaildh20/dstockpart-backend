import * as modelService from "../services/model.service.js";
import {success, error} from "../response/DtoResponse.js";

export const getModels = async (req, res) => {
    try {
        const result = await modelService.getModels({
        keyword: req.query.Search || req.query.keyword || "",
        status: req.query.Status || req.query.status || "",
        sort: req.query.Urut || req.query.sort || "mdl_code ASC",
        page: Number(req.query.PageNumber || req.query.page || 1),
        limit: Number(req.query.PageSize || req.query.limit || 10),
        });

        return res.status(200).json(
        success(result, "Models retrieved successfully")
        );
    } catch (err) {
        console.error("GET MODELS ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error retrieving models")
        );
    }
};

export const createModel = async (req, res) => {
    try{
        const result = await modelService.createModel({
            code: req.body.Code || req.body.code,
        });

        return res.status(201).json(
        success(result, "Model created successfully")
        );
    }catch(err){
        console.error("CREATE MODEL ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error creating model")
        );
    }
};

export const getModelById = async (req, res) => {
    try {
        const result = await modelService.getModelById({
            id: req.params.id,
        });

        return res.status(200).json(
        success(result, "Model retrieved successfully")
        );
    } catch (err) {
        console.error("GET MODEL BY ID ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error retrieving model")
        );
    }
};

export const updateModel = async (req, res) => {
    try{
        const result = await modelService.updateModel({
            id: req.body.id,
            code: req.body.Code || req.body.code,
        });
        
        return res.status(200).json(
            success(result, "Model updated successfully")
        );
    }catch(err){
        console.error("UPDATE MODEL ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error updating model")
        );
    }
};


export const toggleModelStatus = async (req, res) => {
    try {
        const result = await modelService.toggleModelStatus({
            id: req.body.id,
        });

        return res.status(200).json(
        success(result, "Model status updated successfully")
        );
    } catch (err) {
        console.error("TOGGLE MODEL STATUS ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error toggling model status")
        );
    }
};
