import * as lineService from "../services/line.service.js";
import { success, error } from "../response/DtoResponse.js";

export const getLines = async (req, res) => {
    try {
        const result = await lineService.getLines({
        keyword: req.query.Search || req.query.keyword || "",
        status: req.query.Status || req.query.status || "",
        sort: req.query.Urut || req.query.sort || "lne_code ASC",
        page: Number(req.query.PageNumber || req.query.page || 1),
        limit: Number(req.query.PageSize || req.query.limit || 10),
        });

        return res.status(200).json(
        success(result, "Lines retrieved successfully")
        );
    } catch (err) {
        console.error("GET LINES ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error retrieving lines")
        );
    }
};

export const createLine = async (req, res) => {
    try{
        const result = await lineService.createLine({
            code: req.body.Code || req.body.code,
        });

        return res.status(201).json(
        success(result, "Line created successfully")
        );
    }catch(err){
        console.error("CREATE LINE ERROR:", err);
        
        return res.status(500).json(
        error(err.message || "Error creating line")
        );
    }
}

export const getLineById = async (req, res) => {
    try {
        const result = await lineService.getLineById({
            id: req.params.id,
        });

        return res.status(200).json(
        success(result, "Line retrieved successfully")
        );
    } catch (err) {
        console.error("GET LINE BY ID ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error retrieving line")
        );
    }
};

export const updateLine = async (req, res) => {
    try {
        const result = await lineService.updateLine({
            id: req.body.id,
            code: req.body.Code || req.body.code,
        });

        return res.status(200).json(
        success(result, "Line updated successfully")
        );
    } catch (err) {
        console.error("UPDATE LINE ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error updating line")
        );
    }
};

export const toggleLineStatus = async (req, res) => {
    try {
        const result = await lineService.toggleLineStatus({
            id: req.body.id,
        });

        return res.status(200).json(
        success(result, "Line status updated successfully")
        );
    } catch (err) {
        console.error("TOGGLE LINE STATUS ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error updating line status")
        );
    }
};