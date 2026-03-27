import * as modelService from "../services/model.service.js";
import {success, error} from "../response/DtoResponse.js";

export const getModels = async (req, res) => {
    try{
        const result = await modelService.getModels();
        res.json(success(result, "Models retrieved successfully"));
    } catch (err) {
        res.status(500).json(error("Error retrieving models"));
    }
}