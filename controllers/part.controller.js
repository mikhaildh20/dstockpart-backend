import * as partService from "../services/part.service.js";
import {success, error} from "../response/DtoResponse.js";

export const getParts = async (req, res) => {
    try{
        const result = await partService.getParts();
        res.json(success("Parts retrieved successfully", result));
    } catch (err) {
        res.status(500).json(error("Error retrieving parts"));
    }
}