import * as modelRepository from "../repositories/model.repository.js";

export const getModels = async () => {
    const result = await modelRepository.getModels();
    return result;
}