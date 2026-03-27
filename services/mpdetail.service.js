import * as mpdetailRepository from "../repositories/mpdetail.repository.js";

export const getMPDetails = async () => {
    const result = await mpdetailRepository.getMPDetails();
    return result;
}