import * as sectionService from "../services/section.service.js";
import {success, error} from "../response/DtoResponse.js";

export const getSections = async (req, res) => {
    try {
        const result = await sectionService.getSections({
            keyword: req.query.Search || req.query.keyword || "",
            status: req.query.Status || req.query.status || "",
            sort: req.query.Urut || req.query.sort || "sec_code ASC",
            page: Number(req.query.PageNumber || req.query.page || 1),
            limit: Number(req.query.PageSize || req.query.limit || 10),
        });
        
        return res.status(200).json(
        success(result, "Sections retrieved successfully")
        );
    } catch (err) {
        console.error("GET SECTIONS ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error retrieving sections")
        );
    }
};

export const createSection = async (req, res) => {
    try{
        const result = await sectionService.createSection({
            code: req.body.Code || req.body.code,
            name: req.body.Name || req.body.name,
        });
        
        return res.status(201).json(
        success(result, "Section created successfully")
        );
    } catch (err) {
        console.error("CREATE SECTION ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error creating section")
        );
    }
};

export const getSectionById = async (req, res) => {
    try {
        const result = await sectionService.getSectionById({
            id: req.params.id,
        });

        return res.status(200).json(
        success(result, "Section retrieved successfully")
        );
    } catch (err) {
        console.error("GET SECTION BY ID ERROR:", err);

        return res.status(500).json(
        error(err.message || "Error retrieving section")
        );
    }
};


export const updateSection = async (req, res) => {
    try {
        const result = await sectionService.updateSection({
            id: req.body.id,
            code: req.body.Code || req.body.code,
            name: req.body.Name || req.body.name,
        });

        return res.status(200).json(
        success(result, "Section updated successfully")
        );
    } catch (err) {
        console.error("UPDATE SECTION ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error updating section")
        );
    }
};

export const toggleSectionStatus = async (req, res) => {
    try {
        const result = await sectionService.toggleSectionStatus({
            id: req.body.id,
        });
        
        return res.status(200).json(
        success(result, "Section status toggled successfully")
        );
    } catch (err) {
        console.error("TOGGLE SECTION STATUS ERROR:", err);
        return res.status(500).json(
            error(err.message || "Error toggling section status")
        );
    }
};