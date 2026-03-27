import * as lineService from "../services/line.service.js";
import {success, error} from "../response/DtoResponse.js";

export const getLines = async (req, res) => {
    try{
        const result = await lineService.getLines();
        res.json(success(result, "Lines retrieved successfully"));
    } catch (err) {
        res.status(500).json(error("Error retrieving lines"));
    }
}