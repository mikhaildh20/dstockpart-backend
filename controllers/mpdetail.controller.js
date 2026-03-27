import * as mpdetailService from "../services/mpdetail.service.js";
import {success, error} from "../response/DtoResponse.js";

export const getMPDetails = async (req, res) => {
    try{
        const result = await mpdetailService.getMPDetails();
        res.json(success("MP Details retrieved successfully", result));
    } catch (err) {
        res.status(500).json(error("Error retrieving MP details"));
    }
}