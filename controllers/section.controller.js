import * as sectionService from "../services/section.service.js";
import {success, error} from "../response/DtoResponse.js";

export const getSections = async (req, res) => {
    try{
        const result = await sectionService.getSections();
        res.json(success("Sections retrieved successfully", result));
    } catch (err) {
        res.status(500).json(error("Error retrieving sections"));
    }
}